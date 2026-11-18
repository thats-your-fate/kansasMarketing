/**
 * Authenticator-app (TOTP, RFC 6238) second factor for the Kansas admin area.
 *
 * Kansas authenticates inside the Next server with no database, so this is the Kansas
 * counterpart of the shared Rust module the other regional backends use (`admin_totp.rs`).
 * It keeps the same browser contract: endpoints, JSON shapes, error codes and limits.
 *
 * Flow: the password login never signs in. After the password (and CAPTCHA) check it calls
 * `begin`, which issues a short-lived challenge cookie. A session cookie is created only by
 * `verify` or `enrollConfirm`, and it carries an explicit second-factor marker; cookies
 * without it (everything issued before this release) are never accepted.
 *
 * Everything here is plain functions over a context `{env, now, account, verifyPassword}`,
 * so it is tested without Next. Nothing here logs secrets, QR contents, codes or recovery codes.
 */
import {createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual} from "node:crypto"
import * as OTPAuth from "otpauth"
import QRCode from "qrcode"
import {StateUnavailable, accountOf, readState, removeSecondFactor, revokeSessions, stateFilePath, withState} from "./admin-totp-store.mjs"

export const KEY_ENV = "KANSAS_ADMIN_TOTP_KEY"
export const ENROLLMENT_ENV = "KANSAS_ADMIN_TOTP_ENROLLMENT_CODE"
export const ISSUER = "Future Wells Kansas"
/** Lifetime of a signed-in session. */
export const SESSION_SECONDS = 8 * 60 * 60
/** Lifetime of the password-verified, second-factor-pending challenge. */
export const CHALLENGE_SECONDS = 600
/** Requests one challenge may spend before the password step must be repeated. */
const CHALLENGE_ATTEMPTS = 8
/** Second-factor attempts allowed per account inside one window. */
const LIMIT_ATTEMPTS = 5
const LIMIT_WINDOW_SECONDS = 900
const RECOVERY_CODES = 10
const RECOVERY_CODE_LENGTH = 16
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const ENROLLMENT_CODE_MIN_LENGTH = 16
const TOTP_PERIOD_SECONDS = 30
/** Domain separation for the secret's associated data and the recovery-code hashes. */
const PREFIX = "ks_admin_totp"
const SECOND_FACTOR_MARKER = "totp"

export class TwoFactorFailure extends Error {
  constructor(status, code, message, retryAfter = null) {
    super(message)
    this.name = "TwoFactorFailure"
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
    // A refused attempt has already been counted in the state and must be written.
    this.persist = true
  }
}

const failure = (status, code, message, retryAfter) => () => new TwoFactorFailure(status, code, message, retryAfter)
const UNCONFIGURED = failure(503, "two_factor_unavailable", "Two-factor authentication is not configured. Sign-in is unavailable.")
const STORAGE = failure(503, "two_factor_unavailable", "Two-factor authentication is temporarily unavailable.")
const CHALLENGE_REQUIRED = failure(401, "challenge_expired", "Sign in with your password again.")
const LOGIN_REQUIRED = failure(401, "unauthorized", "admin login required")
const INVALID_CODE = failure(401, "invalid_code", "That code is not valid.")
const CODE_REUSED = failure(401, "code_already_used", "That code was already used. Wait for the next code.")
const REAUTH_FAILED = failure(401, "reauthentication_failed", "Password or code is not valid.")
const ENROLLMENT_REQUIRED = failure(409, "enrollment_required", "This account has no authenticator yet.")
const ALREADY_ENROLLED = failure(409, "already_enrolled", "This account already has an authenticator.")
const ENROLLMENT_CLOSED = failure(403, "enrollment_closed", "Authenticator enrollment is not open. Ask the site owner for an enrollment code.")
const ENROLLMENT_DENIED = failure(403, "invalid_enrollment_code", "That enrollment code is not valid.")
const ENROLLMENT_NOT_STARTED = failure(403, "enrollment_not_started", "Start authenticator setup again.")
const CROSS_ORIGIN = failure(403, "cross_origin", "same-origin authentication request required")
const TOO_MANY_ATTEMPTS = failure(429, "too_many_attempts", "Too many attempts. Try again later.", LIMIT_WINDOW_SECONDS)

