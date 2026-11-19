// Kansas admin second factor: the scenarios of the shared Rust suite (admin_totp_tests.rs),
// run against the file-backed implementation with an injected clock and a temporary state file.
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {execFile} from 'node:child_process';
import {chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync} from 'node:fs';

const read = readFileSync;
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import * as OTPAuth from 'otpauth';
import {importSharedAuthenticator, begin, sessionAdmin, signOut, status, enrollStart, enrollConfirm, verify, replaceStart, replaceConfirm, regenerateRecoveryCodes, disable, TwoFactorFailure, CHALLENGE_SECONDS, SESSION_SECONDS} from '../lib/admin-totp.mjs';
import {readState, resetSecondFactor, withState, writeState} from '../lib/admin-totp-store.mjs';
import {qrImageSource} from '../lib/admin-two-factor.mjs';

const run = promisify(execFile);
const PASSWORD = 'test-only-password';
const ENROLLMENT = 'test-only-enrollment-code';
const KEY = '0f'.repeat(32);
const SESSION_KEY = 'test-session-key-'.repeat(4);

/** One isolated site: its own state file, clock, environment and account. */
const directories = [];
after(() => { for (const directory of directories) rmSync(directory, {recursive: true, force: true}); });

function site(overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'ks-admin-totp-'));
  directories.push(directory);
  const file = join(directory, 'state', 'admin-totp.json');
  const self = {
    file, directory,
    nowMs: 1_800_000_000_000,
    account: {username: 'owner', role: 'superadmin', session_key: SESSION_KEY},
    env: {KANSAS_ADMIN_TOTP_KEY: KEY, KANSAS_ADMIN_TOTP_ENROLLMENT_CODE: ENROLLMENT, KANSAS_ADMIN_TOTP_STATE_FILE: file, ...overrides},
    advance(seconds) { self.nowMs += seconds * 1000; },
  };
  self.ctx = {sharedProvisioningRequired: false, env: self.env, now: () => self.nowMs, account: async () => ({...self.account}), verifyPassword: async password => password === PASSWORD};
  return self;
}

/** Result or failure of an entry point in one comparable shape. */
async function outcome(promise) {
  try {
    const result = await promise;
    return {status: result.status, code: 'ok', body: result.body, session: result.session, challenge: result.challenge};
  } catch (error) {
    if (!(error instanceof TwoFactorFailure)) throw error;
    return {status: error.status, code: error.code, retryAfter: error.retryAfter, body: null};
  }
}

const brief = result => [result.status, result.code];
const post = (s, action, cookies, input) => outcome(action(s.ctx, {sameOrigin: true, ...cookies, input}));

function codeAt(secret, nowMs) {
  return new OTPAuth.TOTP({algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret)}).generate({timestamp: nowMs});
}

/** The password step: must hand out a challenge and never a session. */
async function passwordStep(s, expected) {
  const result = await outcome(begin(s.ctx));
  assert.equal(result.code, 'ok');
  assert.deepEqual(result.body, {two_factor: {required: true, state: expected}});
  assert.equal(result.session, undefined, 'a password alone must never produce a session cookie');
  assert.equal(result.challenge.maxAge, CHALLENGE_SECONDS);
  return result.challenge.token;
}

async function enroll(s) {
  const challenge = await passwordStep(s, 'enroll');
  const started = await post(s, enrollStart, {challenge}, {enrollment_code: ENROLLMENT});
  assert.equal(started.code, 'ok');
  const secret = started.body.enrollment.secret;
  const confirmed = await post(s, enrollConfirm, {challenge}, {code: codeAt(secret, s.nowMs)});
  assert.equal(confirmed.code, 'ok');
  return {secret, session: confirmed.session.token, recoveryCodes: confirmed.body.recovery_codes, setup: started.body.enrollment};
}

/** Full sign-in with a fresh time step. */
async function signIn(s, secret) {
  s.advance(30);
  const challenge = await passwordStep(s, 'verify');
  const result = await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)});
  assert.equal(result.code, 'ok');
  return result.session.token;
}

const signedIn = async (s, token) => (await sessionAdmin(s.ctx, token)) !== null;

test('sign-in fails closed when the key or the state file is missing, invalid or unwritable', async () => {
  for (const broken of [
    {KANSAS_ADMIN_TOTP_KEY: undefined}, {KANSAS_ADMIN_TOTP_KEY: ''}, {KANSAS_ADMIN_TOTP_KEY: 'abc'}, {KANSAS_ADMIN_TOTP_KEY: 'zz'.repeat(32)}, {KANSAS_ADMIN_TOTP_KEY: KEY + '00'},
    {KANSAS_ADMIN_TOTP_STATE_FILE: undefined}, {KANSAS_ADMIN_TOTP_STATE_FILE: ''}, {KANSAS_ADMIN_TOTP_STATE_FILE: 'relative/state.json'},
  ]) {
    const s = site(broken);
    const result = await outcome(begin(s.ctx));
    assert.deepEqual([result.status, result.code], [503, 'two_factor_unavailable'], JSON.stringify(broken));
  }
  // The parent of the state file is a regular file: nothing can be written there.
  const blocked = site();
  writeFileSync(join(blocked.directory, 'state'), 'not a directory');
  assert.equal((await outcome(begin(blocked.ctx))).status, 503);
  // A read-only directory (skipped for root, which ignores permission bits).
  if (process.getuid?.() !== 0) {
    const readOnly = site();
    readOnly.env.KANSAS_ADMIN_TOTP_STATE_FILE = join(readOnly.directory, 'state.json');
    chmodSync(readOnly.directory, 0o500);
    assert.equal((await outcome(begin(readOnly.ctx))).status, 503);
    chmodSync(readOnly.directory, 0o700);
  }
  // A damaged state file refuses sign-in and existing sessions instead of starting from scratch.
  const damaged = site();
  const {session} = await enroll(damaged);
  const good = readFileSync(damaged.file, 'utf8');
  const altered = change => { const state = JSON.parse(good); change(state, state.accounts.owner); return JSON.stringify(state); };
  const junk = 'c'.repeat(64);
  const malformed = {
    'not JSON': '{not json', 'an array': '[]', 'another version': '{"version":2,"accounts":{},"challenges":{}}', 'an extra top-level key': altered(state => { state.extra = 1; }),
    'accounts as a list': '{"version":1,"accounts":[],"challenges":{}}',
    // A malformed account must never read as "not enrolled", nor a malformed authenticator as "enrolled".
    'account null': '{"version":1,"accounts":{"owner":null},"challenges":{}}',
    'account a string': '{"version":1,"accounts":{"owner":"x"},"challenges":{}}',
    'active true': '{"version":1,"accounts":{"owner":{"active":true}},"challenges":{}}',
    'active null': altered((state, owner) => { owner.active = null; }),
    'active without ciphertext': altered((state, owner) => { delete owner.active.ciphertext; }),
    'active nonce not text': altered((state, owner) => { owner.active.nonce = 5; }),
    'step not a number': altered((state, owner) => { owner.active.last_used_step = '0'; }),
    'step negative': altered((state, owner) => { owner.active.last_used_step = -1; }),
    'unknown account field': altered((state, owner) => { owner.admin = true; }),
    'recovery codes not a list': altered((state, owner) => { owner.recovery_codes = {}; }),
    'recovery code a string': altered((state, owner) => { owner.recovery_codes[0] = 'x'; }),
    'recovery code without hash': altered((state, owner) => { delete owner.recovery_codes[0].hash; }),
    'recovery code used flag not a time': altered((state, owner) => { owner.recovery_codes[0].used_at = 'no'; }),
    'cut-off not a number': altered((state, owner) => { owner.sessions_valid_after = '0'; }),
    'cut-off not finite': good.replace(/"sessions_valid_after":\d+/, '"sessions_valid_after":1e999'),
    'attempt window junk': altered((state, owner) => { owner.limit = {attempts: 'many'}; }),
    'challenge null': altered(state => { state.challenges[junk] = null; }),
    'challenge junk': altered(state => { state.challenges[junk] = {username: 'owner', expires_at: 'never', attempts: 0, enrollment_authorized: false}; }),
    'challenge authorised by a string': altered(state => { state.challenges[junk] = {username: 'owner', expires_at: 1, attempts: 0, enrollment_authorized: 'yes'}; }),
    'challenge with extra field': altered(state => { state.challenges[junk] = {username: 'owner', expires_at: 1, attempts: 0, enrollment_authorized: false, session: true}; }),
    'challenge id not a hash': altered(state => { state.challenges.x = {username: 'owner', expires_at: 1, attempts: 0, enrollment_authorized: false}; }),
  };
  assert.match(good, /"sessions_valid_after":\d+/);
  for (const [name, content] of Object.entries(malformed)) {
    writeFileSync(damaged.file, content);
    assert.equal((await outcome(begin(damaged.ctx))).code, 'two_factor_unavailable', name);
    await assert.rejects(sessionAdmin(damaged.ctx, session), error => error instanceof TwoFactorFailure && error.status === 503, name);
    assert.equal((await outcome(status(damaged.ctx, {session}))).status, 503, name);
    assert.equal(readFileSync(damaged.file, 'utf8'), content, 'a refused file is left as it is: ' + name);
  }
  writeFileSync(damaged.file, good);
  assert.ok(await signedIn(damaged, session), 'the untouched file works again');
});

