import fs from 'node:fs'
import cp from 'node:child_process'
import crypto from 'node:crypto'
import path from 'node:path'
const config=JSON.parse(fs.readFileSync(new URL('./workspace-preview-deployment.json',import.meta.url)))
const root=fs.realpathSync(new URL('..',import.meta.url))
process.chdir(root)
const run=(cmd,args,options={})=>cp.execFileSync(cmd,args,{encoding:'utf8',...options})
const git=(...args)=>run('git',args).trim()
if(git('branch','--show-current')!=='main'||git('rev-parse','HEAD')!==git('rev-parse','origin/main'))throw Error('Pull committed main before deployment')
run('git',['diff','--quiet','--','components/future/HeroMapPreview.tsx','components/future/WorkspaceMapPreview.tsx','components/future/WorkspaceMapPreview.module.css','next.config.mjs'])
const manager=config.scope==='user'?['--user']:[]
const systemctl=(...args)=>run('systemctl',[...manager,...args]).trim()
if(systemctl('show',config.unit,'-p','WorkingDirectory','--value')!==root)throw Error('Unexpected native service directory')
const currentPid=()=>Number(systemctl('show',config.unit,'-p','MainPID','--value'))
const initialPid=currentPid()
if(!initialPid||fs.statSync('/proc/'+initialPid).uid!==process.getuid())throw Error('Native web process is not owned by this deployment user')
const inherited=Object.fromEntries(fs.readFileSync('/proc/'+initialPid+'/environ','utf8').split('\0').filter(Boolean).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)]}))
const buildDir='.next-workspace-preview-v1'
const buildEnv={...process.env,...inherited,NODE_ENV:'production',NODE_OPTIONS:'--max-old-space-size=768',NEXT_TELEMETRY_DISABLED:'1',NEXT_DIST_DIR:buildDir,NEXT_BUILD_DIR:buildDir}
const commit=git('rev-parse','HEAD')
const marker=path.join(buildDir,'.workspace-commit')
if(!fs.existsSync(marker)||fs.readFileSync(marker,'utf8').trim()!==commit){
 if(fs.existsSync(path.join(buildDir,'BUILD_ID')))throw Error('Use a new unused build directory for a different revision')
 run('/usr/bin/node',['node_modules/next/dist/bin/next','build'],{env:buildEnv,stdio:'inherit'})
 run('/usr/bin/node',['node_modules/typescript/bin/tsc','--noEmit'],{env:buildEnv,stdio:'inherit'})
 if(fs.existsSync('scripts/assert-build-routes.mjs'))run('/usr/bin/node',['scripts/assert-build-routes.mjs',buildDir],{env:buildEnv,stdio:'inherit'})
 fs.writeFileSync(marker,commit+'\n')
}
const expected='/assets/workspace/'+config.slug+'-production-map.jpg'
const verify=async(base)=>{
 const response=await fetch(base+'/',{signal:AbortSignal.timeout(45000)})
 const html=await response.text()
 if(!response.ok||!html.includes(expected)||!html.includes('Workspace screenshots captured November 8, 2026.'))throw Error('Homepage preview failed HTTP verification')
 for(const view of ['production','documents']){
  const asset='/assets/workspace/'+config.slug+'-'+view+'-map.jpg'
  const r=await fetch(base+asset,{signal:AbortSignal.timeout(15000)})
  const bytes=Buffer.from(await r.arrayBuffer())
  const sum=b=>crypto.createHash('sha256').update(b).digest('hex')
  if(!r.ok||!r.headers.get('content-type')?.startsWith('image/jpeg')||sum(bytes)!==sum(fs.readFileSync('public'+asset)))throw Error('Screenshot asset verification failed')
 }
}
const previewPort=config.port+10000
const preview=cp.spawn('/usr/bin/node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','-p',String(previewPort)],{env:buildEnv,stdio:'ignore'})
try{
 let passed=false
 for(let attempt=0;attempt<12;attempt++){
  try{await verify('http://127.0.0.1:'+previewPort);passed=true;break}catch(error){if(preview.exitCode!==null)throw Error('Preview process exited');if(attempt===11)throw error;await new Promise(r=>setTimeout(r,1500))}
 }
 if(!passed)throw Error('Preview verification deadline exceeded')
}finally{preview.kill('SIGTERM')}
const envPath=path.join(root,'.env.production.local')
const priorEnv=fs.existsSync(envPath)?fs.readFileSync(envPath):null
const unitPath=config.scope==='user'&&config.trackedUnit?path.join(process.env.HOME,'.config/systemd/user',config.unit):null
const priorUnit=unitPath&&fs.existsSync(unitPath)?fs.readFileSync(unitPath):null
const restart=async()=>{
 if(config.scope==='user'){systemctl('daemon-reload');systemctl('restart',config.unit)}
 else{
  const pid=currentPid()
  if(!pid||fs.statSync('/proc/'+pid).uid!==process.getuid())throw Error('Service ownership changed')
  // Existing root-managed units run as this user. Their configured restart policy
  // restarts the owning process after SIGUSR2, without changing root service files.
  const policy=systemctl('show',config.unit,'-p','Restart','--value')
  if(!['always','on-failure'].includes(policy))throw Error('Service needs an administrator restart')
  process.kill(pid,'SIGUSR2')
 }
 for(let attempt=0;attempt<20;attempt++){
  try{if(currentPid()!==initialPid&&systemctl('is-active',config.unit)==='active')return}catch{}
  await new Promise(r=>setTimeout(r,1000))
 }
 throw Error('Native service restart deadline exceeded')
}
try{
 if(unitPath){fs.copyFileSync(path.join(root,config.trackedUnit),unitPath)}
 else{
  let body=priorEnv?.toString()||''
  const line='NEXT_DIST_DIR='+buildDir
  body=/^NEXT_DIST_DIR=.*$/m.test(body)?body.replace(/^NEXT_DIST_DIR=.*$/m,line):body.trimEnd()+'\n'+line+'\n'
  fs.writeFileSync(envPath+'.workspace-next',body,{mode:0o600})
  fs.renameSync(envPath+'.workspace-next',envPath)
  fs.chmodSync(envPath,0o600)
 }
 await restart()
 for(let attempt=0;attempt<15;attempt++){
  try{await verify('http://127.0.0.1:'+config.port);break}catch(error){if(attempt===14)throw error;await new Promise(r=>setTimeout(r,1000))}
 }
 console.log(JSON.stringify({deployed:true,state:config.state,commit,unit:config.unit,build:buildDir,homepage:200,assets:'checksums_match'}))
}catch(error){
 if(unitPath&&priorUnit)fs.writeFileSync(unitPath,priorUnit)
 if(!unitPath){if(priorEnv)fs.writeFileSync(envPath,priorEnv,{mode:0o600});else if(fs.existsSync(envPath))fs.unlinkSync(envPath)}
 await restart().catch(()=>{})
 throw error
}
