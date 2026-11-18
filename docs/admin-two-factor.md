# Admin two-factor sign-in (authenticator app)

The private Kansas admin area (`/app/admin/**`, `/api/admin/**`) requires a password **and**
a time-based one-time code (TOTP, RFC 6238) from an authenticator app such as Google
Authenticator, 1Password, Authy or Microsoft Authenticator. Public pages and the public
`/api/ks/*` data API are unaffected. There is no Firebase or Google Cloud dependency.

Kansas differs from the other regional sites: admin authentication runs inside the Next.js
server and there is no admin database. The second factor therefore keeps its state in one
JSON file. Behaviour, endpoints, JSON shapes, error codes and limits match the shared Rust
module the other backends use (`admin_totp.rs`), and the browser screens are the shared
`components/future/AdminTwoFactor.tsx`.

| Item | Value for this site |
|---|---|
| Secret-encryption key | `KANSAS_ADMIN_TOTP_KEY` (64 hex characters = 32 bytes) |
| First-enrollment code | `KANSAS_ADMIN_TOTP_ENROLLMENT_CODE` (at least 16 characters; absent = enrollment closed) |
| State file path | `KANSAS_ADMIN_TOTP_STATE_FILE` (absolute path, required, no default) |
| Where the variables live (production) | `/etc/future-wells-ks/web-secrets.env`, the `EnvironmentFile` of `future-wells-ks-web.service` (root-owned, group `fw-ks-runtime`, mode 0640). Never in Git. |
| State file (production) | `/var/lib/future-wells-ks/web-data/admin-totp/state.json` — `web-data` is owned by `fw-ks-runtime` (0700) and is one of the few paths the sealed web service may write. The server creates the `admin-totp` directory (0700) and the file (0600) itself. |
| Local development | the three variables in the untracked `.env`; any absolute path you can write, for example under `~/.local/state/` |
| Account and password | unchanged: `KANSAS_ADMIN_CREDENTIALS_FILE`, provisioned by the backend's `scripts/state-sync/initialize_kansas_admin.py` |
| Owner reset | `scripts/admin-totp-reset.mjs --username <admin username>` |
| Code | `lib/admin-totp.mjs` (rules), `lib/admin-totp-store.mjs` (state file), `lib/admin-auth.ts` (cookies, HTTP), `app/api/admin/auth/2fa/*` |

Do not put the state file inside the release tree (it is read-only and replaced on every
release) or under `/var/cache/future-wells-ks/<commit>` (per release, so every promotion
would lose the authenticator).

## How it works

1. `POST /api/admin/auth/login` checks origin, the login rate limit, the CAPTCHA and the
   password exactly as before, but it **no longer signs in**. It sets a 10-minute HttpOnly
   challenge cookie (`fw_ks_admin_2fa`, sent only to `/api/admin/auth/*`) and answers
   `{"two_factor":{"required":true,"state":"verify"|"enroll"}}`.
2. `POST /api/admin/auth/2fa/verify` (authenticator code or one recovery code) or, for a
   first enrollment, `POST /api/admin/auth/2fa/enroll/start` + `/enroll/confirm` completes
   the sign-in and sets the session cookie `fw_ks_admin`.
3. The session cookie is still stateless and signed with the account's `session_key`, but
   its payload now carries an explicit second-factor marker and its issue time, and the
   signature covers the cookie's purpose. The one admin guard (`currentAdmin`, used by
   `/api/admin/auth/me`, `/api/admin/exports` and the authenticator-management routes)
   accepts a cookie only if it has the marker, the account has an active authenticator and
   the cookie was issued at or after the account's `sessions_valid_after` time in the state
   file. Enrolling an authenticator moves that time to the moment of enrollment, so no cookie
   from before the authenticator became active is accepted, even if the state file was lost
   in between. Every cookie issued by the release before two-factor is refused, and a challenge
   cookie can never be used as a session (or the other way round).

Other endpoints (all JSON, `Cache-Control: private, no-store`, same-origin enforced on every
POST): `GET /api/admin/auth/2fa/status`, and for a signed-in admin
`POST .../2fa/replace/start`, `.../replace/confirm`, `.../recovery-codes`, `.../disable`.
Errors are `{"error":{"code","message"}}`. Request bodies must declare a Content-Length of at
most 4096 bytes and are read with that cap (otherwise 413).

`POST /api/admin/auth/logout` clears both cookies and, for a valid session, moves
`sessions_valid_after` forward, so a copy of the cookie stops working. Sessions are stateless,
so this signs the account out in every browser, not only the one that clicked *Sign out*.