test('enrollment is closed without the owner code and only a valid authenticator code enables it', async () => {
  const logged = [];
  const original = {log: console.log, error: console.error, warn: console.warn, info: console.info};
  for (const name of Object.keys(original)) console[name] = (...parts) => logged.push(parts.join(' '));
  try {
    // No enrollment code in the environment, or one that is too short: nobody can enroll.
    for (const closed of [undefined, '', 'fifteen-chars-x']) {
      const s = site({KANSAS_ADMIN_TOTP_ENROLLMENT_CODE: closed});
      const challenge = await passwordStep(s, 'enroll');
      const result = await post(s, enrollStart, {challenge}, {enrollment_code: closed || ENROLLMENT});
      assert.deepEqual([result.status, result.code], [403, 'enrollment_closed']);
    }

    const s = site();
    let challenge = await passwordStep(s, 'enroll');
    assert.deepEqual((await outcome(status(s.ctx, {challenge}))).body, {two_factor: {required: true, state: 'enroll'}});
    // Confirming before the owner code was accepted is refused.
    assert.equal((await post(s, enrollConfirm, {challenge}, {code: '123456'})).code, 'enrollment_not_started');
    for (const wrong of ['', 'wrong-enrollment-code-value', ENROLLMENT + 'x', 'x'.repeat(300)]) {
      const result = await post(s, enrollStart, {challenge}, {enrollment_code: wrong});
      assert.deepEqual([result.status, result.code], [403, 'invalid_enrollment_code'], wrong.slice(0, 30));
    }
    assert.equal((await post(s, enrollStart, {challenge, sameOrigin: false}, {enrollment_code: ENROLLMENT})).code, 'cross_origin');

    challenge = await passwordStep(s, 'enroll');
    const started = await post(s, enrollStart, {challenge}, {enrollment_code: ENROLLMENT});
    assert.equal(started.code, 'ok');
    const setup = started.body.enrollment;
    assert.match(setup.secret, /^[A-Z2-7]{32}$/, '160-bit secret in base32');
    assert.equal(setup.issuer, 'SEO Sites');
    assert.equal(setup.account, 'owner');
    assert.ok(setup.otpauth_uri.startsWith('otpauth://totp/SEO%20Sites:owner?'));
    for (const part of ['secret=' + setup.secret, 'algorithm=SHA1', 'digits=6', 'period=30', 'issuer=SEO%20Sites']) assert.ok(setup.otpauth_uri.includes(part), part);
    assert.ok(qrImageSource(setup.qr_svg).startsWith('data:image/svg+xml'), 'the shared screen accepts the QR image');
    assert.equal(started.session, undefined);

    // The secret alone enables nothing: wrong and malformed codes leave the account unenrolled.
    const valid = codeAt(setup.secret, s.nowMs);
    const wrongCode = String((Number(valid) + 1) % 1000000).padStart(6, '0');
    for (const bad of [wrongCode, '12345', 'ABCDEFGHJKLMNPQR', '']) {
      const result = await post(s, enrollConfirm, {challenge}, {code: bad});
      assert.deepEqual([result.status, result.code], [401, 'invalid_code'], bad);
      assert.equal(result.session, undefined);
    }
    assert.equal((await readState(s.file)).accounts.owner.active, undefined);
    assert.deepEqual((await outcome(status(s.ctx, {challenge}))).body, {two_factor: {required: true, state: 'enroll'}});

    const confirmed = await post(s, enrollConfirm, {challenge}, {code: valid});
    assert.equal(confirmed.code, 'ok');
    assert.equal(confirmed.session.maxAge, SESSION_SECONDS);
    assert.equal(confirmed.challenge, null, 'the challenge cookie is cleared');
    assert.deepEqual(confirmed.body.user, {username: 'owner', role: 'superadmin'});
    assert.equal(confirmed.body.recovery_codes.length, 10);
    assert.equal(new Set(confirmed.body.recovery_codes).size, 10);
    for (const code of confirmed.body.recovery_codes) assert.match(code, /^([A-HJ-NP-Z2-9]{4}-){3}[A-HJ-NP-Z2-9]{4}$/);
    assert.deepEqual(await sessionAdmin(s.ctx, confirmed.session.token), {username: 'owner', role: 'superadmin'});
    assert.deepEqual((await outcome(status(s.ctx, {session: confirmed.session.token}))).body, {two_factor: {state: 'active', recovery_codes_remaining: 10, replacement_pending: false, shared_authenticator: false, authenticator_label: 'SEO Sites'}});

    // At rest: owner-only file, encrypted secret, hashed recovery codes, no temporary files.
    assert.equal(statSync(s.file).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(join(s.directory, 'state')), ['admin-totp.json']);
    const stored = readFileSync(s.file, 'utf8');
    for (const secret of [setup.secret, KEY, ENROLLMENT, PASSWORD, SESSION_KEY, valid, ...confirmed.body.recovery_codes, ...confirmed.body.recovery_codes.map(code => code.replaceAll('-', ''))])
      assert.ok(!stored.includes(secret), 'the state file must not contain plaintext secrets or codes');
    // Nothing secret reaches the log.
    for (const line of logged) for (const secret of [setup.secret, valid, ENROLLMENT, ...confirmed.body.recovery_codes]) assert.ok(!line.includes(secret));

    // An enrolled account cannot be enrolled again, with or without the owner code.
    const again = await passwordStep(s, 'verify');
    for (const code of [ENROLLMENT, 'wrong-enrollment-code-value']) assert.deepEqual(brief(await post(s, enrollStart, {challenge: again}, {enrollment_code: code})), [409, 'already_enrolled']);
    assert.notEqual((await post(s, enrollConfirm, {challenge: again}, {code: codeAt(setup.secret, s.nowMs)})).code, 'ok');
  } finally {
    Object.assign(console, original);
  }
});

