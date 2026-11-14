#!/usr/bin/env python3
"""Native frontend-only Git release with candidate checks and reversible artifact activation.

Fetch the pushed commit and create an exact, detached worktree first. Retains
current service configuration, private env, sitemap data, runtime wrapper and API.
The staged build uses the same dist basename as that service. Only the compiled
build link is activated; no production source file is edited. Previous build is
retained, and a failed activation restores it before restarting the web service.
"""
import argparse, fcntl, hashlib, json, os, re, shlex, signal, subprocess, time
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError

ROOT=Path(__file__).resolve().parents[1]
def output(args,cwd=ROOT):
    return subprocess.check_output(args,cwd=cwd,text=True).strip()
def request(base,path):
    try:r=urlopen(base+path,timeout=30)
    except HTTPError as e:r=e
    with r:return r.status,dict(r.headers),r.read()
def ready(base,child=None):
    for _ in range(60):
        if child and child.poll() is not None:raise RuntimeError('Candidate exited')
        try:
            if request(base,'/')[0]==200:return
        except (OSError,TimeoutError):pass
        time.sleep(1)
    raise RuntimeError('Readiness deadline exceeded')
def fingerprint(base):
    result={}
    for path in ['/robots.txt','/sitemap.xml','/login']:
        status,headers,body=request(base,path)
        result[path]={'status':status,'robots':headers.get('X-Robots-Tag',headers.get('x-robots-tag'))}
        if path!='/login':result[path]['sha256']=hashlib.sha256(body).hexdigest()
    status,headers,body=request(base,'/')
    assert status==200
    result['canonical']=re.findall(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)',body.decode())
    result['security']={k.lower():v for k,v in headers.items() if k.lower() in ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy']}
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--unit',required=True); p.add_argument('--runtime',type=Path,required=True)
    p.add_argument('--port',type=int,required=True); p.add_argument('--dist',required=True)
    p.add_argument('--scope',choices=['user','system','texas'],default='user')
    p.add_argument('--env-source',type=Path); p.add_argument('--prepare-only',action='store_true')
    a=p.parse_args(); runtime=a.runtime.resolve(); assert runtime!=ROOT
    assert a.dist.startswith('.next') and '/' not in a.dist
    ctl=['systemctl']+(['--user'] if a.scope=='user' else [])
    show=lambda name:output(ctl+['show',a.unit,'-p',name,'--value'])
    assert show('ActiveState')=='active'
    sha=output(['git','rev-parse','HEAD']); assert not output(['git','diff','HEAD','--name-only'])
    # The exact deployment commit must be present on the configured remote.
    assert output(['git','branch','-r','--contains',sha])
    state=Path.home()/'.local/state/future-wells/header-releases'/a.unit/sha
    state.mkdir(parents=True,exist_ok=True)
    lock=open(Path.home()/'.local/state/future-wells/header-build.lock','w')
    fcntl.flock(lock,fcntl.LOCK_EX)
    pid=int(show('MainPID'))
    env=dict(os.environ)
    if a.scope!='texas':
        assert Path(f'/proc/{pid}').stat().st_uid==os.getuid()
        env.update(dict(x.split('=',1) for x in Path(f'/proc/{pid}/environ').read_text().split('\0') if '=' in x))
    else:
        assert show('User')=='texas-web'
        env.update(dict(x.split('=',1) for x in shlex.split(show('Environment')) if '=' in x))
    env.update(NODE_ENV='production',NEXT_BUILD_DIR=a.dist,NEXT_DIST_DIR=a.dist,NODE_OPTIONS='--max-old-space-size=1024',NEXT_TELEMETRY_DISABLED='1',PORT=str(a.port),HOST='127.0.0.1')
    links=[]
    for path in (a.env_source or runtime).glob('.env*'):
        if path.name=='.env.example' or not path.is_file():continue
        dst=ROOT/path.name
        if not dst.exists():dst.symlink_to(path);links.append(dst)
    assert (ROOT/'package-lock.json').read_bytes()==(runtime/'package-lock.json').read_bytes(),'Runtime dependency lock changed; requires separate dependency install/review'
    if not (ROOT/'node_modules').exists():(ROOT/'node_modules').symlink_to(runtime/'node_modules')
    base=f'http://127.0.0.1:{a.port}'
    baseline=fingerprint(base)
    (state/'before.json').write_text(json.dumps(baseline,indent=2)+'\n')
    built=ROOT/a.dist
    if not (built/'BUILD_ID').is_file():
        print(json.dumps({'phase':'building','unit':a.unit,'commit':sha}),flush=True)
        with (state/'build.log').open('w') as log:
            subprocess.run(['nice','-n','10','node','node_modules/next/dist/bin/next','build'],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
        with (state/'typecheck.log').open('w') as log:
            subprocess.run(['node','node_modules/typescript/bin/tsc','--noEmit'],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
    # Static sitemap publications are runtime data, kept in their current location.
    for name in ['sitemap.xml','sitemaps']:
        src=runtime/'public'/name; dst=ROOT/'public'/name
        if src.exists() and not dst.exists():dst.symlink_to(src)
    preview=a.port+10000
    penv={**env,'PORT':str(preview)}
    with (state/'candidate.log').open('w') as log:
        child=subprocess.Popen(['node','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',str(preview)],cwd=ROOT,env=penv,stdout=log,stderr=subprocess.STDOUT)
        try:
            pb=f'http://127.0.0.1:{preview}';ready(pb,child)
            status,_,html=request(pb,'/');html=html.decode()
            assert 'aria-controls="fwt-mobile-nav-menu"' in html and 'https://futurewells.co/api-platform' in html,'Header not present'
            for css in set(re.findall(r'href="([^\"]+\.css[^\"]*)"',html)):
                assert request(pb,css.replace('&amp;','&'))[0]==200,'Missing compiled CSS'
            candidate=fingerprint(pb)
            # Wrapper-handled sitemaps can differ in staging; production parity is mandatory below.
            for key in ['canonical','security','/robots.txt','/login']:
                assert candidate[key]==baseline[key],f'Candidate parity mismatch: {key}'
        finally:
            child.terminate()
            try:child.wait(timeout=15)
            except subprocess.TimeoutExpired:child.kill();child.wait()
    if a.scope=='texas':
        for link in links:link.unlink()
    record={'commit':sha,'release':str(ROOT),'runtime':str(runtime),'unit':a.unit,'dist':a.dist,'build_id':(built/'BUILD_ID').read_text().strip(),'candidate_verified':True}
    (state/'release.json').write_text(json.dumps(record,indent=2)+'\n')
    if a.prepare_only:
        print(json.dumps(record),flush=True);return
    current=runtime/a.dist
    assert current.exists() and (current/'BUILD_ID').is_file()
    backup=current.with_name(current.name+'.before-header-'+time.strftime('%Y%m%dT%H%M%S'))
    assert not backup.exists()
    def restart():
        if a.scope=='user':subprocess.run(ctl+['restart',a.unit],check=True)
        elif a.scope=='texas':subprocess.run(['sudo','-n','/usr/bin/systemctl','restart',a.unit],check=True)
        else:
            assert show('Restart') in ['always','on-failure']
            assert Path(f'/proc/{int(show("MainPID"))}').stat().st_uid==os.getuid()
            os.kill(int(show('MainPID')),signal.SIGUSR2)
        for _ in range(45):
            if show('ActiveState')=='active' and int(show('MainPID') or '0') not in [0,pid]:break
            time.sleep(1)
        ready(base)
        assert show('ActiveState')=='active'
    temp=current.with_name(current.name+'.header-next')
    assert not temp.exists() and not temp.is_symlink()
    temp.symlink_to(built)
    current.rename(backup)
    os.replace(temp,current)
    try:
        restart()
        status,_,body=request(base,'/')
        assert status==200 and b'https://futurewells.co/api-platform' in body
        assert fingerprint(base)==baseline,'Production SEO/security parity mismatch'
        record.update(deployed=True,previous_build=str(backup),main_pid=int(show('MainPID')),verified_at=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        (state/'release.json').write_text(json.dumps(record,indent=2)+'\n')
        print(json.dumps(record),flush=True)
    except BaseException:
        current.unlink();backup.rename(current);restart()
        print(json.dumps({'rolled_back':True,'unit':a.unit}),flush=True)
        raise
if __name__=='__main__':main()
