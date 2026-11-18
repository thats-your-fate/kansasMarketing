/**
 * Persistent second-factor state for the Kansas admin area: one JSON file.
 *
 * Kansas has no admin database, so the encrypted authenticator secret, the last accepted
 * time step, recovery-code hashes, the attempt window, the session cut-off and the open
 * sign-in challenges live in the file named by KANSAS_ADMIN_TOTP_STATE_FILE.
 *
 * Every change is a read-modify-write that holds two locks: an in-process queue, and an
 * exclusive lock file beside the state file, so the server, the owner reset script and the
 * short-lived preview process of a promotion cannot overwrite each other's update. The file
 * is re-read from disk for every operation, never cached, validated field by field (anything
 * unexpected fails closed), and replaced atomically (temporary file in the same directory,
 * mode 0600, fsync, rename). The site still runs one Next server process; the lock file
 * makes the occasional second process safe, it is not a design for many workers.
 *
 * This module has no dependencies outside Node, so the owner reset script can use it alone.
 */
import {randomBytes} from "node:crypto"
import {mkdir, open, readFile, readdir, rename, stat, unlink} from "node:fs/promises"
import {dirname, isAbsolute, join} from "node:path"

export const STATE_FILE_ENV = "KANSAS_ADMIN_TOTP_STATE_FILE"
const STATE_VERSION = 1
const MAX_STATE_BYTES = 1024 * 1024
/** How long one operation waits for the lock file before failing closed. */
const LOCK_WAIT_MS = 5000
/** A lock older than this is abandoned (an operation holds it for well under a second). */
const LOCK_STALE_MS = 15000
/** A lock this old whose owning process no longer exists is abandoned too. */
const LOCK_DEAD_OWNER_MS = 2000
const TEMPORARY_PATTERN = /^\.admin-totp-[0-9a-f]{16}\.tmp$/
const TEMPORARY_MAX_AGE_MS = 60000

export class StateUnavailable extends Error {
  constructor(reason) {
    super("admin two-factor state is unavailable: " + reason)
    this.name = "StateUnavailable"
    this.reason = reason
  }
}

/** The configured absolute state file path; throws when missing or relative. */
export function stateFilePath(env) {
  const value = typeof env?.[STATE_FILE_ENV] === "string" ? env[STATE_FILE_ENV].trim() : ""
  if (!value) throw new StateUnavailable("state file path is not configured")
  if (!isAbsolute(value) || value.includes("\0")) throw new StateUnavailable("state file path must be absolute")
  return value
}

function emptyState() {
  return {version: STATE_VERSION, accounts: Object.create(null), challenges: Object.create(null)}
}

// ---------------------------------------------------------------------------------------
// Shape validation: a file that is not exactly what this code writes is refused
// ---------------------------------------------------------------------------------------

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value)
const isText = value => typeof value === "string" && value.length > 0 && value.length <= 512
const isCount = value => Number.isSafeInteger(value) && value >= 0
const isBoolean = value => typeof value === "boolean"
const optional = check => value => value === undefined || check(value)
const record = (fields, name) => value => {
  if (!isObject(value)) throw new StateUnavailable("state file has an unexpected " + name)
  for (const key of Object.keys(value)) if (!Object.hasOwn(fields, key)) throw new StateUnavailable("state file has an unexpected " + name)
  for (const [key, check] of Object.entries(fields)) if (!check(value[key])) throw new StateUnavailable("state file has an unexpected " + name)
  return true
}

const sealedSecret = {nonce: isText, ciphertext: isText}
const checkAccount = record({
  active: optional(record({...sealedSecret, last_used_step: isCount, enabled_at: isCount}, "authenticator")),
  pending: optional(record({...sealedSecret, authorized_by: isText, created_at: isCount}, "pending authenticator")),
  recovery_codes: optional(value => Array.isArray(value) && value.length <= 64
    && value.every(record({hash: item => typeof item === "string" && /^[0-9a-f]{64}$/.test(item), used_at: item => item === null || isCount(item)}, "recovery code"))),
  limit: optional(record({window_start: isCount, attempts: isCount}, "attempt window")),
  sessions_valid_after: optional(isCount),
  last_session_issued_at: optional(isCount),
}, "account")
const checkChallenge = record({username: isText, expires_at: isCount, attempts: isCount, enrollment_authorized: isBoolean}, "challenge")