/** The storage failure the HTTP layer answers with when something unexpected is thrown. */
export function unavailable() {
  return STORAGE()
}

/** The answer for a request without a valid, second-factor-verified session. */
export function loginRequired() {
  return LOGIN_REQUIRED()
}

// ---------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex")
}

function digestsEqual(left, right) {
  return timingSafeEqual(createHash("sha256").update(String(left)).digest(), createHash("sha256").update(String(right)).digest())
}

function text(value) {
  return typeof value === "string" ? value : ""
}

/** Only strings are taken from the request body; everything else counts as absent. */
function inputOf(raw) {
  const source = raw !== null && typeof raw === "object" ? raw : {}
  return {code: text(source.code), password: text(source.password), enrollment_code: text(source.enrollment_code)}
}

function bounded(input) {
  return input.code.length <= 64 && input.password.length <= 512 && input.enrollment_code.length <= 256
}

function ok(body, cookies = {}) {
  return {status: 200, body, session: cookies.session, challenge: cookies.challenge}
}

function sameOrigin(request) {
  if (request?.sameOrigin !== true) throw CROSS_ORIGIN()
}

/** Storage problems become the fail-closed 503; they carry no secret, path or code. */
async function guarded(action) {
  try {
    return await action()
  } catch (error) {
    if (error instanceof StateUnavailable) {
      console.error("admin two-factor storage error: " + error.reason)
      throw STORAGE()
    }
    throw error
  }
}

// ---------------------------------------------------------------------------------------
// Signed cookies: session and challenge are different purposes and never interchangeable
// ---------------------------------------------------------------------------------------

function signature(purpose, payload, key) {
  if (typeof key !== "string" || key.length < 32) throw UNCONFIGURED()
  // The purpose is part of the signed text, so one kind of cookie never verifies as another,
  // and nothing signed by the pre-2FA release (which signed the bare payload) verifies at all.
  return createHmac("sha256", key).update("fw_ks_admin:v2:" + purpose + ":" + payload).digest("base64url")
}

function encodeToken(purpose, claims, key) {
  const payload = Buffer.from(JSON.stringify({...claims, purpose})).toString("base64url")
  return payload + "." + signature(purpose, payload, key)
}

function decodeToken(purpose, token, key) {
  if (typeof token !== "string" || !token || token.length > 2048) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const expected = Buffer.from(signature(purpose, parts[0], key))
  const given = Buffer.from(parts[1])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"))
    return claims !== null && typeof claims === "object" && claims.purpose === purpose ? claims : null
  } catch {
    return null
  }
}

/** Validates a session cookie against the account and the state; returns `{sid}` or null. */
function checkSession(account, state, token, nowMs) {
  const claims = decodeToken("session", token, account.session_key)
  if (!claims) return null
  // Explicit marker: only a cookie issued after a completed second factor is a session.
  if (claims.second_factor !== SECOND_FACTOR_MARKER) return null
  if (claims.username !== account.username || typeof claims.sid !== "string") return null
  if (!Number.isFinite(claims.expires) || !Number.isFinite(claims.issued_at)) return null
  if (claims.expires * 1000 <= nowMs || claims.expires - Math.floor(claims.issued_at / 1000) > SESSION_SECONDS) return null
  const entry = state.accounts[account.username]
  // No active authenticator (removed, reset, state lost) means no valid session.
  if (!entry?.active) return null
  if (claims.issued_at < (entry.sessions_valid_after || 0)) return null
  return {sid: claims.sid}
}

function issueSession(account, entry, nowMs) {
  const issuedAt = Math.max(nowMs, entry.sessions_valid_after || 0)
  entry.last_session_issued_at = Math.max(issuedAt, entry.last_session_issued_at || 0)
  const sid = randomBytes(16).toString("hex")
  const token = encodeToken("session", {
    username: account.username, sid, issued_at: issuedAt,
    expires: Math.floor(nowMs / 1000) + SESSION_SECONDS, second_factor: SECOND_FACTOR_MARKER,
  }, account.session_key)
  return {token, maxAge: SESSION_SECONDS}
}

// ---------------------------------------------------------------------------------------
// Secret encryption and code checks
// ---------------------------------------------------------------------------------------

function encryptionKey(env) {
  const raw = text(env?.[KEY_ENV]).trim()
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) throw UNCONFIGURED()
  return Buffer.from(raw, "hex")
}

