// HTTP frame of the Kansas admin sign-in: the real route handlers called with NextRequest
// objects (no server), a temporary credentials file and state file, and a stubbed CAPTCHA
// provider. Uses the real clock, so authenticator steps are never reused here.
import test, {after} from 'node:test';
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
const credentialsFile = join(directory, 'credentials.json');
const sessionKey = randomBytes(48).toString('hex');
function setPassword(password) {
  const salt = randomBytes(32).toString('hex');
  writeFileSync(credentialsFile, JSON.stringify({username: 'owner', role: 'superadmin', salt, password_hash: scryptSync(password, salt, 64, {N: 16384, r: 8, p: 1}).toString('hex'), session_key: sessionKey}), {mode: 0o600});
}
const PASSWORD = 'test-only-password';
const ENROLLMENT = 'test-only-enrollment-code';
setPassword(PASSWORD);
Object.assign(process.env, {
  NODE_ENV: 'production', KANSAS_ADMIN_CREDENTIALS_FILE: credentialsFile, TURNSTILE_SITE_KEY: 'test-site-key', TURNSTILE_SECRET_KEY: 'test-secret',
  KANSAS_ADMIN_TOTP_KEY: '0f'.repeat(32), KANSAS_ADMIN_TOTP_ENROLLMENT_CODE: ENROLLMENT, KANSAS_ADMIN_TOTP_STATE_FILE: join(directory, 'state', 'admin-totp.json'),
});
// The only outbound request the sign-in makes is the CAPTCHA check; nothing leaves the machine.
const realFetch = globalThis.fetch;
globalThis.fetch = async url => {
  assert.equal(String(url), 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  return Response.json({success: true, action: 'admin_login', hostname: 'futurewellskansas.com'});
};
after(() => { globalThis.fetch = realFetch; });

const {NextRequest} = await import('next/server.js');
const route = async path => import(pathToFileURL(fileURLToPath(new URL('app/api/admin/' + path + '/route.ts', root))).href);
const [login, logout, me, exportsRoute, statusRoute, enrollStart, enrollConfirm, verify, recoveryCodes, replaceStart, replaceConfirm, disable] = await Promise.all(
  ['auth/login', 'auth/logout', 'auth/me', 'exports', 'auth/2fa/status', 'auth/2fa/enroll/start', 'auth/2fa/enroll/confirm', 'auth/2fa/verify', 'auth/2fa/recovery-codes', 'auth/2fa/replace/start', 'auth/2fa/replace/confirm', 'auth/2fa/disable'].map(route));

const ORIGIN = 'https://futurewellskansas.com';
let address = 0;
/** Calls a handler; `origin: null` omits the header, `length` overrides the declared Content-Length. */
async function call(handler, path, {method = 'POST', origin = ORIGIN, body, cookies = {}, headers = {}, length} = {}) {
  const text = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  const all = {'x-real-ip': '198.51.100.' + (address = (address + 1) % 250), ...headers};
  if (origin) all.origin = origin;
  if (text !== undefined) all['content-type'] = 'application/json';
  if (length !== null && (length !== undefined || text !== undefined)) all['content-length'] = String(length ?? Buffer.byteLength(text));
  const cookie = Object.entries(cookies).filter(([, value]) => value).map(([name, value]) => name + '=' + value).join('; ');
  if (cookie) all.cookie = cookie;
  const response = await handler[method](new NextRequest(ORIGIN + '/api/admin/' + path, {method, headers: all, body: text}));
  const set = Object.fromEntries(response.headers.getSetCookie().map(line => {
    const [pair, ...attributes] = line.split('; ');
    return [pair.slice(0, pair.indexOf('=')), {value: pair.slice(pair.indexOf('=') + 1), attributes: attributes.map(item => item.toLowerCase()).filter(item => !item.startsWith('expires=')).sort()}];
  }));
  return {status: response.status, json: await response.json().catch(() => null), set, headers: response.headers};
}
const errorCode = result => result.json?.error?.code ?? result.json?.error;
const codeNow = secret => new OTPAuth.TOTP({secret: OTPAuth.Secret.fromBase32(secret)}).generate();
const SESSION_ATTRIBUTES = ['httponly', 'max-age=28800', 'path=/', 'samesite=strict', 'secure'];
const CHALLENGE_ATTRIBUTES = ['httponly', 'max-age=600', 'path=/api/admin/auth', 'samesite=strict', 'secure'];
const cleared = attributes => attributes.map(item => item.startsWith('max-age=') ? 'max-age=0' : item);

async function passwordStep(expected) {
  const result = await call(login, 'auth/login', {body: {username: 'owner', password: PASSWORD, turnstile_token: 'token'}});
  assert.equal(result.status, 200);
  assert.deepEqual(result.json, {two_factor: {required: true, state: expected}});
  return result;
}

let session;
let recovery;
let secret;

test('the password step answers with a challenge cookie only, and only to this site', async () => {
  for (const origin of [null, 'https://evil.invalid', 'http://futurewellskansas.com', 'https://futurewellskansas.com.evil.invalid', 'null']) {
    const refused = await call(login, 'auth/login', {origin, body: {username: 'owner', password: PASSWORD, turnstile_token: 'token'}});
    assert.equal(refused.status, 403, String(origin));
    assert.deepEqual(refused.set, {});
  }
  const wrong = await call(login, 'auth/login', {body: {username: 'owner', password: 'wrong-password', turnstile_token: 'token'}});
  assert.deepEqual([wrong.status, wrong.set], [401, {}]);

  const accepted = await passwordStep('enroll');
  assert.deepEqual(Object.keys(accepted.set), ['fw_ks_admin_2fa'], 'no session cookie after the password');
  assert.deepEqual(accepted.set.fw_ks_admin_2fa.attributes, CHALLENGE_ATTRIBUTES);
  assert.equal(accepted.headers.get('cache-control'), 'private, no-store');
  assert.equal(accepted.json.admin, undefined);
  // The challenge cookie is not a session anywhere.
  const challenge = accepted.set.fw_ks_admin_2fa.value;
  assert.equal((await call(me, 'auth/me', {method: 'GET', cookies: {fw_ks_admin: challenge}})).status, 401);
  assert.equal((await call(exportsRoute, 'exports', {method: 'GET', cookies: {fw_ks_admin: challenge}})).status, 401);
  assert.equal((await call(me, 'auth/me', {method: 'GET'})).status, 401);
  assert.deepEqual((await call(statusRoute, 'auth/2fa/status', {method: 'GET', cookies: {fw_ks_admin_2fa: challenge}})).json, {two_factor: {required: true, state: 'enroll'}});

  // Without the encryption key the correct password gets a 503 in the contract shape and no cookie.
  const key = process.env.KANSAS_ADMIN_TOTP_KEY;
  delete process.env.KANSAS_ADMIN_TOTP_KEY;
  try {
    const closed = await call(login, 'auth/login', {body: {username: 'owner', password: PASSWORD, turnstile_token: 'token'}});
    assert.deepEqual([closed.status, errorCode(closed), closed.set], [503, 'two_factor_unavailable', {}]);
  } finally {
    process.env.KANSAS_ADMIN_TOTP_KEY = key;
  }
});

test('second-factor requests must be same-origin, length-declared and small', async () => {
  const challenge = (await passwordStep('enroll')).set.fw_ks_admin_2fa.value;
  const cookies = {fw_ks_admin_2fa: challenge};
  const input = {enrollment_code: 'wrong-enrollment-code-value'};
  for (const [name, options] of Object.entries({
    'no Origin': {origin: null}, 'foreign Origin': {origin: 'https://evil.invalid'}, 'Origin null': {origin: 'null'},
    'cross-site fetch metadata': {headers: {'sec-fetch-site': 'cross-site'}}, 'cross-site, any case': {headers: {'sec-fetch-site': 'Cross-Site'}},
  })) {
    for (const [handler, path] of [[enrollStart, 'auth/2fa/enroll/start'], [enrollConfirm, 'auth/2fa/enroll/confirm'], [verify, 'auth/2fa/verify']]) {
      const refused = await call(handler, path, {cookies, body: input, ...options});
      assert.deepEqual([refused.status, errorCode(refused)], [403, 'cross_origin'], name + ' ' + path);
      assert.equal(refused.headers.get('cache-control'), 'private, no-store');
    }
  }
  assert.equal((await call(logout, 'auth/logout', {origin: 'https://evil.invalid'})).status, 403);
  // Same-origin fetch metadata is fine, and none of the refusals above spent the challenge.
  const sameSite = await call(enrollStart, 'auth/2fa/enroll/start', {cookies, body: input, headers: {'sec-fetch-site': 'same-origin'}});
  assert.deepEqual([sameSite.status, errorCode(sameSite)], [403, 'invalid_enrollment_code']);

  const big = JSON.stringify({code: '1'.repeat(5000)});
  for (const [name, options] of Object.entries({
    'over the cap': {body: big}, 'no Content-Length': {body: '{}', length: null}, 'Content-Length not a number': {body: '{}', length: 'many'},
    'negative Content-Length': {body: '{}', length: '-1'}, 'body longer than declared': {body: big, length: 10},
  })) {
    const refused = await call(verify, 'auth/2fa/verify', {cookies, ...options});
    assert.deepEqual([refused.status, errorCode(refused)], [413, 'request_too_large'], name);
  }
  // Still usable: malformed JSON is just an empty input, not an error of its own.
  const malformed = await call(enrollStart, 'auth/2fa/enroll/start', {cookies, body: '{not json'});
  assert.deepEqual([malformed.status, errorCode(malformed)], [403, 'invalid_enrollment_code']);
});

test('enrollment and verification set the session cookie; management needs it', async () => {
  const challenge = (await passwordStep('enroll')).set.fw_ks_admin_2fa.value;
  const cookies = {fw_ks_admin_2fa: challenge};
  const started = await call(enrollStart, 'auth/2fa/enroll/start', {cookies, body: {enrollment_code: ENROLLMENT}});
  assert.equal(started.status, 200);
  assert.deepEqual(started.set, {});
  secret = started.json.enrollment.secret;
  const confirmed = await call(enrollConfirm, 'auth/2fa/enroll/confirm', {cookies, body: {code: codeNow(secret)}});
  assert.equal(confirmed.status, 200);
  assert.deepEqual(confirmed.set.fw_ks_admin.attributes, SESSION_ATTRIBUTES);
  assert.deepEqual(confirmed.set.fw_ks_admin_2fa, {value: '', attributes: cleared(CHALLENGE_ATTRIBUTES)});
  session = confirmed.set.fw_ks_admin.value;
  recovery = confirmed.json.recovery_codes;

  assert.deepEqual((await call(me, 'auth/me', {method: 'GET', cookies: {fw_ks_admin: session}})).json, {admin: {username: 'owner', role: 'superadmin'}});
  assert.equal((await call(statusRoute, 'auth/2fa/status', {method: 'GET', cookies: {fw_ks_admin: session}})).json.two_factor.state, 'active');
  // The session cookie in the challenge slot, and the other way round, get nowhere.
  assert.equal(errorCode(await call(verify, 'auth/2fa/verify', {cookies: {fw_ks_admin_2fa: session}, body: {code: recovery[0]}})), 'challenge_expired');

  // A second sign-in through the verify route, with a recovery code (the time step is spent).
  const next = (await passwordStep('verify')).set.fw_ks_admin_2fa.value;
  const verified = await call(verify, 'auth/2fa/verify', {cookies: {fw_ks_admin_2fa: next}, body: {code: recovery[0]}});
  assert.equal(verified.status, 200);
  assert.deepEqual(verified.set.fw_ks_admin.attributes, SESSION_ATTRIBUTES);
  assert.deepEqual(verified.set.fw_ks_admin_2fa, {value: '', attributes: cleared(CHALLENGE_ATTRIBUTES)});
  assert.equal(verified.json.used_recovery_code, true);

  for (const [handler, path] of [[recoveryCodes, 'auth/2fa/recovery-codes'], [replaceStart, 'auth/2fa/replace/start'], [replaceConfirm, 'auth/2fa/replace/confirm'], [disable, 'auth/2fa/disable']]) {
    for (const wrong of [{}, {fw_ks_admin: next}, {fw_ks_admin_2fa: session}, {fw_ks_admin: session + 'x'}]) {
      const refused = await call(handler, path, {cookies: wrong, body: {password: PASSWORD, code: recovery[1]}});
      assert.deepEqual([refused.status, errorCode(refused)], [401, 'unauthorized'], path);
    }
    assert.equal(errorCode(await call(handler, path, {cookies: {fw_ks_admin: session}, origin: null, body: {password: PASSWORD, code: recovery[1]}})), 'cross_origin', path);
  }
});

test('reauthentication accepts a 512-character password and is rate limited with 429', async () => {
  const cookies = {fw_ks_admin: session};
  // The shared security screen allows 512 characters; the reauthentication path must not cut that short.
  const long = 'p'.repeat(512);
  setPassword(long);
  const accepted = await call(recoveryCodes, 'auth/2fa/recovery-codes', {cookies, body: {password: long, code: recovery[1]}});
  assert.equal(accepted.status, 200);
  recovery = accepted.json.recovery_codes;
  assert.equal(errorCode(await call(recoveryCodes, 'auth/2fa/recovery-codes', {cookies, body: {password: long + 'p', code: recovery[0]}})), 'reauthentication_failed');
  setPassword(PASSWORD);
  assert.equal((await call(recoveryCodes, 'auth/2fa/recovery-codes', {cookies, body: {password: PASSWORD, code: recovery[0]}})).status, 200, 'a success clears the attempt window');

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const refused = await call(recoveryCodes, 'auth/2fa/recovery-codes', {cookies, body: {password: 'wrong-password', code: '000000'}});
    assert.deepEqual([refused.status, errorCode(refused)], [401, 'reauthentication_failed'], 'attempt ' + attempt);
  }
  for (const [handler, path] of [[recoveryCodes, 'auth/2fa/recovery-codes'], [replaceStart, 'auth/2fa/replace/start'], [disable, 'auth/2fa/disable']]) {
    const limited = await call(handler, path, {cookies, body: {password: PASSWORD, code: codeNow(secret)}});
    assert.deepEqual([limited.status, errorCode(limited), limited.headers.get('retry-after')], [429, 'too_many_attempts', '900'], path);
    assert.equal(limited.headers.get('cache-control'), 'private, no-store');
  }
  assert.equal((await call(me, 'auth/me', {method: 'GET', cookies})).status, 200, 'the limit locks changes, not the session');
});