test('login needs the second factor; a challenge is single use and same-origin only', async () => {
  const s = site();
  const {secret} = await enroll(s);
  s.advance(30);
  const challenge = await passwordStep(s, 'verify');
  assert.equal(await sessionAdmin(s.ctx, challenge), null, 'the challenge cookie is not a session');
  assert.deepEqual((await outcome(status(s.ctx, {challenge}))).body, {two_factor: {required: true, state: 'verify'}});
  assert.deepEqual(brief(await outcome(status(s.ctx, {}))), [401, 'unauthorized']);

  const code = codeAt(secret, s.nowMs);
  assert.equal((await post(s, verify, {challenge, sameOrigin: false}, {code})).code, 'cross_origin');
  assert.equal((await post(s, verify, {}, {code})).code, 'challenge_expired');
  assert.equal((await post(s, verify, {challenge: 'forged.' + 'A'.repeat(43)}, {code})).code, 'challenge_expired');
  for (const bad of [String((Number(code) + 1) % 1000000).padStart(6, '0'), 'not-a-code', '', 'x'.repeat(100)]) assert.equal((await post(s, verify, {challenge}, {code: bad})).code, 'invalid_code', bad.slice(0, 12));
  // Only strings are read from the body.
  s.advance(1000);
  const second = await passwordStep(s, 'verify');
  for (const input of [null, 'text', 7, {code: 123456}, {code: [codeAt(secret, s.nowMs)]}]) assert.equal((await outcome(verify(s.ctx, {sameOrigin: true, challenge: second, input}))).code, 'invalid_code');

  s.advance(1000);
  const fresh = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge: second}, {code: codeAt(secret, s.nowMs)})).code, 'challenge_expired', 'an earlier challenge ends when a new password step starts');
  const ok = await post(s, verify, {challenge: fresh}, {code: codeAt(secret, s.nowMs)});
  assert.equal(ok.code, 'ok');
  assert.deepEqual(ok.body, {used_recovery_code: false, recovery_codes_remaining: 10, user: {username: 'owner', role: 'superadmin'}});
  assert.equal(ok.challenge, null);
  assert.ok(await signedIn(s, ok.session.token));

  // The finished challenge cannot open a second session, even with the next valid code.
  s.advance(30);
  assert.equal((await post(s, verify, {challenge: fresh}, {code: codeAt(secret, s.nowMs)})).code, 'challenge_expired');
  assert.deepEqual(Object.keys((await readState(s.file)).challenges), []);
});

test('an accepted time step is never accepted again and older steps are refused', async () => {
  const s = site();
  const {secret} = await enroll(s);
  // The code that enabled 2FA cannot also sign in.
  let challenge = await passwordStep(s, 'verify');
  assert.deepEqual(brief(await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})), [401, 'code_already_used']);

  s.advance(60);
  challenge = await passwordStep(s, 'verify');
  const used = codeAt(secret, s.nowMs);
  const previous = codeAt(secret, s.nowMs - 30000);
  const next = codeAt(secret, s.nowMs + 30000);
  assert.equal((await post(s, verify, {challenge}, {code: used})).code, 'ok');
  // Replay of the same code, and the still-in-window code of the step before it.
  challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: used})).code, 'code_already_used');
  assert.equal((await post(s, verify, {challenge}, {code: previous})).code, 'code_already_used');
  // The next step (clock drift) is newer and works once; after it the current step is older and refused.
  assert.equal((await post(s, verify, {challenge}, {code: next})).code, 'ok');
  s.advance(1000);
  challenge = await passwordStep(s, 'verify');
  // Codes outside the +/-1 step window are simply invalid.
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs - 90000)})).code, 'invalid_code');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs + 90000)})).code, 'invalid_code');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs - 30000)})).code, 'ok', 'one step of drift is tolerated');
});

test('a recovery code signs in exactly once', async () => {
  const s = site();
  const {recoveryCodes} = await enroll(s);
  let challenge = await passwordStep(s, 'verify');
  const first = await post(s, verify, {challenge}, {code: ' ' + recoveryCodes[0].toLowerCase() + ' '});
  assert.equal(first.code, 'ok');
  assert.equal(first.body.used_recovery_code, true);
  assert.equal(first.body.recovery_codes_remaining, 9);
  assert.ok(await signedIn(s, first.session.token));

  challenge = await passwordStep(s, 'verify');
  for (const reused of [recoveryCodes[0], recoveryCodes[0].replaceAll('-', '')]) assert.deepEqual(brief(await post(s, verify, {challenge}, {code: reused})), [401, 'invalid_code']);
  s.advance(1000);
  challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: 'ABCD-EFGH-JKLM-NPQR'})).code, 'invalid_code');
  const second = await post(s, verify, {challenge}, {code: recoveryCodes[1]});
  assert.equal(second.body.recovery_codes_remaining, 8);
  assert.deepEqual((await outcome(status(s.ctx, {session: second.session.token}))).body.two_factor.recovery_codes_remaining, 8);
});

test('five second-factor attempts per account per 15 minutes, across challenges', async () => {
  const s = site();
  const {secret, recoveryCodes} = await enroll(s);
  s.advance(30);
  let challenge = await passwordStep(s, 'verify');
  for (let attempt = 1; attempt <= 5; attempt += 1) assert.equal((await post(s, verify, {challenge}, {code: '000000'})).code, 'invalid_code', 'attempt ' + attempt);
  const limited = await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)});
  assert.deepEqual([limited.status, limited.code, limited.retryAfter], [429, 'too_many_attempts', 900]);
  // A new password step does not reset the account's window, and recovery codes are limited too.
  challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})).status, 429);
  assert.equal((await post(s, verify, {challenge}, {code: recoveryCodes[0]})).status, 429);
  s.advance(14 * 60);
  challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})).status, 429);
  s.advance(61);
  challenge = await passwordStep(s, 'verify');
  // The refused attempts consumed nothing: the code and the recovery code still work.
  const ok = await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)});
  assert.equal(ok.code, 'ok');
  // A success clears the window.
  challenge = await passwordStep(s, 'verify');
  for (let attempt = 1; attempt <= 4; attempt += 1) assert.equal((await post(s, verify, {challenge}, {code: '000000'})).code, 'invalid_code');
  assert.equal((await post(s, verify, {challenge}, {code: recoveryCodes[0]})).code, 'ok');

  // The enrollment code is guessed against the same window.
  const fresh = site();
  const enrollment = await passwordStep(fresh, 'enroll');
  for (let attempt = 1; attempt <= 5; attempt += 1) assert.equal((await post(fresh, enrollStart, {challenge: enrollment}, {enrollment_code: 'wrong-enrollment-code-value'})).code, 'invalid_enrollment_code');
  assert.equal((await post(fresh, enrollStart, {challenge: enrollment}, {enrollment_code: ENROLLMENT})).status, 429);
});

test('a challenge expires after ten minutes and allows eight requests', async () => {
  const s = site();
  const {secret} = await enroll(s);
  s.advance(30);
  let challenge = await passwordStep(s, 'verify');
  s.advance(CHALLENGE_SECONDS - 1);
  assert.equal((await outcome(status(s.ctx, {challenge}))).code, 'ok');
  s.advance(1);
  assert.deepEqual(brief(await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})), [401, 'challenge_expired']);
  assert.equal((await outcome(status(s.ctx, {challenge}))).code, 'unauthorized');

  // Eight requests, whatever their result; the ninth needs the password again.
  const capped = site({KANSAS_ADMIN_TOTP_ENROLLMENT_CODE: undefined});
  challenge = await passwordStep(capped, 'enroll');
  for (let request = 1; request <= 8; request += 1) assert.equal((await post(capped, enrollStart, {challenge}, {enrollment_code: ENROLLMENT})).code, 'enrollment_closed', 'request ' + request);
  capped.env.KANSAS_ADMIN_TOTP_ENROLLMENT_CODE = ENROLLMENT;
  assert.equal((await post(capped, enrollStart, {challenge}, {enrollment_code: ENROLLMENT})).code, 'challenge_expired');
  assert.equal((await outcome(status(capped.ctx, {challenge}))).code, 'unauthorized');
  // A pending setup older than ten minutes cannot be confirmed with a later challenge either.
  const slow = site();
  const first = await passwordStep(slow, 'enroll');
  const started = await post(slow, enrollStart, {challenge: first}, {enrollment_code: ENROLLMENT});
  const later = await passwordStep(slow, 'enroll');
  assert.equal((await post(slow, enrollConfirm, {challenge: later}, {code: codeAt(started.body.enrollment.secret, slow.nowMs)})).code, 'enrollment_not_started');
});

