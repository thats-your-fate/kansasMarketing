#!/usr/bin/env node
/**
 * Owner reset for a lost authenticator AND lost recovery codes (Kansas admin).
 *
 *   KANSAS_ADMIN_TOTP_STATE_FILE=/path/to/state.json node scripts/admin-totp-reset.mjs --username <admin username>
 *
 * Removes the account's authenticator, pending setup, recovery codes, attempt window and open
 * sign-in challenges, and revokes every session of the account. Two-factor sign-in stays
 * mandatory: the admin then enrolls again with a new owner-issued enrollment code.
 *
 * Run it as the user the web server runs as (fw-ks-runtime in production), never as root:
 * the state file must stay owned by that user, so the script refuses uid 0. It takes the same
 * lock as the running server, needs neither the encryption key nor the password and prints
 * no secret.
 * See docs/admin-two-factor.md.
 */
import {access} from "node:fs/promises"
import {STATE_FILE_ENV, resetSecondFactor, stateFilePath} from "../lib/admin-totp-store.mjs"

async function main(argv) {
  if (argv.length !== 2 || argv[0] !== "--username" || !argv[1].trim()) {
    console.error("usage: " + STATE_FILE_ENV + "=<state file> node scripts/admin-totp-reset.mjs --username <admin username>")
    return 2
  }
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    console.error("Refusing to run as root: run this as the web runtime user, for example\n  runuser -u fw-ks-runtime -- env " + STATE_FILE_ENV + "=<state file> node scripts/admin-totp-reset.mjs --username <admin username>")
    return 2
  }
  const username = argv[1].trim().toLowerCase()
  const file = stateFilePath(process.env)
  try {
    await access(file)
  } catch {
    console.log("No second-factor state file exists yet; no account has an authenticator. Nothing to reset.")
    return 0
  }
  const {known, hadAuthenticator} = await resetSecondFactor(file, username)
  if (!known) {
    console.error("No second-factor state is stored for that username; nothing was removed. Check the spelling.")
    return 1
  }
  console.log(hadAuthenticator
    ? "Authenticator and recovery codes removed; all sessions of the account are signed out. Issue a new enrollment code so the admin can enroll again."
    : "The account had no active authenticator. Pending setup and sign-in steps were cleared and its sessions are signed out.")
  return 0
}

main(process.argv.slice(2)).then(code => { process.exitCode = code }, error => {
  // Only the reason: never file contents.
  console.error("Reset failed: " + (error?.reason || error?.code || error?.name || "error"))
  process.exitCode = 1
})