/**
 * Returns the state with null-prototype maps (account names and challenge ids are data,
 * never property lookups on Object.prototype) or throws. A malformed account is never read
 * as "not enrolled", and a malformed authenticator is never read as "enrolled".
 */
function validated(state) {
  if (!isObject(state) || state.version !== STATE_VERSION || !isObject(state.accounts) || !isObject(state.challenges) || Object.keys(state).length !== 3)
    throw new StateUnavailable("state file has an unexpected shape")
  for (const [name, account] of Object.entries(state.accounts)) {
    if (!isText(name)) throw new StateUnavailable("state file has an unexpected account")
    checkAccount(account)
  }
  for (const [id, challenge] of Object.entries(state.challenges)) {
    if (!/^[0-9a-f]{64}$/.test(id)) throw new StateUnavailable("state file has an unexpected challenge")
    checkChallenge(challenge)
  }
  return {version: STATE_VERSION, accounts: Object.assign(Object.create(null), state.accounts), challenges: Object.assign(Object.create(null), state.challenges)}
}

/** Reads the state; a file that does not exist yet is an empty state, anything unreadable or malformed throws. */
export async function readState(file) {
  let text
  try {
    text = await readFile(file, "utf8")
  } catch (error) {
    if (error?.code === "ENOENT") return emptyState()
    throw new StateUnavailable("state file cannot be read (" + (error?.code || "error") + ")")
  }
  if (text.length > MAX_STATE_BYTES) throw new StateUnavailable("state file is too large")
  let state
  try {
    state = JSON.parse(text)
  } catch {
    throw new StateUnavailable("state file is not valid JSON")
  }
  return validated(state)
}

/** Temporary files a crashed write left behind are removed once they are over a minute old. */
async function removeStaleTemporaries(directory) {
  try {
    for (const name of await readdir(directory)) {
      if (!TEMPORARY_PATTERN.test(name)) continue
      const path = join(directory, name)
      const info = await stat(path).catch(() => null)
      if (info && Date.now() - info.mtimeMs > TEMPORARY_MAX_AGE_MS) await unlink(path).catch(() => {})
    }
  } catch { /* best effort */ }
}

/**
 * Atomic replace: temporary file beside the target, 0600, fsync, rename, fsync of the
 * directory. The file belongs to whoever runs this, so it is only ever run as the web
 * process user (the reset script refuses to run as root). Only a valid state is written.
 */
export async function writeState(file, state) {
  const directory = dirname(file)
  const temporary = join(directory, ".admin-totp-" + randomBytes(8).toString("hex") + ".tmp")
  try {
    const text = JSON.stringify(validated(JSON.parse(JSON.stringify(state)))) + "\n"
    await mkdir(directory, {recursive: true, mode: 0o700})
    const handle = await open(temporary, "wx", 0o600)
    try {
      await handle.writeFile(text)
      await handle.chmod(0o600)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, file)
    const folder = await open(directory, "r").catch(() => null)
    if (folder) {
      try { await folder.sync() } catch { /* directory fsync is best effort on filesystems without it */ } finally { await folder.close() }
    }
    await removeStaleTemporaries(directory)
  } catch (error) {
    await unlink(temporary).catch(() => {})
    if (error instanceof StateUnavailable) throw error
    throw new StateUnavailable("state file cannot be written (" + (error?.code || "error") + ")")
  }
}

// ---------------------------------------------------------------------------------------
// Locks
// ---------------------------------------------------------------------------------------

function processExists(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: the process exists but belongs to another user.
    return error?.code === "EPERM"
  }
}

/** Whether the lock file was abandoned: very old, or old with an owner that no longer runs. */
async function lockAbandoned(lock) {
  const info = await stat(lock).catch(() => null)
  if (!info) return false
  const age = Date.now() - info.mtimeMs
  if (age > LOCK_STALE_MS) return true
  if (age <= LOCK_DEAD_OWNER_MS) return false
  const owner = Number.parseInt(await readFile(lock, "utf8").catch(() => ""), 10)
  return !processExists(owner)
}

