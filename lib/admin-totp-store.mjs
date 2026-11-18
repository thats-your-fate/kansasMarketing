/**
 * Persistent second-factor state for the Kansas admin area: one JSON file.
 *
 * Kansas has no admin database, so the encrypted authenticator secret, the last accepted
 * time step, recovery-code hashes, the attempt window, the session cut-off and the open
 * sign-in challenges live in the file named by KANSAS_ADMIN_TOTP_STATE_FILE.
 *
 * Every change is a read-modify-write under one in-process mutex and is written atomically
 * (temporary file in the same directory, mode 0600, fsync, rename). The file is re-read from
 * disk for every operation, never cached. This is only safe with a single Next server
 * process for the site, which is how Kansas runs (`next start`, one process).
 *
 * This module has no dependencies outside Node, so the owner reset script can use it alone.
 */
import {randomBytes} from "node:crypto"
import {chown, mkdir, open, readFile, rename, stat, unlink} from "node:fs/promises"
import {dirname, isAbsolute, join} from "node:path"

export const STATE_FILE_ENV = "KANSAS_ADMIN_TOTP_STATE_FILE"
const STATE_VERSION = 1
const MAX_STATE_BYTES = 1024 * 1024

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
  return {version: STATE_VERSION, accounts: {}, challenges: {}}
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/** Reads the state; a file that does not exist yet is an empty state, anything unreadable throws. */
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
  if (!plainObject(state) || state.version !== STATE_VERSION || !plainObject(state.accounts) || !plainObject(state.challenges))
    throw new StateUnavailable("state file has an unexpected shape")
  // Null-prototype maps: account names and challenge ids are data, never property lookups on Object.prototype.
  return {version: STATE_VERSION, accounts: Object.assign(Object.create(null), state.accounts), challenges: Object.assign(Object.create(null), state.challenges)}
}

/** Atomic replace: temporary file beside the target, 0600, fsync, rename, fsync of the directory. */
export async function writeState(file, state) {
  const directory = dirname(file)
  const temporary = join(directory, ".admin-totp-" + randomBytes(8).toString("hex") + ".tmp")
  try {
    await mkdir(directory, {recursive: true, mode: 0o700})
    const handle = await open(temporary, "wx", 0o600)
    try {
      await handle.writeFile(JSON.stringify(state) + "\n")
      await handle.chmod(0o600)
      await handle.sync()
    } finally {
      await handle.close()
    }
    // When root runs the reset script the file must stay readable by the runtime account.
    if (typeof process.getuid === "function" && process.getuid() === 0) {
      const owner = await stat(file).catch(() => stat(directory))
      await chown(temporary, owner.uid, owner.gid)
    }
    await rename(temporary, file)
    const folder = await open(directory, "r").catch(() => null)
    if (folder) {
      try { await folder.sync() } catch { /* directory fsync is best effort on filesystems without it */ } finally { await folder.close() }
    }
  } catch (error) {
    await unlink(temporary).catch(() => {})
    if (error instanceof StateUnavailable) throw error
    throw new StateUnavailable("state file cannot be written (" + (error?.code || "error") + ")")
  }
}

// One queue per state file for the whole process, even if a bundler instantiates this module twice.
const queues = (globalThis[Symbol.for("futureWells.kansas.adminTotp.queues")] ??= new Map())

/**
 * Runs `change(state)` with exclusive access to the state file and persists what it changed.
 * `change` may mutate the state and may be async. The state is written when it returns, and
 * also when it throws an error marked `persist` (a refused attempt still has to be counted);
 * any other error leaves the file untouched. Nothing is written when nothing changed, so
 * requests that are refused before touching the state cost no disk write.
 */
export function withState(file, change) {
  const previous = queues.get(file) || Promise.resolve()
  const run = previous.then(async () => {
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
  })
  const settled = run.then(() => {}, () => {})
  queues.set(file, settled)
  void settled.then(() => { if (queues.get(file) === settled) queues.delete(file) })
  return run
}

export function accountOf(state, username) {
  return (state.accounts[username] ??= {})
}

/** Moves the cut-off forward so every session cookie issued so far for the account is refused. */
export function revokeSessions(account, nowMs) {
  account.sessions_valid_after = Math.max(nowMs, (account.sessions_valid_after || 0) + 1, (account.last_session_issued_at || 0) + 1)
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
  for (const [id, challenge] of Object.entries(state.challenges)) if (challenge?.username === username) delete state.challenges[id]
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