function associatedData(username) {
  return Buffer.from(PREFIX + ":" + username)
}

function seal(key, username, secret) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, nonce)
  cipher.setAAD(associatedData(username))
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final(), cipher.getAuthTag()])
  return {nonce: nonce.toString("base64"), ciphertext: ciphertext.toString("base64")}
}

function open(key, username, sealed) {
  try {
    const nonce = Buffer.from(text(sealed?.nonce), "base64")
    const data = Buffer.from(text(sealed?.ciphertext), "base64")
    if (nonce.length !== 12 || data.length !== 20 + 16) throw new Error("shape")
    const decipher = createDecipheriv("aes-256-gcm", key, nonce)
    decipher.setAAD(associatedData(username))
    decipher.setAuthTag(data.subarray(data.length - 16))
    return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()])
  } catch {
    // Wrong key, a secret moved to another account, or a damaged file: fail closed.
    throw UNCONFIGURED()
  }
}

function authenticator(secret, label) {
  const account = Array.from(label, character => (character === ":" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? "-" : character)).join("")
  return new OTPAuth.TOTP({
    issuer: ISSUER, label: account, algorithm: "SHA1", digits: 6, period: TOTP_PERIOD_SECONDS,
    secret: new OTPAuth.Secret({buffer: Uint8Array.from(secret).buffer}),
  })
}

/** The time step `code` matches (current step, or one either side), or null. */
function matchingStep(totp, code, nowMs) {
  const delta = totp.validate({token: code, timestamp: nowMs, window: 1})
  return delta === null ? null : Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS) + delta
}

function normalized(input) {
  return input.replace(/[\s-]/g, "").toUpperCase()
}

function isTotpCode(code) {
  return /^[0-9]{6}$/.test(code)
}

function isRecoveryCode(code) {
  return code.length === RECOVERY_CODE_LENGTH && Array.from(code).every(character => RECOVERY_ALPHABET.includes(character))
}

function recoveryHash(username, code) {
  return sha256Hex(PREFIX + ":" + username + ":" + code)
}

function newRecoveryCodes() {
  return Array.from({length: RECOVERY_CODES}, () => Array.from(randomBytes(RECOVERY_CODE_LENGTH), byte => RECOVERY_ALPHABET[byte & 31]).join(""))
}

function displayRecoveryCode(code) {
  return code.match(/.{1,4}/g).join("-")
}

function storeRecoveryCodes(username, entry, codes) {
  entry.recovery_codes = codes.map(code => ({hash: recoveryHash(username, code), used_at: null}))
  return codes.map(displayRecoveryCode)
}

function remainingRecoveryCodes(entry) {
  return (entry?.recovery_codes || []).filter(item => item.used_at === null).length
}

/** Checks and consumes one second-factor credential for an enrolled account. */
function consumeFactor(key, username, entry, input, nowMs) {
  const code = normalized(input)
  if (isTotpCode(code)) {
    if (!entry.active) throw INVALID_CODE()
    const step = matchingStep(authenticator(open(key, username, entry.active), "admin"), code, nowMs)
    if (step === null) throw INVALID_CODE()
    // A time step is accepted once, and only a strictly newer step than the last accepted one.
    if (!(step > (entry.active.last_used_step || 0))) throw CODE_REUSED()
    entry.active.last_used_step = step
    return "authenticator"
  }
  if (isRecoveryCode(code)) {
    const hash = recoveryHash(username, code)
    const item = (entry.recovery_codes || []).find(candidate => candidate.used_at === null && digestsEqual(candidate.hash, hash))
    if (!item) throw INVALID_CODE()
    item.used_at = nowMs
    return "recovery"
  }
  throw INVALID_CODE()
}

// ---------------------------------------------------------------------------------------
// Rate limiting, challenges and pending secrets
// ---------------------------------------------------------------------------------------

/** Counts one second-factor attempt for the account and rejects it when over the limit. */
function countAttempt(entry, nowMs) {
  if (!entry.limit || entry.limit.window_start < nowMs - LIMIT_WINDOW_SECONDS * 1000) entry.limit = {window_start: nowMs, attempts: 1}
  else entry.limit.attempts += 1
  if (entry.limit.attempts > LIMIT_ATTEMPTS) throw TOO_MANY_ATTEMPTS()
}

