// HTTP frame of the Kansas admin sign-in: the real route handlers called with NextRequest
// objects (no server), a temporary credentials file and state file, and a stubbed CAPTCHA
// provider. Uses the real clock, so authenticator steps are never reused here.
import test, {after, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes, scryptSync} from 'node:crypto';
import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as OTPAuth from 'otpauth';

// Resolve the app's bundler-style imports for plain Node: "@/…" and extensionless TypeScript.
const root = new URL('../', import.meta.url);
registerHooks({resolve(specifier, context, next) {
  if (specifier === 'next/server') return next('next/server.js', context);
  if (context.parentURL?.includes('/node_modules/')) return next(specifier, context);
  const target = specifier.startsWith('@/') ? new URL(specifier.slice(2), root) : specifier.startsWith('.') && context.parentURL?.startsWith('file:') ? new URL(specifier, context.parentURL) : null;
  if (!target) return next(specifier, context);
  return next(!/\.[a-z]+$/.test(target.pathname) && existsSync(fileURLToPath(target.href + '.ts')) ? target.href + '.ts' : target.href, context);
}});


const directory = mkdtempSync(join(tmpdir(), 'ks-admin-http-'));
after(() => rmSync(directory, {recursive: true, force: true}));
const PASSWORD = 'test-only-shared-password';
const ORIGIN = 'https://futurewellskansas.com';
const credentialsFile = join(directory, 'credentials.json');
const ownerSeed = '3132333435363738393031323334353637383930';
const vinniSeed = '91'.repeat(20);
let fixture;
let sequence = 0;
let address = 0;
Object.assign(process.env, {NODE_ENV: 'production', KANSAS_ADMIN_CREDENTIALS_FILE: credentialsFile,
  TURNSTILE_SITE_KEY: 'test-site-key', TURNSTILE_SECRET_KEY: 'test-secret', KANSAS_ADMIN_TOTP_KEY: '0f'.repeat(32)});
const realFetch = globalThis.fetch;
globalThis.fetch = async url => {
  assert.equal(String(url), 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  return Response.json({success: true, action: 'admin_login', hostname: 'futurewellskansas.com'});
};
after(() => { globalThis.fetch = realFetch; });
const {NextRequest} = await import('next/server.js');
const {twoFactorContext} = await import('../lib/admin-auth.ts');
const {importSharedAuthenticator} = await import('../lib/admin-totp.mjs');
const {credentialAccounts} = await import('../lib/admin-credentials.mjs');
const route = path => import(pathToFileURL(fileURLToPath(new URL('app/api/admin/' + path + '/route.ts', root))).href);
const [login, logout, me, exportsRoute, statusRoute, enrollStart, verify, replaceStart] = await Promise.all(
  ['auth/login', 'auth/logout', 'auth/me', 'exports', 'auth/2fa/status', 'auth/2fa/enroll/start', 'auth/2fa/verify', 'auth/2fa/replace/start'].map(route));
const salt = randomBytes(32).toString('hex');
const passwordHash = scryptSync(PASSWORD, salt, 64).toString('hex');
beforeEach(async () => {
  process.env.KANSAS_ADMIN_TOTP_STATE_FILE = join(directory, 'state-' + (++sequence) + '.json');
  fixture = {username: 'yaro', role: 'superadmin', salt, password_hash: passwordHash, session_key: randomBytes(48).toString('hex'),
    additional_accounts: [{username: 'vinni', role: 'superadmin', salt, password_hash: passwordHash, session_key: randomBytes(48).toString('hex')}]};
  writeFileSync(credentialsFile, JSON.stringify(fixture), {mode: 0o600});
  await provision('yaro', ownerSeed);
});
async function provision(username, seed) {
  return importSharedAuthenticator(twoFactorContext(username), username,
    {schema: 'future-wells-seo-shared-totp/1', credential_id: (username === 'yaro' ? 'ab' : 'cd').repeat(32), secret_hex: seed});
}
function code(seed) { return new OTPAuth.TOTP({secret: OTPAuth.Secret.fromHex(seed)}).generate(); }
async function call(handler, path, {method='POST', origin=ORIGIN, body, cookies={}, headers={}, length}={}) {
  const text = body === undefined ? undefined : JSON.stringify(body);
  const all = {'x-real-ip': '198.51.100.' + (++address % 250), ...headers};
  if (origin) all.origin = origin;
  if (text !== undefined) { all['content-type']='application/json'; all['content-length']=String(length ?? Buffer.byteLength(text)); }
  const cookie = Object.entries(cookies).map(([name,value]) => name+'='+value).join('; ');
  if (cookie) all.cookie = cookie;
  const response = await handler[method](new NextRequest(ORIGIN+'/api/admin/'+path, {method,headers:all,body:text}));
  const set = Object.fromEntries(response.headers.getSetCookie().map(line => {const pair=line.split(';')[0]; return [pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1)];}));
  return {status:response.status,json:await response.json().catch(()=>null),set,headers:response.headers};
}
async function passwordStep(username) {
  return call(login,'auth/login',{body:{username,password:PASSWORD,turnstile_token:'fixture-token'}});
}
async function session(username, seed) {
  const first=await passwordStep(username);
  assert.equal(first.status,200);
  assert.deepEqual(first.json,{two_factor:{required:true,state:'verify'}});
  assert.deepEqual(Object.keys(first.set),['fw_ks_admin_2fa']);
  const verified=await call(verify,'auth/2fa/verify',{cookies:first.set,body:{code:code(seed)}});
  assert.equal(verified.status,200);
  return verified.set.fw_ks_admin;
}