test('replace, new recovery codes and disable need a session, the password and a current code', async () => {
  const s = site();
  const {secret, session, recoveryCodes} = await enroll(s);
  s.advance(30);
  const challenge = await passwordStep(s, 'verify');
  const before = JSON.stringify((await readState(s.file)).accounts.owner.active);
  for (const action of [replaceStart, regenerateRecoveryCodes, disable, replaceConfirm]) {
    const code = codeAt(secret, s.nowMs);
    // No session, a pending challenge instead of a session, a forged cookie: not signed in.
    for (const cookies of [{}, {session: challenge}, {challenge}, {session: session + 'x'}]) {
      const result = await post(s, action, cookies, {password: PASSWORD, code});
      assert.deepEqual([result.status, result.code], [401, 'unauthorized'], action.name);
    }
    assert.equal((await post(s, action, {session, sameOrigin: false}, {password: PASSWORD, code})).code, 'cross_origin', action.name);
  }
  for (const action of [replaceStart, regenerateRecoveryCodes, disable]) {
    s.advance(1000);
    const code = codeAt(secret, s.nowMs);
    for (const input of [{password: 'wrong-password', code}, {password: '', code}, {code}, {password: PASSWORD, code: '000000'}, {password: PASSWORD}]) {
      const result = await post(s, action, {session}, input);
      assert.deepEqual([result.status, result.code], [401, 'reauthentication_failed'], action.name + ' ' + JSON.stringify(Object.keys(input)));
    }
  }
  // Nothing changed: same authenticator, all recovery codes, session still valid, and the
  // wrong-password attempts did not burn the valid code.
  const stored = (await readState(s.file)).accounts.owner;
  assert.equal(JSON.stringify({...stored.active, last_used_step: JSON.parse(before).last_used_step}), before);
  assert.equal(stored.pending, undefined);
  assert.ok(await signedIn(s, session));
  s.advance(1000);
  assert.equal((await outcome(status(s.ctx, {session}))).body.two_factor.recovery_codes_remaining, 10);

  // New recovery codes: the earlier set stops working, sessions stay.
  const regenerated = await post(s, regenerateRecoveryCodes, {session}, {password: PASSWORD, code: codeAt(secret, s.nowMs)});
  assert.equal(regenerated.code, 'ok');
  assert.equal(regenerated.body.recovery_codes.length, 10);
  assert.equal(regenerated.session, undefined);
  assert.ok(await signedIn(s, session));
  assert.ok(regenerated.body.recovery_codes.every(code => !recoveryCodes.includes(code)));
  // A used code is refused as such, also for reauthentication.
  assert.equal((await post(s, regenerateRecoveryCodes, {session}, {password: PASSWORD, code: codeAt(secret, s.nowMs)})).code, 'code_already_used');
  let next = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge: next}, {code: recoveryCodes[3]})).code, 'invalid_code');
  assert.equal((await post(s, verify, {challenge: next}, {code: regenerated.body.recovery_codes[3]})).code, 'ok');
  // A recovery code is also a valid current factor for reauthentication, once.
  const withRecovery = await post(s, regenerateRecoveryCodes, {session}, {password: PASSWORD, code: regenerated.body.recovery_codes[4]});
  assert.equal(withRecovery.code, 'ok');
  assert.equal((await post(s, regenerateRecoveryCodes, {session}, {password: PASSWORD, code: regenerated.body.recovery_codes[5]})).code, 'reauthentication_failed');
});

test('replacing the authenticator revokes earlier sessions, the old secret and old recovery codes', async () => {
  const s = site();
  const {secret, session: first, recoveryCodes} = await enroll(s);
  const second = await signIn(s, secret);
  s.advance(30);

  const started = await post(s, replaceStart, {session: first}, {password: PASSWORD, code: codeAt(secret, s.nowMs)});
  assert.equal(started.code, 'ok');
  const replacement = started.body.enrollment.secret;
  assert.notEqual(replacement, secret);
  assert.equal((await outcome(status(s.ctx, {session: first}))).body.two_factor.replacement_pending, true);
  assert.equal((await outcome(status(s.ctx, {session: second}))).body.two_factor.replacement_pending, false);

  // Until the new code is accepted the old authenticator stays in force.
  const third = await signIn(s, secret);
  // Only the session that started the replacement may confirm it, and only with the new secret.
  assert.equal((await post(s, replaceConfirm, {session: second}, {code: codeAt(replacement, s.nowMs)})).code, 'enrollment_not_started');
  assert.equal((await post(s, replaceConfirm, {session: first}, {code: codeAt(secret, s.nowMs + 30000)})).code, 'invalid_code');
  assert.equal((await post(s, replaceConfirm, {session: first}, {code: 'ABCDEFGHJKLMNPQR'})).code, 'invalid_code');
  for (const token of [first, second, third]) assert.ok(await signedIn(s, token));

  const confirmed = await post(s, replaceConfirm, {session: first}, {code: codeAt(replacement, s.nowMs)});
  assert.equal(confirmed.code, 'ok');
  assert.equal(confirmed.body.recovery_codes.length, 10);
  // Every earlier cookie is refused, including the one that made the change; this browser gets a new one.
  for (const token of [first, second, third]) assert.equal(await sessionAdmin(s.ctx, token), null);
  assert.ok(await signedIn(s, confirmed.session.token));
  assert.equal((await post(s, regenerateRecoveryCodes, {session: second}, {password: PASSWORD, code: codeAt(replacement, s.nowMs + 30000)})).code, 'unauthorized');

  s.advance(60);
  let challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})).code, 'invalid_code', 'old authenticator');
  assert.equal((await post(s, verify, {challenge}, {code: recoveryCodes[0]})).code, 'invalid_code', 'old recovery code');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(replacement, s.nowMs)})).code, 'ok');
  challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: confirmed.body.recovery_codes[0]})).code, 'ok');
  // A second confirm has nothing pending.
  s.advance(30);
  assert.equal((await post(s, replaceConfirm, {session: confirmed.session.token}, {code: codeAt(replacement, s.nowMs)})).code, 'enrollment_not_started');
});

test('removing the authenticator signs out everywhere and returns the account to enrollment', async () => {
  const s = site();
  const {secret, session, recoveryCodes} = await enroll(s);
  const other = await signIn(s, secret);
  s.advance(30);
  const disabled = await post(s, disable, {session}, {password: PASSWORD, code: codeAt(secret, s.nowMs)});
  assert.equal(disabled.code, 'ok');
  assert.deepEqual(disabled.body, {disabled: true});
  assert.equal(disabled.session, null, 'the session cookie is cleared');
  for (const token of [session, other]) assert.equal(await sessionAdmin(s.ctx, token), null);
  assert.equal((await outcome(status(s.ctx, {session}))).code, 'unauthorized');

  // Two-factor stays mandatory: the password step now demands enrollment, the old factors are gone.
  s.advance(60);
  s.env.KANSAS_ADMIN_TOTP_ENROLLMENT_CODE = undefined;
  let challenge = await passwordStep(s, 'enroll');
  assert.deepEqual(brief(await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})), [409, 'enrollment_required']);
  assert.deepEqual(brief(await post(s, verify, {challenge}, {code: recoveryCodes[0]})), [409, 'enrollment_required']);
  assert.equal((await post(s, enrollStart, {challenge}, {enrollment_code: ENROLLMENT})).code, 'enrollment_closed');
  s.env.KANSAS_ADMIN_TOTP_ENROLLMENT_CODE = ENROLLMENT;
  const again = await enroll(s);
  assert.notEqual(again.secret, secret);
  assert.ok(await signedIn(s, again.session));
  // Cookies from before the removal stay refused after the new enrollment.
  for (const token of [session, other]) assert.equal(await sessionAdmin(s.ctx, token), null);
});

