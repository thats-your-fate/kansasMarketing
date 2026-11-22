import {readFile} from "node:fs/promises"

/** Preserve the legacy owner object; additional accounts have independent signing keys. */
export function credentialAccounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || (value.additional_accounts !== undefined && !Array.isArray(value.additional_accounts)))
    throw new Error("Invalid admin credentials")
  const accounts = [value, ...(value.additional_accounts || [])]
  if (accounts.length > 16) throw new Error("Too many admin accounts")
  const names = new Set()
  const keys = new Set()
  for (const account of accounts) {
    if (!account || typeof account.username !== "string" || !/^[a-z0-9@._+-]{1,254}$/.test(account.username)
        || !["admin", "superadmin"].includes(account.role)
        || typeof account.salt !== "string" || !/^[0-9a-f]{32,128}$/.test(account.salt)
        || typeof account.password_hash !== "string" || !/^[0-9a-f]{128}$/.test(account.password_hash)
        || typeof account.session_key !== "string" || account.session_key.length < 32 || account.session_key.length > 512
        || names.has(account.username) || keys.has(account.session_key)) throw new Error("Invalid admin account")
    names.add(account.username)
    keys.add(account.session_key)
  }
  return accounts
}

export async function adminCredentials(username) {
  const file = process.env.KANSAS_ADMIN_CREDENTIALS_FILE || "/home/yaro/.config/future-wells/kansas-admin.json"
  const text = await readFile(file, "utf8")
  if (Buffer.byteLength(text) > 65536) throw new Error("Invalid admin credentials")
  const accounts = credentialAccounts(JSON.parse(text))
  return username === undefined ? accounts[0] : accounts.find(account => account.username === username) || null
}

/** Untrusted routing hint only. The TOTP core must verify its HMAC and account binding. */
export function cookieUsername(token) {
  if (typeof token !== "string" || token.length > 2048) return undefined
  try {
    const name = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"))?.username
    return typeof name === "string" && /^[a-z0-9@._+-]{1,254}$/.test(name) ? name : undefined
  } catch { return undefined }
}