function challengeRecord(account, state, token, nowMs) {
  const claims = decodeToken("challenge", token, account.session_key)
  if (!claims || typeof claims.id !== "string" || claims.username !== account.username) return null
  const hash = sha256Hex(claims.id)
  const record = state.challenges[hash]
  if (!record || record.username !== account.username || !(record.expires_at > nowMs) || !(record.attempts < CHALLENGE_ATTEMPTS)) return null
  return {hash, record}
}

/** Loads the caller's challenge and spends one of its attempts. */
function spendChallenge(account, state, token, nowMs) {
  const challenge = challengeRecord(account, state, token, nowMs)
  if (!challenge) throw CHALLENGE_REQUIRED()
  challenge.record.attempts += 1
  return challenge
}

function requireSession(account, state, token, nowMs) {
  const session = checkSession(account, state, token, nowMs)
  if (!session) throw LOGIN_REQUIRED()
  return session
}

/** Ends a challenge and creates the full, second-factor-verified session. */
function openSession(account, state, entry, challenge, body, nowMs) {
  delete state.challenges[challenge.hash]
  delete entry.limit
  return ok({...body, user: {username: account.username, role: account.role}}, {session: issueSession(account, entry, nowMs), challenge: null})
}

/** Stores a new not-yet-confirmed secret and returns what the authenticator app needs. */
async function createPending(key, username, entry, authorizedBy, nowMs) {
  const secret = randomBytes(20)
  const totp = authenticator(secret, username)
  const uri = totp.toString()
  const qrSvg = await QRCode.toString(uri, {type: "svg", width: 240, margin: 2, errorCorrectionLevel: "M"})
  entry.pending = {...seal(key, username, secret), authorized_by: authorizedBy, created_at: nowMs}
  return {secret: totp.secret.base32, otpauth_uri: uri, qr_svg: qrSvg, issuer: ISSUER, account: username}
}

/**
 * Confirms the pending secret with a valid code, makes it the active one and issues a fresh
 * set of recovery codes. Returns the plaintext codes for one-time display.
 */
function activatePending(key, username, entry, authorizedBy, input, nowMs) {
  const pending = entry.pending
  if (!pending || pending.authorized_by !== authorizedBy || !(pending.created_at > nowMs - CHALLENGE_SECONDS * 1000)) throw ENROLLMENT_NOT_STARTED()
  const code = normalized(input)
  if (!isTotpCode(code)) throw INVALID_CODE()
  const step = matchingStep(authenticator(open(key, username, pending), "admin"), code, nowMs)
  if (step === null) throw INVALID_CODE()
  entry.active = {nonce: pending.nonce, ciphertext: pending.ciphertext, last_used_step: step, enabled_at: nowMs}
  delete entry.pending
  return storeRecoveryCodes(username, entry, newRecoveryCodes())
}

/** Password plus current second factor, required before any authenticator change. */
async function reauthenticate(ctx, key, username, entry, input, nowMs) {
  countAttempt(entry, nowMs)
  if (!input.password || !(await ctx.verifyPassword(input.password))) throw REAUTH_FAILED()
  try {
    consumeFactor(key, username, entry, input.code, nowMs)
  } catch (error) {
    if (error instanceof TwoFactorFailure && error.status === 401 && error.code !== "code_already_used") throw REAUTH_FAILED()
    throw error
  }
  delete entry.limit
}

/** Shared frame of every state-changing endpoint: origin, bounds, key, then exclusive state access. */
function action(ctx, request, stage, oversized, change) {
  return guarded(async () => {
    sameOrigin(request)
    const input = inputOf(request.input)
    const account = await ctx.account()
    // A request without a correctly signed cookie of the right kind is refused here, before
    // any lock is taken or anything on disk is touched.
    if (!decodeToken(stage, stage === "challenge" ? request.challenge : request.session, account.session_key)) throw (stage === "challenge" ? CHALLENGE_REQUIRED : LOGIN_REQUIRED)()
    return withState(stateFilePath(ctx.env), async state => {
      const entry = accountOf(state, account.username)
      try {
        return await change({state, input, account, nowMs: ctx.now(), entry, tooLarge: () => { if (!bounded(input)) throw oversized() }})
      } finally {
        // A refused request must not leave an empty account record behind.
        if (Object.keys(entry).length === 0) delete state.accounts[account.username]
      }
    })
  })
}

