import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {twoFactorStep, codeKind, normalizeCode, groupSetupKey, qrImageSource, mustRestart} from '../lib/admin-two-factor.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('a password response never counts as signed in without a second step', () => {
  assert.equal(twoFactorStep({two_factor: {required: true, state: 'verify'}}), 'verify');
  assert.equal(twoFactorStep({two_factor: {required: true, state: 'enroll'}}), 'enroll');
  for (const body of [null, undefined, '', {}, {user: {role: 'superadmin'}}, {two_factor: null}, {two_factor: {required: false, state: 'verify'}}, {two_factor: {required: true, state: 'active'}}, {two_factor: {required: 'true', state: 'verify'}}])
    assert.equal(twoFactorStep(body), null, JSON.stringify(body));
});

test('authenticator and recovery codes are recognised, anything else is refused before sending', () => {
  assert.equal(codeKind('123456'), 'authenticator');
  assert.equal(codeKind(' 123 456 '), 'authenticator');
  assert.equal(codeKind('abcd-efgh-jkmn-pqrs'), 'recovery');
  assert.equal(normalizeCode('abcd-efgh jkmn-pqrs'), 'ABCDEFGHJKMNPQRS');
  for (const input of ['', '12345', '1234567', '12345a', 'ABCD-EFGH-JKMN-PQR', 'ABCD-EFGH-JKMN-PQR0', null, 123456]) assert.equal(codeKind(input), null, String(input));
});

test('setup key and QR image are display-only and reject unexpected content', () => {
  assert.equal(groupSetupKey('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
  assert.equal(groupSetupKey('<b>'), '');
  const svg = '<?xml version="1.0" standalone="yes"?><svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';
  assert.ok(qrImageSource(svg).startsWith('data:image/svg+xml;charset=utf-8,%3C%3Fxml'));
  for (const bad of ['', null, 'javascript:alert(1)', '<html><script>1</script></html>', '<svg><script>alert(1)</script></svg>', '<svg onload="x()"></svg>', '<svg><foreignObject/></svg>'])
    assert.equal(qrImageSource(bad), '', String(bad));
  assert.ok(mustRestart('challenge_expired') && mustRestart('unauthorized'));
  assert.ok(!mustRestart('invalid_code') && !mustRestart('too_many_attempts'));
});

test('the login form only enters the admin area through the second factor', () => {
  const login = read('components/admin/AdminConsole.tsx');
  assert.match(login, /twoFactorStep\(/);
  assert.match(login, /<AdminTwoFactor /);
  assert.match(login, /apiBase="\/api\/admin\/auth\/2fa\/"/);
  assert.doesNotMatch(login, /window\.location\.assign\(|router\.(replace|push)\(/, 'the password form must not navigate into the admin area itself');
  // The password response is never treated as signed in: the admin state only comes from /api/admin/auth/me.
  const signIn = login.slice(login.indexOf('async function signIn'), login.indexOf('async function exportPackage'));
  assert.match(signIn, /setSecondStep\(step\)/);
  assert.doesNotMatch(signIn, /setAdmin\(/);
  assert.doesNotMatch(login, /data\.admin/);
  const security = read('components/admin/AdminSecurity.tsx') + read('app/app/admin/security/page.tsx');
  assert.match(security, /<AdminSecuritySettings apiBase="\/api\/admin\/auth\/2fa\/"/);
  assert.match(security, /\/api\/admin\/auth\/me/);
  assert.match(security, /robots: \{ index: false, follow: false \}/);
  assert.match(read('components/admin/AdminWorkspace.tsx'), /href="\/app\/admin\/security"/);
  const flow = read('components/future/AdminTwoFactor.tsx');
  for (const path of ['verify', 'enroll/start', 'enroll/confirm', 'replace/start', 'replace/confirm', 'recovery-codes', 'disable']) {
    assert.ok(flow.includes(`call("${path}"`), path);
    assert.ok(existsSync(new URL('../app/api/admin/auth/2fa/' + path + '/route.ts', import.meta.url)), path);
  }
  assert.ok(existsSync(new URL('../app/api/admin/auth/2fa/status/route.ts', import.meta.url)));
  assert.doesNotMatch(flow, /dangerouslySetInnerHTML|console\.|localStorage|sessionStorage/, 'secrets, QR contents and recovery codes stay out of markup injection, logs and storage');
  assert.match(flow, /shown only this one time/);
});