test('logout clears both cookies and ends the session on the server', async () => {
  const pending = (await passwordStep('verify')).set.fw_ks_admin_2fa.value;
  const out = await call(logout, 'auth/logout', {cookies: {fw_ks_admin: session, fw_ks_admin_2fa: pending}});
  assert.deepEqual([out.status, out.json], [200, {success: true}]);
  assert.deepEqual(out.set.fw_ks_admin, {value: '', attributes: cleared(SESSION_ATTRIBUTES)});
  assert.deepEqual(out.set.fw_ks_admin_2fa, {value: '', attributes: cleared(CHALLENGE_ATTRIBUTES)});
  // A copy of the cookie taken before the logout is dead, and so is the pending challenge.
  assert.equal((await call(me, 'auth/me', {method: 'GET', cookies: {fw_ks_admin: session}})).status, 401);
  assert.equal((await call(exportsRoute, 'exports', {method: 'GET', cookies: {fw_ks_admin: session}})).status, 401);
  assert.equal(errorCode(await call(statusRoute, 'auth/2fa/status', {method: 'GET', cookies: {fw_ks_admin: session, fw_ks_admin_2fa: pending}})), 'unauthorized');
  // Logging out without cookies is still a success that clears them.
  const again = await call(logout, 'auth/logout');
  assert.deepEqual([again.status, Object.keys(again.set).sort()], [200, ['fw_ks_admin', 'fw_ks_admin_2fa']]);
});