test('a session revoked before the state was lost stays revoked after a new enrollment', async () => {
  const s = site();
  const {secret, session} = await enroll(s);
  s.advance(30);
  assert.equal((await post(s, disable, {session}, {password: PASSWORD, code: codeAt(secret, s.nowMs)})).code, 'ok');
  assert.equal(await sessionAdmin(s.ctx, session), null);
  // The revocation cut-off lived in the state file; lose it.
  rmSync(s.file);
  const again = await enroll(s);
  assert.ok(await signedIn(s, again.session));
  assert.equal(await sessionAdmin(s.ctx, session), null, 'no cookie issued before the authenticator became active is a session');
  assert.ok((await readState(s.file)).accounts.owner.sessions_valid_after > s.nowMs);
  // The same holds for a still-unexpired cookie of an account whose state simply vanished.
  const other = site();
  const first = await enroll(other);
  rmSync(other.file);
  assert.equal(await sessionAdmin(other.ctx, first.session), null);
  other.advance(1);
  const second = await enroll(other);
  assert.equal(await sessionAdmin(other.ctx, first.session), null);
  assert.ok(await signedIn(other, second.session));
});

test('signing out revokes the session on the server and drops the pending challenge', async () => {
  const s = site();
  const {secret, session} = await enroll(s);
  const copy = session;
  const other = await signIn(s, secret);
  s.advance(30);
  const challenge = await passwordStep(s, 'verify');
  const out = await outcome(signOut(s.ctx, {session, challenge}));
  assert.equal(out.code, 'ok');
  assert.deepEqual(out.body, {success: true});
  assert.deepEqual([out.session, out.challenge], [null, null], 'both cookies are cleared');
  // A copied cookie no longer works; sessions are stateless, so the account's other sessions end too.
  for (const token of [copy, other]) assert.equal(await sessionAdmin(s.ctx, token), null);
  assert.equal((await post(s, regenerateRecoveryCodes, {session: copy}, {password: PASSWORD, code: codeAt(secret, s.nowMs)})).code, 'unauthorized');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})).code, 'challenge_expired');
  assert.deepEqual(Object.keys((await readState(s.file)).challenges), []);
  // The authenticator is untouched: the next sign-in works, and a second sign-out of the dead cookie changes nothing.
  const next = await signIn(s, secret);
  assert.equal((await outcome(signOut(s.ctx, {session: copy}))).code, 'ok');
  assert.ok(await signedIn(s, next));
  // Without any cookie, or with someone else's forged one, sign-out still clears cookies and revokes nothing.
  assert.deepEqual((await outcome(signOut(s.ctx, {session: 'forged.' + 'A'.repeat(43)}))).session, null);
  assert.ok(await signedIn(s, next));
  // If the state cannot be reached the sign-out reports it instead of pretending.
  writeFileSync(s.file, '{broken');
  assert.equal((await outcome(signOut(s.ctx, {session: next}))).status, 503);
});

test('separate processes cannot lose each other\'s updates, and an abandoned lock is recovered', async () => {
  const s = site();
  const lock = s.file + '.lock';
  const store = fileURLToPath(new URL('../lib/admin-totp-store.mjs', import.meta.url));
  await writeState(s.file, {version: 1, accounts: {counter: {sessions_valid_after: 0}}, challenges: {}});
  const worker = `
    const {withState} = await import(process.argv[1]);
    for (let round = 0; round < 25; round += 1) await withState(process.argv[2], async state => {
      const seen = state.accounts.counter.sessions_valid_after;
      await new Promise(resolve => setTimeout(resolve, 1));
      state.accounts.counter.sessions_valid_after = seen + 1;
    });`;
  // Four other processes and this one all increment the same number.
  await Promise.all([
    ...Array.from({length: 4}, () => run(process.execPath, ['--input-type=module', '-e', worker, store, s.file])),
    ...Array.from({length: 25}, () => withState(s.file, state => { state.accounts.counter.sessions_valid_after += 1; })),
  ]);
  assert.equal((await readState(s.file)).accounts.counter.sessions_valid_after, 125);
  assert.deepEqual(readdirSync(join(s.directory, 'state')), ['admin-totp.json'], 'lock released, no temporary files');

  // A lock held by a live process blocks, for a bounded time, then fails closed.
  writeFileSync(lock, process.pid + '\n');
  const started = Date.now();
  await assert.rejects(withState(s.file, state => { state.accounts.counter.sessions_valid_after = -5; }, {lockWaitMs: 300}), error => error.name === 'StateUnavailable' && /locked/.test(error.reason));
  assert.ok(Date.now() - started >= 280 && Date.now() - started < 3000);
  assert.ok(existsSync(lock), 'someone else\'s live lock is not removed');
  // The reset script takes the same lock: it waits for it instead of writing past it.
  const script = fileURLToPath(new URL('../scripts/admin-totp-reset.mjs', import.meta.url));
  const reset = run(process.execPath, [script, '--username', 'counter'], {env: {PATH: process.env.PATH, KANSAS_ADMIN_TOTP_STATE_FILE: s.file}});
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal((await readState(s.file)).accounts.counter.sessions_valid_after, 125, 'the reset is still waiting for the lock');
  rmSync(lock);
  await reset;
  assert.ok((await readState(s.file)).accounts.counter.sessions_valid_after > 125);

  // Abandoned locks: the owner is gone and the lock is a few seconds old, or it is simply very old.
  const dead = await run(process.execPath, ['-e', 'console.log(process.pid)']);
  const seconds = ago => new Date(Date.now() - ago * 1000);
  for (const [owner, age] of [[dead.stdout.trim(), 5], [String(process.pid), 60], ['not a pid', 5]]) {
    writeFileSync(lock, owner + '\n');
    utimesSync(lock, seconds(age), seconds(age));
    await withState(s.file, state => { state.accounts.counter.sessions_valid_after = 1000 + age; }, {lockWaitMs: 300});
    assert.equal((await readState(s.file)).accounts.counter.sessions_valid_after, 1000 + age, owner + ' ' + age);
    assert.ok(!existsSync(lock));
  }
  // A fresh lock of a dead process is not stolen straight away (its owner may just have started).
  writeFileSync(lock, dead.stdout.trim() + '\n');
  await assert.rejects(withState(s.file, () => {}, {lockWaitMs: 100}), error => error.name === 'StateUnavailable');
  rmSync(lock);
  // The lock is released when the change throws, and temporary files of a crashed write are swept.
  await assert.rejects(withState(s.file, () => { throw new Error('boom'); }), /boom/);
  assert.ok(!existsSync(lock));
  const stale = join(s.directory, 'state', '.admin-totp-0123456789abcdef.tmp');
  const recent = join(s.directory, 'state', '.admin-totp-fedcba9876543210.tmp');
  const unrelated = join(s.directory, 'state', 'keep.tmp');
  for (const path of [stale, recent, unrelated]) writeFileSync(path, 'x');
  for (const path of [stale, unrelated]) utimesSync(path, seconds(120), seconds(120));
  await withState(s.file, state => { state.accounts.counter.sessions_valid_after = 1; });
  assert.deepEqual(readdirSync(join(s.directory, 'state')).sort(), ['.admin-totp-fedcba9876543210.tmp', 'admin-totp.json', 'keep.tmp']);
});