// ---------------------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------------------

/**
 * Called by the password login once the password (and CAPTCHA) are verified. Issues the
 * second-factor challenge; it never creates a session. Fails closed (503) when the key or
 * the state file is missing, invalid or not writable.
 */
export function begin(ctx) {
  return guarded(async () => {
    encryptionKey(ctx.env)
    const account = await ctx.account()
    const nowMs = ctx.now()
    const id = randomBytes(32).toString("hex")
    const state = await withState(stateFilePath(ctx.env), current => {
      // Expired challenges and the account's earlier ones go, so the list stays bounded.
      for (const [hash, record] of Object.entries(current.challenges))
        if (!record || !(record.expires_at > nowMs) || record.username === account.username) delete current.challenges[hash]
      current.challenges[sha256Hex(id)] = {username: account.username, expires_at: nowMs + CHALLENGE_SECONDS * 1000, attempts: 0, enrollment_authorized: false}
      return current.accounts[account.username]?.active ? "verify" : "enroll"
    })
    // The expiry is enforced from the server-side record, so the cookie carries no claim of its own.
    const token = encodeToken("challenge", {username: account.username, id}, account.session_key)
    return ok({two_factor: {required: true, state}}, {challenge: {token, maxAge: CHALLENGE_SECONDS}})
  })
}

/** The signed-in admin behind a session cookie, or null. Read-only; used by every admin route. */
export function sessionAdmin(ctx, token) {
  return guarded(async () => {
    if (typeof token !== "string" || !token) return null
    const account = await ctx.account()
    const state = await readState(stateFilePath(ctx.env))
    return checkSession(account, state, token, ctx.now()) ? {username: account.username, role: account.role} : null
  })
}

export function status(ctx, request) {
  return guarded(async () => {
    const account = await ctx.account()
    const state = await readState(stateFilePath(ctx.env))
    const nowMs = ctx.now()
    const entry = state.accounts[account.username]
    const session = checkSession(account, state, request?.session, nowMs)
    if (session) {
      return ok({two_factor: {
        state: "active",
        recovery_codes_remaining: remainingRecoveryCodes(entry),
        replacement_pending: entry?.pending?.authorized_by === "session:" + session.sid,
      }})
    }
    if (!challengeRecord(account, state, request?.challenge, nowMs)) throw LOGIN_REQUIRED()
    return ok({two_factor: {required: true, state: entry?.active ? "verify" : "enroll"}})
  })
}

/**
 * Sign-out. A valid session is revoked on the server, so a copy of its cookie stops working
 * (sessions are stateless, so this ends every session of the account), and the browser's
 * pending sign-in challenge is dropped. Both cookies are cleared in every case.
 */
export function signOut(ctx, request) {
  return guarded(async () => {
    const cleared = ok({success: true}, {session: null, challenge: null})
    const account = await ctx.account()
    const session = decodeToken("session", request?.session, account.session_key)
    const challenge = decodeToken("challenge", request?.challenge, account.session_key)
    if (!session && !challenge) return cleared
    return withState(stateFilePath(ctx.env), state => {
      const nowMs = ctx.now()
      if (checkSession(account, state, request.session, nowMs)) revokeSessions(accountOf(state, account.username), nowMs)
      if (typeof challenge?.id === "string") delete state.challenges[sha256Hex(challenge.id)]
      return cleared
    })
  })
}

/** First enrollment, step 1: prove possession of the owner-issued enrollment code. */
export function enrollStart(ctx, request) {
  return action(ctx, request, "challenge", ENROLLMENT_DENIED, async ({state, input, account, nowMs, entry, tooLarge}) => {
    tooLarge()
    const key = encryptionKey(ctx.env)
    const challenge = spendChallenge(account, state, request.challenge, nowMs)
    if (entry.active) throw ALREADY_ENROLLED()
    const expected = text(ctx.env?.[ENROLLMENT_ENV]).trim()
    if (expected.length < ENROLLMENT_CODE_MIN_LENGTH) throw ENROLLMENT_CLOSED()
    countAttempt(entry, nowMs)
    if (!digestsEqual(expected, input.enrollment_code.trim())) throw ENROLLMENT_DENIED()
    delete entry.limit
    challenge.record.enrollment_authorized = true
    return ok({enrollment: await createPending(key, account.username, entry, "challenge:" + challenge.hash, nowMs)})
  })
}

