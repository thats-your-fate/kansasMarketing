#!/usr/bin/env node
/** Owner controller only: bounded private stdin. Never pass or log the seed in argv. */
import {readFile} from "node:fs/promises"
import {importSharedAuthenticator} from "../lib/admin-totp.mjs"

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--import" || process.getuid?.() === 0 || process.geteuid?.() === 0 || process.stdin.isTTY)
    throw new Error("Private non-root owner-controller pipe required")
  let size = 0
  const chunks = []
  for await (const chunk of process.stdin) {
    size += chunk.length
    if (size > 4096) throw new Error("Provisioning input too large")
    chunks.push(chunk)
  }
  const request = JSON.parse(Buffer.concat(chunks).toString("utf8"))
  if (!request || Object.keys(request).sort().join(",") !== "transfer,username") throw new Error("Invalid private request")
  const credentials = JSON.parse(await readFile(process.env.KANSAS_ADMIN_CREDENTIALS_FILE || "/home/yaro/.config/future-wells/kansas-admin.json", "utf8"))
  const context = {
    env: process.env,
    sharedProvisioningRequired: true,
    now: () => Date.now(),
    account: async () => ({username: credentials.username, role: credentials.role, session_key: credentials.session_key}),
    verifyPassword: async () => false,
  }
  const result = await importSharedAuthenticator(context, request.username, request.transfer)
  process.stdout.write(JSON.stringify(result) + "\n")
}

main().catch(() => {
  process.stderr.write("Shared SEO Sites authenticator import refused; no credential values printed.\n")
  process.exitCode = 1
})