test('legacy owner remains valid; missing shared provisioning never becomes password-only access',async()=>{
  assert.equal((await passwordStep('yaro')).status,200);
  const unready=await passwordStep('vinni');
  assert.equal(unready.status,503);
  assert.deepEqual(unready.set,{});
  assert.equal((await passwordStep('unknown')).status,401);
  assert.equal((await call(me,'auth/me',{method:'GET'})).status,401);
  assert.equal((await call(exportsRoute,'exports',{method:'GET'})).status,401);
});

test('both logins use the copied password and independently provisioned authenticators',async()=>{
  await provision('vinni',vinniSeed);
  for (const [username,seed] of [['yaro',ownerSeed],['vinni',vinniSeed]]) {
    const token=await session(username,seed);
    const current=await call(me,'auth/me',{method:'GET',cookies:{fw_ks_admin:token}});
    assert.equal(current.status,200);
    assert.equal(current.json.admin.username,username);
    assert.equal(current.headers.get('cache-control'),'private, no-store');
  }
});

test('changing a signed token account or substituting a challenge never authorizes another account',async()=>{
  await provision('vinni',vinniSeed);
  const ownerSession=await session('yaro',ownerSeed);
  const [payload,signature]=ownerSession.split('.');
  const claims=JSON.parse(Buffer.from(payload,'base64url'));
  claims.username='vinni';
  const forged=Buffer.from(JSON.stringify(claims)).toString('base64url')+'.'+signature;
  assert.equal((await call(me,'auth/me',{method:'GET',cookies:{fw_ks_admin:forged}})).status,401);
  const challenge=await passwordStep('vinni');
  assert.equal((await call(me,'auth/me',{method:'GET',cookies:{fw_ks_admin:challenge.set.fw_ks_admin_2fa}})).status,401);
  const bad=await call(verify,'auth/2fa/verify',{cookies:challenge.set,body:{code:code(vinniSeed)==='000000'?'111111':'000000'}});
  assert.equal(bad.status,401);
});

test('a pending login for vinni is resolved from its own challenge even with an owner session cookie',async()=>{
  await provision('vinni',vinniSeed);
  const ownerSession=await session('yaro',ownerSeed);
  const first=await passwordStep('vinni');
  const result=await call(verify,'auth/2fa/verify',{cookies:{...first.set,fw_ks_admin:ownerSession},body:{code:code(vinniSeed)}});
  assert.equal(result.status,200);
  assert.equal(result.json.user.username,'vinni');
});

test('signing out vinni preserves the owner session',async()=>{
  await provision('vinni',vinniSeed);
  const ownerSession=await session('yaro',ownerSeed);
  const targetSession=await session('vinni',vinniSeed);
  assert.equal((await call(logout,'auth/logout',{cookies:{fw_ks_admin:targetSession}})).status,200);
  assert.equal((await call(me,'auth/me',{method:'GET',cookies:{fw_ks_admin:targetSession}})).status,401);
  assert.equal((await call(me,'auth/me',{method:'GET',cookies:{fw_ks_admin:ownerSession}})).status,200);
});

test('cross-origin login, challenge-as-management and oversized requests remain refused',async()=>{
  assert.equal((await call(login,'auth/login',{origin:'https://evil.invalid',body:{username:'yaro',password:PASSWORD}})).status,403);
  const first=await passwordStep('yaro');
  assert.equal((await call(verify,'auth/2fa/verify',{origin:'https://evil.invalid',cookies:first.set,body:{code:code(ownerSeed)}})).status,403);
  assert.equal((await call(replaceStart,'auth/2fa/replace/start',{cookies:first.set,body:{password:PASSWORD,code:code(ownerSeed)}})).status,401);
  assert.equal((await call(verify,'auth/2fa/verify',{cookies:first.set,body:{code:'x'},length:5000})).status,413);
  assert.equal((await call(enrollStart,'auth/2fa/enroll/start',{cookies:first.set,body:{}})).status,503);
});

test('duplicate names and reused signing keys fail closed; single legacy credentials remain supported',()=>{
  assert.equal(credentialAccounts({...fixture,additional_accounts:undefined}).length,1);
  assert.throws(()=>credentialAccounts({...fixture,additional_accounts:[{...fixture,additional_accounts:undefined}]}));
  assert.throws(()=>credentialAccounts({...fixture,additional_accounts:[{...fixture.additional_accounts[0],session_key:fixture.session_key}]}));
});