Protections: each account has its own random 160-bit secret, stored AES-256-GCM encrypted
and bound to the username; a code is accepted once (the accepted time step is recorded, so a
replayed or older code is refused; one step of clock drift either way is tolerated); 5
second-factor attempts per account per 15 minutes, then HTTP 429; a challenge allows 8
requests, expires after 10 minutes and ends when it is used or a new password step starts;
recovery codes are single-use and stored only as SHA-256 hashes; secrets, QR contents,
codes and recovery codes are never logged. If `KANSAS_ADMIN_TOTP_KEY` or
`KANSAS_ADMIN_TOTP_STATE_FILE` is missing or malformed, or the state file cannot be read or
written, sign-in fails closed with HTTP 503 (`two_factor_unavailable`); a damaged state file
is never silently replaced by an empty one.

### The state file and the single-process assumption

The file holds, per username: the encrypted active (and pending) secret, the last accepted
time step, recovery-code hashes with their used time, the attempt window,
`sessions_valid_after`, and the open sign-in challenges (hashed ids, attempt counts). It
contains no plaintext secret, code or password, but treat it as sensitive: mode 0600, owned
by the web process user.

Every change is a read-modify-write that holds an in-process queue **and** an exclusive
lock file beside the state file (`state.json.lock`, created with `O_EXCL`, holding the
owner's pid), and replaces the file atomically (temporary file in the same directory, fsync,
rename). The file is re-read for every request, never cached in memory, and validated field
by field: a file that is not exactly what this code writes (an account that is not an
object, `"active": true`, a junk challenge, an unknown field) is refused with 503 rather
than read as "not enrolled" or "enrolled". The lock is waited for at most 5 seconds (then
503); a lock older than 15 seconds, or older than 2 seconds whose owning process is gone, is
treated as abandoned and taken over. Left-over temporary files older than a minute are
removed on the next write.

Kansas runs one Next server process: `scripts/start-security-web.sh` executes a single
`next start` under one systemd service. The lock file makes the occasional second process
safe — the owner reset script, and the loopback-only preview process that
`seo_ks_isolation.py --promote`/`--rollback` starts for a short time with the same
environment and state file — so neither can overwrite an update of the serving process. It
is not a design for several permanent workers: do not run the admin area in cluster mode,
under PM2 instances or as a second service without moving this state to a real database.

## Owner setup (once)

Run on the host as root; do not paste the values anywhere else.

```bash
openssl rand -hex 32        # value for KANSAS_ADMIN_TOTP_KEY
openssl rand -base64 24     # value for KANSAS_ADMIN_TOTP_ENROLLMENT_CODE
```

Append to `/etc/future-wells-ks/web-secrets.env` (keep owner root, group `fw-ks-runtime`,
mode 0640, and keep the existing Turnstile lines):

```
KANSAS_ADMIN_TOTP_KEY=<64 hex characters>
KANSAS_ADMIN_TOTP_ENROLLMENT_CODE=<enrollment code>
KANSAS_ADMIN_TOTP_STATE_FILE=/var/lib/future-wells-ks/web-data/admin-totp/state.json
```

The web service reads the file when it starts, so the values take effect with the next
promotion or a restart of `future-wells-ks-web.service`. Keep a copy of
`KANSAS_ADMIN_TOTP_KEY` in the owner's password manager: without it the stored secret cannot
be decrypted and the admin must be reset and enrolled again.

## Onboarding the administrator

1. The owner gives the admin the enrollment code over a trusted channel (not together with
   the password, not ClickUp).
2. The admin signs in at `/app/admin` with username and password, enters the enrollment
   code, scans the QR code (or types the setup key) into the authenticator app and enters
   the 6-digit code the app shows. Two-factor sign-in is only switched on by that valid code.
3. The page shows ten recovery codes **once**. The admin stores them in a password manager.
4. The owner then removes `KANSAS_ADMIN_TOTP_ENROLLMENT_CODE` from
   `/etc/future-wells-ks/web-secrets.env` and restarts the web service. With the variable
   absent nobody can enroll: knowing the password alone can never register a second factor.
   Issue a fresh code the next time someone must enroll.

An account that already has an authenticator cannot be enrolled again, with or without the
enrollment code.

## Changing or removing an authenticator

Signed-in admins use `/app/admin/security` (linked as *Sign-in security* in the console).
Every action asks for the current password and a current authenticator or recovery code:

- **Replace authenticator** – the old one keeps working until a code from the new one is
  accepted; then every other session is signed out (this browser receives a new session
  cookie) and new recovery codes are issued.
- **New recovery codes** – the previous set stops working.
- **Remove authenticator** – two-factor sign-in stays mandatory, so this signs the account
  out everywhere and the next sign-in needs a new enrollment code from the owner.

## Recovery