test('the owner reset script removes the second factor and revokes sessions without printing secrets', async () => {
  const script = fileURLToPath(new URL('../scripts/admin-totp-reset.mjs', import.meta.url));
  const s = site();
  const environment = {PATH: process.env.PATH, KANSAS_ADMIN_TOTP_STATE_FILE: s.file};

  const missing = await run(process.execPath, [script, '--username', 'owner'], {env: environment});
  assert.match(missing.stdout, /Nothing to reset/);
  assert.ok(!existsSync(s.file), 'the script never creates a state file');

  const {secret, session, recoveryCodes} = await enroll(s);
  const pending = await passwordStep(s, 'verify');
  await assert.rejects(run(process.execPath, [script], {env: environment}), error => error.code === 2 && /usage/.test(error.stderr));
  await assert.rejects(run(process.execPath, [script, '--username', 'owner'], {env: {PATH: process.env.PATH}}), error => error.code === 1 && /not configured/.test(error.stderr));
  await assert.rejects(run(process.execPath, [script, '--username', 'someone-else'], {env: environment}), error => error.code === 1 && /nothing was removed/.test(error.stderr));
  assert.ok(await signedIn(s, session), 'a failed or mistyped reset changes nothing');

  const done = await run(process.execPath, [script, '--username', ' OWNER '], {env: environment});
  assert.match(done.stdout, /Authenticator and recovery codes removed/);
  for (const secretValue of [secret, KEY, ...recoveryCodes]) assert.ok(!(done.stdout + done.stderr).includes(secretValue));
  assert.equal(statSync(s.file).mode & 0o777, 0o600);
  assert.deepEqual(readdirSync(join(s.directory, 'state')), ['admin-totp.json']);
  const stored = await readState(s.file);
  assert.deepEqual(Object.keys(stored.accounts.owner).sort(), ['last_session_issued_at', 'sessions_valid_after']);
  assert.deepEqual(Object.keys(stored.challenges), []);

  assert.equal(await sessionAdmin(s.ctx, session), null);
  s.advance(60);
  assert.equal((await post(s, verify, {challenge: pending}, {code: codeAt(secret, s.nowMs)})).code, 'challenge_expired');
  const challenge = await passwordStep(s, 'enroll');
  assert.equal((await post(s, verify, {challenge}, {code: recoveryCodes[0]})).code, 'enrollment_required');
  const again = await enroll(s);
  assert.ok(await signedIn(s, again.session));
  assert.equal(await sessionAdmin(s.ctx, session), null);
  // The same function, called directly.
  assert.deepEqual(await resetSecondFactor(s.file, 'owner', s.nowMs), {known: true, hadAuthenticator: true});
  assert.deepEqual(await resetSecondFactor(s.file, 'nobody', s.nowMs), {known: false, hadAuthenticator: false});
  assert.equal(await sessionAdmin(s.ctx, again.session), null);
});

test('only a second-factor session cookie is a session: pre-2FA, unmarked, challenge and altered cookies are refused', async () => {
  const s = site();
  const {secret, session} = await enroll(s);
  const encode = claims => Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sign = (purpose, payload, key = SESSION_KEY) => createHmac('sha256', key).update('fw_ks_admin:v2:' + purpose + ':' + payload).digest('base64url');
  const expires = Math.floor(s.nowMs / 1000) + 3600;
  const claims = {username: 'owner', sid: 'a'.repeat(32), issued_at: s.nowMs + 1, expires, second_factor: 'totp', purpose: 'session'};
  const token = (value, purpose = 'session', key) => encode(value) + '.' + sign(purpose, encode(value), key);
  // The test signer matches the real one, so the refusals below are about the claims.
  assert.ok(await signedIn(s, token(claims)));
  assert.ok(await signedIn(s, session));

  // Exactly what the release before two-factor issued: {username, expires, nonce}, HMAC over the bare payload.
  const legacyPayload = encode({username: 'owner', expires, nonce: 'b'.repeat(32)});
  const legacy = legacyPayload + '.' + createHmac('sha256', SESSION_KEY).update(legacyPayload).digest('base64url');
  assert.equal(await sessionAdmin(s.ctx, legacy), null, 'password-only cookie from the previous release');
  // The same claims re-signed the new way still lack the marker.
  assert.equal(await sessionAdmin(s.ctx, token({username: 'owner', expires, nonce: 'b'.repeat(32), purpose: 'session'})), null);

  const unmarked = {...claims};
  delete unmarked.second_factor;
  const refused = {
    'no second-factor marker': token(unmarked),
    'marker false': token({...claims, second_factor: false}),
    'marker of another kind': token({...claims, second_factor: 'password'}),
    'no issue time': token({...claims, issued_at: undefined}),
    'issue time as text': token({...claims, issued_at: String(s.nowMs)}),
    'expired': token({...claims, expires: Math.floor(s.nowMs / 1000)}),
    'lifetime longer than a session': token({...claims, expires: expires + SESSION_SECONDS}),
    'another account': token({...claims, username: 'intruder'}),
    'challenge purpose claim': token({...claims, purpose: 'challenge'}),
    'signed as a challenge': token(claims, 'challenge'),
    'signed with another key': token(claims, 'session', 'another-session-key-'.repeat(3)),
    'bare legacy signature over new claims': encode(claims) + '.' + createHmac('sha256', SESSION_KEY).update(encode(claims)).digest('base64url'),
    'altered payload': encode({...claims, expires: expires + 1}) + '.' + sign('session', encode(claims)),
    'no signature': encode(claims),
    'three parts': token(claims) + '.x',
    'oversized': token({...claims, padding: 'x'.repeat(3000)}),
  };
  for (const [name, value] of Object.entries(refused)) assert.equal(await sessionAdmin(s.ctx, value), null, name);
  for (const value of [undefined, null, '', 7]) assert.equal(await sessionAdmin(s.ctx, value), null);

  // A real challenge cookie is not a session, and a real session cookie is not a challenge.
  s.advance(30);
  const challenge = await passwordStep(s, 'verify');
  assert.equal(await sessionAdmin(s.ctx, challenge), null);
  assert.equal((await post(s, regenerateRecoveryCodes, {session: challenge}, {password: PASSWORD, code: codeAt(secret, s.nowMs)})).code, 'unauthorized');
  assert.equal((await post(s, verify, {challenge: session}, {code: codeAt(secret, s.nowMs)})).code, 'challenge_expired');
  // A correctly signed challenge whose id the server never issued (or already ended) is refused.
  const unknown = token({username: 'owner', id: 'c'.repeat(64), purpose: 'challenge'}, 'challenge');
  assert.equal((await post(s, verify, {challenge: unknown}, {code: codeAt(secret, s.nowMs)})).code, 'challenge_expired');

  // Sessions end after eight hours, and are refused once issued before the revocation cut-off.
  const late = site();
  const enrolled = await enroll(late);
  late.advance(SESSION_SECONDS - 1);
  assert.ok(await signedIn(late, enrolled.session));
  late.advance(1);
  assert.equal(await sessionAdmin(late.ctx, enrolled.session), null);
  await withState(s.file, state => { state.accounts.owner.sessions_valid_after = s.nowMs + 1; });
  assert.equal(await sessionAdmin(s.ctx, session), null);
  assert.equal(await sessionAdmin(s.ctx, token({...claims, issued_at: s.nowMs + 1, expires: Math.floor(s.nowMs / 1000) + 60})) !== null, true);
  // Rotating the account (new session_key from the provisioning script) invalidates everything signed before.
  const rotated = site();
  const current = await enroll(rotated);
  assert.ok(await signedIn(rotated, current.session), 'valid and not expired before the rotation');
  rotated.account.session_key = 'rotated-session-key-'.repeat(3);
  assert.equal(await sessionAdmin(rotated.ctx, current.session), null);
  assert.equal((await post(rotated, regenerateRecoveryCodes, {session: current.session}, {password: PASSWORD, code: current.recoveryCodes[0]})).code, 'unauthorized');
});