/** First enrollment, step 2: a valid code from the new authenticator enables 2FA. */
export function enrollConfirm(ctx, request) {
  return action(ctx, request, "challenge", INVALID_CODE, ({state, input, account, nowMs, entry, tooLarge}) => {
    tooLarge()
    const challenge = spendChallenge(account, state, request.challenge, nowMs)
    if (!challenge.record.enrollment_authorized) throw ENROLLMENT_NOT_STARTED()
    if (entry.active) throw ALREADY_ENROLLED()
    countAttempt(entry, nowMs)
    const codes = activatePending(encryptionKey(ctx.env), account.username, entry, "challenge:" + challenge.hash, input.code, nowMs)
    // No cookie issued before this authenticator became active may ever be a session, even
    // if the state file (and with it an earlier revocation) was lost in between.
    revokeSessions(entry, nowMs)
    return openSession(account, state, entry, challenge, {recovery_codes: codes}, nowMs)
  })
}

/** Second login step for an enrolled account: authenticator code or one recovery code. */
export function verify(ctx, request) {
  return action(ctx, request, "challenge", INVALID_CODE, ({state, input, account, nowMs, entry, tooLarge}) => {
    tooLarge()
    const challenge = spendChallenge(account, state, request.challenge, nowMs)
    if (!entry.active) throw ENROLLMENT_REQUIRED()
    countAttempt(entry, nowMs)
    const factor = consumeFactor(encryptionKey(ctx.env), account.username, entry, input.code, nowMs)
    return openSession(account, state, entry, challenge, {used_recovery_code: factor === "recovery", recovery_codes_remaining: remainingRecoveryCodes(entry)}, nowMs)
  })
}

/** Replace the authenticator, step 1: reauthenticate, then receive a new secret. */
export function replaceStart(ctx, request) {
  return action(ctx, request, "session", REAUTH_FAILED, async ({state, input, account, nowMs, entry, tooLarge}) => {
    const session = requireSession(account, state, request.session, nowMs)
    tooLarge()
    const key = encryptionKey(ctx.env)
    await reauthenticate(ctx, key, account.username, entry, input, nowMs)
    return ok({enrollment: await createPending(key, account.username, entry, "session:" + session.sid, nowMs)})
  })
}

/**
 * Replace the authenticator, step 2: confirm the new secret; the old one stops working,
 * recovery codes are reissued and every other session of the account is revoked (this
 * browser receives a fresh session cookie).
 */
export function replaceConfirm(ctx, request) {
  return action(ctx, request, "session", INVALID_CODE, ({state, input, account, nowMs, entry, tooLarge}) => {
    const session = requireSession(account, state, request.session, nowMs)
    tooLarge()
    countAttempt(entry, nowMs)
    const codes = activatePending(encryptionKey(ctx.env), account.username, entry, "session:" + session.sid, input.code, nowMs)
    delete entry.limit
    revokeSessions(entry, nowMs)
    return ok({recovery_codes: codes}, {session: issueSession(account, entry, nowMs)})
  })
}

/** Issue a new set of recovery codes after reauthentication; the old set stops working. */
export function regenerateRecoveryCodes(ctx, request) {
  return action(ctx, request, "session", REAUTH_FAILED, async ({state, input, account, nowMs, entry, tooLarge}) => {
    requireSession(account, state, request.session, nowMs)
    tooLarge()
    await reauthenticate(ctx, encryptionKey(ctx.env), account.username, entry, input, nowMs)
    return ok({recovery_codes: storeRecoveryCodes(account.username, entry, newRecoveryCodes())})
  })
}

/**
 * Remove the authenticator after reauthentication. Two-factor sign-in stays mandatory, so
 * this signs the account out everywhere; signing in again needs a new enrollment code.
 */
export function disable(ctx, request) {
  return action(ctx, request, "session", REAUTH_FAILED, async ({state, input, account, nowMs, entry, tooLarge}) => {
    requireSession(account, state, request.session, nowMs)
    tooLarge()
    await reauthenticate(ctx, encryptionKey(ctx.env), account.username, entry, input, nowMs)
    removeSecondFactor(state, account.username, nowMs)
    return ok({disabled: true}, {session: null})
  })
}
