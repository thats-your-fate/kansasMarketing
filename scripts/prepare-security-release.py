#!/usr/bin/env python3
"""Build and preview an exact Git security release; optionally activate a user unit."""
import argparse,fcntl,hashlib,json,os,re,shlex,shutil,stat,subprocess,time
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[1]
def run(args,**kw):return subprocess.run(args,check=True,**kw)
def out(args):return subprocess.check_output(args,text=True).strip()
def request(base,path):
 try:r=urlopen(base+path,timeout=35)
 except HTTPError as e:r=e
 with r:return r.status,dict((k.lower(),v) for k,v in r.headers.items()),r.read()
def fingerprint(base):
 d={}
 for route in ['/robots.txt','/sitemap.xml','/login']:
  status,headers,body=request(base,route)
  d[route]={'status':status,'robots':headers.get('x-robots-tag')}
  if route!='/login':d[route]['sha256']=hashlib.sha256(body).hexdigest()
 status,headers,body=request(base,'/')
 if status!=200:raise RuntimeError('Homepage baseline/candidate is not HTTP 200')
 s=body.decode(errors='replace')
 d['canonical']=re.findall(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)',s)
 d['home_robots']=headers.get('x-robots-tag')
 d['header_link']=b'https://futurewells.co/api-platform' in body
 d['css']=list(set(re.findall(r'href="([^\"]+\.css[^\"]*)"',s)))
 return d

ISOLATED_PUBLICATION=Path('/home/yaro/seo-ks-publication.json')