test('a secret cannot be read with another key or under another account', async () => {
  const s = site();
  const {secret, session, recoveryCodes} = await enroll(s);
  s.advance(30);
  // Wrong key: the stored secret is unreadable and sign-in fails closed rather than open.
  s.env.KANSAS_ADMIN_TOTP_KEY = '1e'.repeat(32);
  let challenge = await passwordStep(s, 'verify');
  const wrongKey = await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)});
  assert.deepEqual([wrongKey.status, wrongKey.code], [503, 'two_factor_unavailable']);
  assert.equal((await post(s, regenerateRecoveryCodes, {session}, {password: PASSWORD, code: codeAt(secret, s.nowMs)})).status, 503);
  s.env.KANSAS_ADMIN_TOTP_KEY = undefined;
  assert.equal((await post(s, verify, {challenge}, {code: recoveryCodes[0]})).status, 503);
  s.env.KANSAS_ADMIN_TOTP_KEY = KEY;
  s.advance(1000);
  challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})).code, 'ok', 'the right key reads it again');

  // The ciphertext is bound to its account: copied under another username it does not decrypt.
  const state = await readState(s.file);
  state.accounts.intruder = structuredClone(state.accounts.owner);
  await writeState(s.file, state);
  s.account.username = 'intruder';
  s.advance(1000);
  challenge = await passwordStep(s, 'verify');
  const moved = await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)});
  assert.deepEqual([moved.status, moved.code], [503, 'two_factor_unavailable']);
  // Recovery hashes are bound to the account as well.
  assert.equal((await post(s, verify, {challenge}, {code: recoveryCodes[1]})).code, 'invalid_code');
  // A tampered ciphertext is refused too.
  s.account.username = 'owner';
  const tampered = await readState(s.file);
  const bytes = Buffer.from(tampered.accounts.owner.active.ciphertext, 'base64');
  bytes[0] ^= 1;
  tampered.accounts.owner.active.ciphertext = bytes.toString('base64');
  await writeState(s.file, tampered);
  s.advance(1000);
  challenge = await passwordStep(s, 'verify');
  assert.equal((await post(s, verify, {challenge}, {code: codeAt(secret, s.nowMs)})).status, 503);
});

test('concurrent requests cannot spend one code twice', async () => {
  const s = site();
  const {secret, session, recoveryCodes} = await enroll(s);
  const tally = results => results.reduce((counts, result) => ({...counts, [result.code]: (counts[result.code] || 0) + 1}), {});

  // Two parallel verifies of one challenge with one authenticator code: exactly one session.
  s.advance(30);
  let challenge = await passwordStep(s, 'verify');
  let code = codeAt(secret, s.nowMs);
  let results = await Promise.all([post(s, verify, {challenge}, {code}), post(s, verify, {challenge}, {code})]);
  assert.deepEqual(tally(results), {ok: 1, challenge_expired: 1});

  // The same with one recovery code.
  challenge = await passwordStep(s, 'verify');
  results = await Promise.all([post(s, verify, {challenge}, {code: recoveryCodes[0]}), post(s, verify, {challenge}, {code: recoveryCodes[0]})]);
  assert.deepEqual(tally(results), {ok: 1, challenge_expired: 1});
  assert.equal((await readState(s.file)).accounts.owner.recovery_codes.filter(item => item.used_at !== null).length, 1);

  // Independent of the challenge: parallel reauthentications with one authenticator code...
  s.advance(30);
  code = codeAt(secret, s.nowMs);
  results = await Promise.all([1, 2, 3, 4].map(() => post(s, replaceStart, {session}, {password: PASSWORD, code})));
  assert.deepEqual(tally(results), {ok: 1, code_already_used: 3});
  // ...and with one recovery code (codes are not regenerated by replace/start).
  results = await Promise.all([1, 2, 3, 4].map(() => post(s, replaceStart, {session}, {password: PASSWORD, code: recoveryCodes[1]})));
  assert.deepEqual(tally(results), {ok: 1, reauthentication_failed: 3});
  // A parallel sign-in and a management action sharing one code: one of them wins.
  s.advance(30);
  challenge = await passwordStep(s, 'verify');
  code = codeAt(secret, s.nowMs);
  results = await Promise.all([post(s, verify, {challenge}, {code}), post(s, regenerateRecoveryCodes, {session}, {password: PASSWORD, code})]);
  assert.deepEqual(tally(results), {ok: 1, code_already_used: 1});
});

test('state changes are serialized, atomic and owner-only', async () => {
  const s = site();
  const counter = async () => (await readState(s.file)).accounts.counter.sessions_valid_after;
  await writeState(s.file, {version: 1, accounts: {counter: {sessions_valid_after: 0}}, challenges: {}});
  await Promise.all(Array.from({length: 40}, () => withState(s.file, async state => {
    const seen = state.accounts.counter.sessions_valid_after;
    await new Promise(resolve => setImmediate(resolve));
    state.accounts.counter.sessions_valid_after = seen + 1;
  })));
  assert.equal(await counter(), 40, 'read-modify-write happens inside the lock');
  assert.deepEqual(readdirSync(join(s.directory, 'state')), ['admin-totp.json'], 'no temporary or lock files remain');
  assert.equal(statSync(s.file).mode & 0o777, 0o600);
  assert.equal(statSync(join(s.directory, 'state')).mode & 0o777, 0o700);

  // An unexpected error writes nothing and does not block the queue.
  await assert.rejects(withState(s.file, state => { state.accounts.counter.sessions_valid_after = 7; throw new Error('boom'); }), /boom/);
  assert.equal(await counter(), 40);
  // Only a valid state is ever written.
  await assert.rejects(withState(s.file, state => { state.accounts.counter.active = true; }), error => error.name === 'StateUnavailable');
  await assert.rejects(writeState(s.file, {version: 1, accounts: {counter: {surprise: 1}}, challenges: {}}), error => error.name === 'StateUnavailable');
  assert.equal(await counter(), 40);
  // Refused requests that touch nothing do not rewrite the file.
  const before = statSync(s.file).mtimeMs + ':' + statSync(s.file).ino;
  const fresh = site();
  for (const target of [s, fresh]) {
    assert.equal((await post(target, verify, {}, {code: '123456'})).code, 'challenge_expired');
    assert.equal((await post(target, verify, {challenge: 'forged.' + 'A'.repeat(43)}, {code: '123456'})).code, 'challenge_expired');
    assert.equal((await post(target, disable, {session: 'forged.' + 'A'.repeat(43)}, {password: PASSWORD, code: '123456'})).code, 'unauthorized');
    assert.equal((await outcome(signOut(target.ctx, {}))).code, 'ok');
  }
  assert.equal(statSync(s.file).mtimeMs + ':' + statSync(s.file).ino, before);
  assert.ok(!existsSync(join(fresh.directory, 'state')), 'unsigned requests touch nothing on disk, not even the directory or the lock');
  assert.deepEqual(Object.keys((await readState(s.file)).accounts), ['counter']);
  // Account names are data: a hostile name cannot reach object internals.
  const odd = site();
  odd.account.username = '__proto__';
  const enrolled = await enroll(odd);
  assert.ok(await signedIn(odd, enrolled.session));
  assert.equal(({}).active, undefined);
});

