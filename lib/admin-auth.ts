import { createHmac, randomBytes, scrypt as deriveKey, timingSafeEqual } from "node:crypto"
import { readFile } from "node:fs/promises"
import { promisify } from "node:util"
import { NextRequest, NextResponse } from "next/server"

const scrypt = promisify(deriveKey)
const cookieName = "fw_ks_admin"
const lifetime = 8 * 60 * 60
export const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" }
type Credentials = { username: string; role: "superadmin"; salt: string; password_hash: string; session_key: string }

async function credentials(): Promise<Credentials> {
  return JSON.parse(await readFile(process.env.KANSAS_ADMIN_CREDENTIALS_FILE || "/home/yaro/.config/future-wells/kansas-admin.json", "utf8"))
}

function equal(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function signature(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("base64url")
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  // Browser requests that can mutate state must originate on this site.
  if (!origin) return false
  const allowed = ["https://futurewellskansas.com", "https://www.futurewellskansas.com"]
  if (process.env.NODE_ENV !== "production") allowed.push(request.nextUrl.origin)
  return allowed.includes(origin)
}

export async function currentAdmin(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value
  if (!token || token.length > 2048) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const config = await credentials()
  if (!equal(parts[1], signature(parts[0], config.session_key))) return null
  try {
    const session = JSON.parse(Buffer.from(parts[0], "base64url").toString())
    if (session.username !== config.username || typeof session.expires !== "number" || session.expires <= Date.now() / 1000) return null
    return { username: config.username, role: config.role }
  } catch { return null }
}

const attempts = new Map<string, { count: number; reset: number }>()

export async function login(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers: privateHeaders })
  if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ error: "Request too large" }, { status: 413 })
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown"
  const now = Date.now()
  for (const [key, value] of attempts) if (value.reset <= now) attempts.delete(key)
  const blocked = [ip, "all"].some((key) => (attempts.get(key)?.count || 0) >= (key === "all" ? 30 : 5))
  if (blocked) return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429, headers: { ...privateHeaders, "Retry-After": "900" } })
  for (const key of [ip, "all"]) {
    const entry = attempts.get(key) || { count: 0, reset: now + 15 * 60 * 1000 }
    entry.count += 1
    attempts.set(key, entry)
  }
  const body = await request.json().catch(() => null)
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (!password || password.length > 256) return NextResponse.json({ error: "Invalid username or password" }, { status: 401, headers: privateHeaders })
  const config = await credentials()
  const hash = (await scrypt(password, config.salt, 64) as Buffer).toString("hex")
  if (!equal(hash, config.password_hash) || !equal(username, config.username)) return NextResponse.json({ error: "Invalid username or password" }, { status: 401, headers: privateHeaders })
  attempts.delete(ip)
  const payload = Buffer.from(JSON.stringify({ username: config.username, expires: Math.floor(now / 1000) + lifetime, nonce: randomBytes(16).toString("hex") })).toString("base64url")
  const response = NextResponse.json({ admin: { username: config.username, role: config.role } }, { headers: privateHeaders })
  response.cookies.set(cookieName, payload + "." + signature(payload, config.session_key), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: lifetime })
  return response
}

export function logout() {
  const response = NextResponse.json({ success: true }, { headers: privateHeaders })
  response.cookies.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 })
  return response
}