def isolated_ks_environment(args,show,state):
 """Build settings for a site already running under fw-ks-runtime.

Never read the isolated process environment. Public settings come from the
committed deploy/kansas-public.env; sitemap XML comes only from the fixed
root helper's validated --status snapshot, not the runtime tree.
"""
 assert args.state=='ks' and args.repo=='kansasMarketing' and args.scope=='system' and args.port==3009
 assert args.dist=='.next-workspace-preview-v1' and not args.activate_user and show('User')=='fw-ks-runtime'
 profile=json.loads(out(['node','-e',"const fs=require('node:fs'),{parseEnv}=require('node:util');process.stdout.write(JSON.stringify(parseEnv(fs.readFileSync(process.argv[1],'utf8'))))",str(ROOT/'deploy/kansas-public.env')]))
 assert profile.get('NEXT_PUBLIC_SITE_URL')=='https://futurewellskansas.com'
 env={k:v for k,v in os.environ.items() if k not in ('SSH_AUTH_SOCK','SSH_AGENT_PID','GPG_AGENT_INFO','DBUS_SESSION_BUS_ADDRESS')}
 env.update(profile)
 run(['sudo','-n','/usr/local/libexec/seo_ks_isolation.py','--status'],stdout=subprocess.DEVNULL)
 fd=os.open(ISOLATED_PUBLICATION,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  info=os.fstat(fd);assert info.st_uid==os.getuid() and stat.S_ISREG(info.st_mode) and not info.st_mode&0o077 and info.st_size<100000000
  with os.fdopen(fd,'rb',closefd=False) as f:publication=json.loads(f.read(100000000))
 finally:os.close(fd)
 directory=state/'publication-preview'
 if directory.exists():shutil.rmtree(directory)
 (directory/'sitemaps').mkdir(parents=True,mode=0o700)
 for name,body in publication['files'].items():
  assert re.fullmatch(r'[a-z0-9-]{1,80}\.xml',name)
  (directory/'sitemaps'/name).write_text(body)
 (directory/'sitemap.xml').write_text(publication['index'])
 env['_KS_BUILD_PUBLICATION']=str(directory)
 return env

def main():
 # Build records and logs are private to the deployment account; the root
 # isolation helper refuses group/other-writable records.
 os.umask(0o077)
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--repo',required=True);p.add_argument('--runtime',type=Path,required=True);p.add_argument('--state',required=True);p.add_argument('--port',type=int,required=True);p.add_argument('--dist',required=True);p.add_argument('--scope',choices=['user','system'],required=True);p.add_argument('--activate-user',action='store_true');p.add_argument('--isolated-ks',action='store_true');a=p.parse_args()
 assert re.fullmatch('[a-z]{2}',a.state) and re.fullmatch(r'\.next[\w.-]*',a.dist)
 runtime=a.runtime.resolve();sha=out(['git','-C',str(ROOT),'rev-parse','HEAD']);assert not out(['git','-C',str(ROOT),'diff','HEAD','--name-only'])
 assert out(['git','-C',str(ROOT),'branch','-r','--contains',sha])
 unit=f'future-wells-{a.state}-web.service';ctl=['systemctl']+(['--user'] if a.scope=='user' else [])
 show=lambda key:out(ctl+['show',unit,'-p',key,'--value'])
 assert show('ActiveState')=='active';pid=int(show('MainPID'));assert a.isolated_ks or Path(f'/proc/{pid}').stat().st_uid==os.getuid()
 state=Path.home()/'.local/state/future-wells/security-releases'/a.state/sha;state.mkdir(parents=True,exist_ok=True);state.chmod(0o700)
 lock=state.parents[1]/'build.lock'
 with lock.open('w') as handle:
  fcntl.flock(handle,fcntl.LOCK_EX)
  if a.isolated_ks:env=isolated_ks_environment(a,show,state)
  else:env=dict(os.environ);env.update(dict(x.split('=',1) for x in Path(f'/proc/{pid}/environ').read_text().split('\0') if '=' in x))
  env.update(NODE_ENV='production',NEXT_BUILD_DIR=a.dist,NEXT_DIST_DIR=a.dist,NODE_OPTIONS='--max-old-space-size=1024',NEXT_TELEMETRY_DISABLED='1',PORT=str(a.port),HOST='127.0.0.1')
  for f in runtime.glob('.env*'):
   if f.is_file() and f.name!='.env.example' and not (ROOT/f.name).exists():(ROOT/f.name).symlink_to(f)
  baseline=fingerprint(f'http://127.0.0.1:{a.port}')
  (state/'before.json').write_text(json.dumps(baseline,indent=2)+'\n')
  publication=Path(env.pop('_KS_BUILD_PUBLICATION',str(runtime/'public')))
  if a.isolated_ks:env['KS_EXTERNAL_CACHE_DIR']=str(state/'preview-cache')
  for name in ['sitemap.xml','sitemaps']:
   src=publication/name;dst=ROOT/'public'/name
   if src.exists():
    if dst.exists() and not dst.is_symlink():
     if dst.is_dir():shutil.rmtree(dst)
     else:dst.unlink()
    if not dst.is_symlink():dst.symlink_to(src)
  # Preserve generated vendor assets, verification files and publications which
  # are external runtime data rather than tracked application source.
  for src in (runtime/'public').rglob('*'):
   rel=src.relative_to(runtime/'public');dst=ROOT/'public'/rel
   if str(rel)=='sitemap.xml' or rel.parts[0]=='sitemaps':continue
   if src.is_file() and not dst.exists() and not dst.is_symlink():
    dst.parent.mkdir(parents=True,exist_ok=True);dst.symlink_to(src)
  if not (ROOT/a.dist/'BUILD_ID').is_file():
   print(json.dumps({'phase':'install-and-build','site':a.state,'commit':sha}),flush=True)
   for label,args in [('install',['npm','ci','--include=dev','--ignore-scripts','--no-audit','--no-fund']),('security-tests',['node','--test','tests/security-hardening.test.mjs']),('build',['nice','-n','15','node','node_modules/next/dist/bin/next','build']),('typecheck',['node','node_modules/typescript/bin/tsc','--noEmit'])]:
    with (state/(label+'.log')).open('w') as log:run(args,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
  versions=json.loads(out(['node','-e',"console.log(JSON.stringify({next:require("+json.dumps(str(ROOT/'node_modules/next/package.json'))+").version,sharp:require("+json.dumps(str(ROOT/'node_modules/sharp/package.json'))+").version}))"]))
  assert versions=={'next':'15.5.28','sharp':'0.35.5'}
  # Keep hashed static assets used by browsers with pages from the last build.
  old=runtime/a.dist/'static';new=ROOT/a.dist/'static'
  if old.exists():
   for src in old.rglob('*'):
    if src.is_file():
     dst=new/src.relative_to(old)
     if not dst.exists():dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
  preview=a.port+10000;penv={**env,'PORT':str(preview)}
  with (state/'preview.log').open('w') as log:
   child=subprocess.Popen(['/bin/bash',str(ROOT/'scripts/start-security-web.sh')],cwd=ROOT,env=penv,stdout=log,stderr=subprocess.STDOUT)
   try:
    for _ in range(45):
     if child.poll() is not None:raise RuntimeError('Preview exited; inspect private preview.log')
     try:
      if request(f'http://127.0.0.1:{preview}','/robots.txt')[0]==200:break
     except (OSError,TimeoutError):pass
     time.sleep(1)
    else:raise RuntimeError('Preview deadline')
    candidate=fingerprint(f'http://127.0.0.1:{preview}')
    for k in ['canonical','home_robots','header_link','/robots.txt','/sitemap.xml','/login']:assert baseline[k]==candidate[k],f'Public parity failure {k}'
    for css in candidate['css']:assert request(f'http://127.0.0.1:{preview}',css.replace('&amp;','&'))[0]==200
    headers=request(f'http://127.0.0.1:{preview}','/login')[1];assert headers.get('x-content-type-options')=='nosniff';assert 'frame-ancestors' in headers.get('content-security-policy','')
   finally:
    child.terminate()
    try:child.wait(timeout=15)
    except subprocess.TimeoutExpired:child.kill();child.wait()
  # Next may update these generated TypeScript declarations while building.
  run(['git','-C',str(ROOT),'restore','--','next-env.d.ts','tsconfig.json'])
  changed=out(['git','-C',str(ROOT),'diff','HEAD','--name-only']).splitlines()
  assert all(s.startswith('public/') and (s.endswith('.xml') or s.startswith('public/sitemaps/')) for s in changed),changed
  record={'state':a.state,'commit':sha,'release':str(ROOT),'runtime':str(runtime),'unit':unit,'scope':a.scope,'port':a.port,'dist':a.dist,'build_id':(ROOT/a.dist/'BUILD_ID').read_text().strip(),'versions':versions,'candidate_verified':True,'baseline':baseline}
  (state/'release.json').write_text(json.dumps(record,indent=2)+'\n')
  if a.activate_user:
   assert a.scope=='user'
   assert re.fullmatch('[A-Za-z]+Marketing',a.repo)
   current=Path.home()/'releases/security-web'/a.repo/'current';current.parent.mkdir(parents=True,exist_ok=True)
   previous=str(current.resolve()) if current.is_symlink() else None
   drop=Path.home()/'.config/systemd/user'/f'{unit}.d/zz-security-release.conf';drop.parent.mkdir(parents=True,exist_ok=True)
   assert not drop.exists() and not drop.is_symlink(),'Security override already exists; use reviewed update/rollback workflow'
   temp=current.with_name('candidate');assert not temp.exists();temp.symlink_to(ROOT);os.replace(temp,current)
   drop.symlink_to(ROOT/'deploy/security-release.conf')
   try:
    run(['systemctl','--user','daemon-reload']);run(['systemctl','--user','restart',unit]);time.sleep(2)
    deployed=fingerprint(f'http://127.0.0.1:{a.port}')
    for k in ['canonical','home_robots','header_link','/robots.txt','/sitemap.xml','/login']:assert baseline[k]==deployed[k],f'Live parity failure {k}'
    assert show('ActiveState')=='active'
    record.update(deployed=True,previous_release=previous,main_pid=int(show('MainPID')))
   except BaseException:
    drop.unlink()
    if current.is_symlink():current.unlink()
    if previous:current.symlink_to(previous)
    run(['systemctl','--user','daemon-reload']);run(['systemctl','--user','restart',unit]);raise
   (state/'release.json').write_text(json.dumps(record,indent=2)+'\n')
  print(json.dumps({k:v for k,v in record.items() if k!='baseline'}),flush=True)
if __name__=='__main__':main()