test('every admin API route requires the signed-in second-factor session', () => {
  const root = new URL('../app/api/admin/', import.meta.url);
  const routes = readdirSync(root, {recursive: true}).map(String).filter(path => path.endsWith('route.ts')).map(path => path.replaceAll('\\', '/')).sort();
  // Reachable without a session by design: the sign-in steps themselves.
  const open = ['auth/login/route.ts', 'auth/logout/route.ts', 'auth/turnstile/route.ts'];
  // Second-factor steps of a sign-in in progress: authorised by the challenge cookie inside lib/admin-totp.mjs.
  const challengeStage = ['auth/2fa/status/route.ts', 'auth/2fa/enroll/start/route.ts', 'auth/2fa/enroll/confirm/route.ts', 'auth/2fa/verify/route.ts'];
  for (const path of [...open, ...challengeStage]) assert.ok(routes.includes(path), path);
  const guarded = routes.filter(path => !open.includes(path) && !challengeStage.includes(path));
  assert.deepEqual(guarded, ['auth/2fa/disable/route.ts', 'auth/2fa/recovery-codes/route.ts', 'auth/2fa/replace/confirm/route.ts', 'auth/2fa/replace/start/route.ts', 'auth/me/route.ts', 'exports/route.ts'], 'a new admin route must be classified here');
  // Per handler, with comments removed: every exported method of a private route must run the guard itself.
  const code = path => read(new URL(path, root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const block = (source, from) => {
    let index = source.indexOf(')', from);
    index = source.indexOf('{', index);
    const start = index;
    for (let depth = 0; index < source.length; index += 1) {
      if (source[index] === '{') depth += 1;
      else if (source[index] === '}' && (depth -= 1) === 0) return source.slice(start, index + 1);
    }
    throw new Error('unbalanced function body');
  };
  const guardedDirectly = body => /^\{\s*return twoFactorRoute\(request, \w+, currentAdmin\)\s*\}$/.test(body)
    || /^\{\s*try \{\s*const admin = await currentAdmin\(request\)\s*\n?\s*(if \(!admin \|\| admin\.role !== "superadmin"\) return NextResponse\.json\([^\n]*status: 401|return NextResponse\.json\(admin \? \{ admin \} : \{ error: "Sign in required" \}, \{ status: admin \? 200 : 401)/.test(body);
  const methods = /export\s+async\s+function\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\s*\(/g;
  for (const path of routes) {
    const source = code(path);
    // Handlers are only ever declared as `export async function METHOD(`, so the scan below sees all of them.
    assert.doesNotMatch(source, /export\s+(default|\*|\{|(const|let|var|function)\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b)/, path);
    assert.ok([...source.matchAll(methods)].length > 0, path);
  }
  for (const path of guarded) {
    const source = code(path);
    assert.match(source, /import \{[^}]*\bcurrentAdmin\b[^}]*\} from "@\/lib\/admin-auth"/, path);
    for (const handler of source.matchAll(methods)) {
      const body = block(source, handler.index);
      // A handler may hand over to one local function; then that function must start with the guard.
      const delegated = body.match(/^\{\s*return (\w+)\(request, (?:true|false)\)\s*\}$/);
      const local = delegated ? source.search(new RegExp('async function ' + delegated[1] + '\\(')) : -1;
      assert.ok(delegated ? local >= 0 && guardedDirectly(block(source, local)) : guardedDirectly(body), path + ' ' + handler[1] + ' must call currentAdmin before anything else');
    }
  }
  // The check itself notices an unguarded handler and a guard that is only mentioned in a comment.
  assert.ok(!guardedDirectly('{ return twoFactorRoute(request, disable) }'));
  assert.ok(!guardedDirectly(block('export async function GET(request) { /* await currentAdmin(request) */ return run(request) }'.replace(/\/\*[\s\S]*?\*\//g, ''), 0)));
  for (const path of routes.filter(path => path.startsWith('auth/2fa/'))) {
    const source = read(new URL(path, root), 'utf8');
    assert.match(source, /return twoFactorRoute\(request, \w+(, currentAdmin)?\)/, path);
    assert.match(source, /export const dynamic = "force-dynamic"/, path);
    assert.equal(/export async function POST/.test(source), path !== 'auth/2fa/status/route.ts', path);
  }
  const auth = read(new URL('../lib/admin-auth.ts', import.meta.url), 'utf8');
  // The guard and the 2FA frame share one same-origin rule, and the password step opens no session.
  assert.match(auth, /if \(guard && !\(await guard\(request\)\)\) throw loginRequired\(\)/);
  assert.match(auth, /sameOrigin: sameOrigin\(request\) && /);
  assert.match(auth, /return sessionAdmin\(twoFactorContext\(\), token\)/);
  assert.match(auth, /return twoFactorResponse\(await begin\(twoFactorContext\(\)\)\)/);
  assert.doesNotMatch(auth, /createHmac|session_key\)|admin: \{ username/, 'admin-auth must not sign or issue session cookies itself');
  const exportsRoute = read(new URL('exports/route.ts', root), 'utf8');
  assert.match(exportsRoute, /if \(start && !sameOrigin\(request\)\)/);
  const core = read(new URL('../lib/admin-totp.mjs', import.meta.url), 'utf8') + read(new URL('../lib/admin-totp-store.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(core, /console\.(log|info|debug|warn)\(/);
  assert.deepEqual([...core.matchAll(/console\.error\(([^)]*)\)/g)].map(match => match[1]), ['"admin two-factor storage error: " + error.reason']);
});


test('shared provisioning reuses the same code with separate encryption and replay state', async () => {
  const first = site(); const second = site({KANSAS_ADMIN_TOTP_KEY: '29'.repeat(32)});
  first.ctx.sharedProvisioningRequired = second.ctx.sharedProvisioningRequired = true;
  const raw = Buffer.from('12345678901234567890');
  const transfer = {schema: 'future-wells-seo-shared-totp/1', credential_id: 'a'.repeat(64), secret_hex: raw.toString('hex')};
  const secret = new OTPAuth.Secret({buffer: Uint8Array.from(raw).buffer}).base32;
  assert.equal((await outcome(begin(first.ctx))).code, 'shared_authenticator_required');
  assert.equal((await importSharedAuthenticator(first.ctx, 'owner', transfer)).changed, true);
  assert.equal((await importSharedAuthenticator(second.ctx, 'owner', transfer)).changed, true);
  const a = (await readState(first.file)).accounts.owner.active;
  const b = (await readState(second.file)).accounts.owner.active;
  assert.notEqual(a.ciphertext, b.ciphertext); assert.notEqual(a.nonce, b.nonce);
  assert.ok(!readFileSync(first.file, 'utf8').includes(transfer.secret_hex));
  const code = codeAt(secret, first.nowMs);
  for (const s of [first, second]) {
    const challenge = await passwordStep(s, 'verify');
    const verified = await post(s, verify, {challenge}, {code});
    assert.equal(verified.code, 'ok');
    const session = verified.session.token;
    for (const action of [replaceStart, replaceConfirm, disable])
      assert.equal((await post(s, action, {session}, {password: PASSWORD, code})).code, 'shared_authenticator_managed');
    assert.equal((await status(s.ctx, {session})).body.two_factor.shared_authenticator, true);
    const repeat = await passwordStep(s, 'verify');
    assert.equal((await post(s, verify, {challenge: repeat}, {code})).code, 'code_already_used');
  }
  assert.equal((await importSharedAuthenticator(first.ctx, 'owner', transfer)).changed, false);
  const challenge = await passwordStep(first, 'verify');
  assert.equal((await post(first, verify, {challenge}, {code})).code, 'code_already_used');
});

test('shared import refuses wrong account, unknown fields, and a different existing factor', async () => {
  const s = site(); s.ctx.sharedProvisioningRequired = true;
  const transfer = {schema: 'future-wells-seo-shared-totp/1', credential_id: 'b'.repeat(64), secret_hex: '42'.repeat(20)};
  await assert.rejects(importSharedAuthenticator(s.ctx, 'somebody-else', transfer), error => error.code === 'unauthorized');
  await assert.rejects(importSharedAuthenticator(s.ctx, 'owner', {...transfer, extra: true}));
  await importSharedAuthenticator(s.ctx, 'owner', transfer);
  const before = readFileSync(s.file, 'utf8');
  await assert.rejects(importSharedAuthenticator(s.ctx, 'owner', {...transfer, secret_hex: '63'.repeat(20)}), error => error.code === 'already_enrolled');
  await assert.rejects(importSharedAuthenticator(s.ctx, 'owner', {...transfer, credential_id: 'c'.repeat(64)}), error => error.code === 'already_enrolled');
  assert.equal(readFileSync(s.file, 'utf8'), before);
});


test('Rust-exported RFC6238 seed accepts the same six-digit code in Kansas', async () => {
  const s = site(); s.ctx.sharedProvisioningRequired = true; s.nowMs = 59000;
  await importSharedAuthenticator(s.ctx,'owner', {schema:'future-wells-seo-shared-totp/1',credential_id:'d'.repeat(64),secret_hex:Buffer.from('12345678901234567890').toString('hex')});
  const challenge = await passwordStep(s,'verify');
  assert.equal((await post(s,verify,{challenge},{code:'287082'})).code,'ok');
});