/**
 * Takes the exclusive lock file beside the state file (created with O_EXCL, holding the
 * owner's pid) and returns the function that releases it. Waits a bounded time; an
 * abandoned lock is removed and taken over. Not acquired in time means fail closed.
 */
async function acquireLock(file, waitMs) {
  const lock = file + ".lock"
  const deadline = Date.now() + waitMs
  try {
    await mkdir(dirname(file), {recursive: true, mode: 0o700})
  } catch (error) {
    throw new StateUnavailable("state directory cannot be created (" + (error?.code || "error") + ")")
  }
  for (;;) {
    let handle
    try {
      handle = await open(lock, "wx", 0o600)
    } catch (error) {
      if (error?.code !== "EEXIST") throw new StateUnavailable("state lock cannot be created (" + (error?.code || "error") + ")")
      if (await lockAbandoned(lock)) {
        await unlink(lock).catch(() => {})
        continue
      }
      if (Date.now() >= deadline) throw new StateUnavailable("state file is locked by another process")
      await new Promise(resolve => setTimeout(resolve, 15 + Math.floor(Math.random() * 20)))
      continue
    }
    try {
      await handle.writeFile(String(process.pid) + "\n")
    } finally {
      await handle.close()
    }
    return () => unlink(lock).catch(() => {})
  }
}

// One queue per state file for the whole process, even if a bundler instantiates this module twice.
const queues = (globalThis[Symbol.for("futureWells.kansas.adminTotp.queues")] ??= new Map())

/**
 * Runs `change(state)` with exclusive access to the state file (within this process and
 * across processes) and persists what it changed. `change` may mutate the state and may be
 * async. The state is written when it returns, and also when it throws an error marked
 * `persist` (a refused attempt still has to be counted); any other error leaves the file
 * untouched. The file is not rewritten when nothing changed. The lock is always released.
 */
export function withState(file, change, {lockWaitMs = LOCK_WAIT_MS} = {}) {
  const previous = queues.get(file) || Promise.resolve()
  const run = previous.then(async () => {
    const release = await acquireLock(file, lockWaitMs)
    try {
      const state = await readState(file)
      const before = JSON.stringify(state)
      const persist = async () => { if (JSON.stringify(state) !== before) await writeState(file, state) }
      let result
      try {
        result = await change(state)
      } catch (error) {
        if (error?.persist === true) await persist()
        throw error
      }
      await persist()
      return result
    } finally {
      await release()
    }
  })
  const settled = run.then(() => {}, () => {})
  queues.set(file, settled)
  void settled.then(() => { if (queues.get(file) === settled) queues.delete(file) })
  return run
}

export function accountOf(state, username) {
  return (state.accounts[username] ??= {})
}

/**
 * Moves the cut-off forward so every session cookie issued so far for the account is
 * refused, including one issued in this same millisecond.
 */
export function revokeSessions(account, nowMs) {
  account.sessions_valid_after = Math.max(nowMs + 1, (account.sessions_valid_after || 0) + 1, (account.last_session_issued_at || 0) + 1)
  return account.sessions_valid_after
}

/**
 * Removes the account's authenticator, pending setup, recovery codes, attempt window and
 * open challenges, and revokes its sessions. Two-factor stays mandatory: the next sign-in
 * needs a new enrollment. Returns whether there was an active authenticator.
 */
export function removeSecondFactor(state, username, nowMs) {
  const account = accountOf(state, username)
  const hadAuthenticator = Boolean(account.active)
  delete account.active
  delete account.pending
  delete account.recovery_codes
  delete account.limit
  for (const [id, challenge] of Object.entries(state.challenges)) if (challenge.username === username) delete state.challenges[id]
  revokeSessions(account, nowMs)
  return hadAuthenticator
}

/** Owner reset for a lost authenticator and lost recovery codes (used by scripts/admin-totp-reset.mjs). */
export async function resetSecondFactor(file, username, nowMs = Date.now()) {
  return withState(file, state => {
    // An unknown name changes nothing, so a typo cannot create a stray account record.
    if (!Object.hasOwn(state.accounts, username)) return {known: false, hadAuthenticator: false}
    return {known: true, hadAuthenticator: removeSecondFactor(state, username, nowMs)}
  })
}