| Situation | What to do |
|---|---|
| Phone lost, recovery codes available | Sign in with password + one recovery code, then *Replace authenticator*. |
| Locked out after wrong codes | Wait 15 minutes. |
| Phone and recovery codes lost | Owner runs the reset script (below), sets a new `KANSAS_ADMIN_TOTP_ENROLLMENT_CODE`, restarts the web service; the admin enrolls again. |
| `KANSAS_ADMIN_TOTP_KEY` lost or rotated | The stored secret is unreadable (sign-in answers 503). Set the new key, run the reset script, enroll again. |
| State file lost or deleted | Nobody is signed in any more and the account is back to "needs enrollment". Set an enrollment code and enroll again. |
| State file damaged (sign-in answers 503) | Move the file aside (keep it for inspection), then proceed as for a lost file. |
| Password also lost | Rotate it with the backend's `initialize_kansas_admin.py` and install the new credentials file. That issues a new `session_key`, so every session ends; it does not remove the second factor, which is bound to the username. A changed username has no authenticator and must enroll. |

### Reset script

The reset removes the account's authenticator, pending setup, recovery codes, attempt window
and open sign-in steps, and moves `sessions_valid_after` forward so every existing session
cookie is refused. It needs neither the encryption key nor the password and prints no secret.

Who runs it: the site owner, on the host, **as the web runtime user `fw-ks-runtime`**, from
a root shell. The script refuses to run as uid 0, because the state file must stay owned by
the runtime user (mode 0600); the deployment account cannot do it, since it can neither read
the runtime's state directory nor use sudo for anything but the fixed isolation helper. Run
the copy inside the root-sealed serving release (`seo_ks_isolation.py --status` names the
serving API and web commits):

```bash
cd /srv/future-wells/ks/releases/<api commit>-<web commit>/frontend
runuser -u fw-ks-runtime -- env KANSAS_ADMIN_TOTP_STATE_FILE=/var/lib/future-wells-ks/web-data/admin-totp/state.json \
  /usr/bin/node scripts/admin-totp-reset.mjs --username <admin username>
```

It takes the same lock as the running server, so it is safe while the site is serving. It
answers with one line saying what was removed; an unknown username changes nothing and exits
with status 1.

Locally, run it without `runuser`, from the repository, as the user that runs `next dev`/`next start`.
The running server needs no restart: it re-reads the file on every request.

## Rollout and rollback

1. Commit and push; build, stage and promote the web release through the normal procedure in
   `deploy/SECURITY_RELEASE.txt`. No backend or database change is involved.
2. **Before promoting**, add `KANSAS_ADMIN_TOTP_KEY`, `KANSAS_ADMIN_TOTP_ENROLLMENT_CODE` and
   `KANSAS_ADMIN_TOTP_STATE_FILE` to `/etc/future-wells-ks/web-secrets.env` (owner, root).
   The release that is still serving ignores them. If they are missing when the new release
   starts, public pages work but every admin sign-in answers 503.
3. Promote. From this moment every existing admin session cookie is refused (it has no
   second-factor marker), so the admin is asked to sign in again.
4. The owner signs in, enrolls, stores the recovery codes, checks `/app/admin/exports` and
   `/app/admin/security`, signs out and in again with a fresh code, then removes the
   enrollment code from the environment file and restarts the web service.

Rollback: `sudo -n /usr/local/libexec/seo_ks_isolation.py --rollback` returns to the previous
sealed release. That release knows nothing about the state file or the new variables and
signs admins in with password only again; it does not accept the new release's session
cookies, so the admin signs in once more. Rolling forward afterwards refuses every cookie
issued during the rollback window, and the enrolled authenticator still works because the
state file and the key are untouched.

## Tests

```bash
npm run test:admin-2fa
```

`tests/admin-totp.test.mjs` runs the scenario suite with an injected clock and a temporary
state file: enrollment (closed without the owner code, wrong code, enabled only by a valid
code), login, recovery-code single use, code replay and older steps, rate limiting,
challenge expiry and attempt cap, reauthentication for replace/new codes/remove, session
revocation, the reset script, refusal of pre-two-factor and challenge cookies as sessions,
wrong key and wrong account, malformed state files, concurrent double spend, two processes
writing at once and abandoned locks, sign-out revocation, and a per-handler source check that
every `/api/admin` route outside the sign-in steps starts with the signed-in-session guard.
`tests/admin-auth-http.test.mjs` calls the real route handlers with request objects (no
server, CAPTCHA provider stubbed): origin and `Sec-Fetch-Site` refusals, body-size limits,
cookie attributes on the password step, verification and logout, and the 429 on
reauthentication.
`tests/admin-two-factor.test.mjs` covers the shared screen helpers and the login hand-over.
