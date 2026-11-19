import { scrypt as deriveKey, timingSafeEqual } from "node:crypto"
import { readFile } from "node:fs/promises"
import { promisify } from "node:util"
import { NextRequest, NextResponse } from "next/server"
import { verifyAdminTurnstile } from "./admin-turnstile"
import { TwoFactorFailure, begin, loginRequired, sessionAdmin, signOut, unavailable, type TwoFactorContext, type TwoFactorCookie, type TwoFactorRequest, type TwoFactorResult } from "./admin-totp.mjs"

const scrypt = promisify(deriveKey)
const cookieName = "fw_ks_admin"
// Password accepted, second factor pending. Only sent to the sign-in endpoints.
const challengeCookieName = "fw_ks_admin_2fa"
const challengeCookiePath = "/api/admin/auth"
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

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  // Browser requests that can mutate state must originate on this site.
  if (!origin) return false
  const allowed = ["https://futurewellskansas.com", "https://www.futurewellskansas.com"]
  if (process.env.NODE_ENV !== "production") allowed.push(request.nextUrl.origin)
  return allowed.includes(origin)
}

async function passwordMatches(password: string, config: Credentials, maxLength = 256) {
  if (!password || password.length > maxLength) return false
  return equal((await scrypt(password, config.salt, 64) as Buffer).toString("hex"), config.password_hash)
}

/** What the second factor needs from this site: environment, clock, the account and its password check. */
export function twoFactorContext(): TwoFactorContext {
  return {
    env: process.env,
    sharedProvisioningRequired: true,
    now: () => Date.now(),
    account: async () => {
      const config = await credentials()
      return { username: config.username, role: config.role, session_key: config.session_key }
    },
    // The shared security screen accepts up to 512 characters; the core bounds the input to the same length.
    verifyPassword: async password => passwordMatches(password, await credentials(), 512),
  }
}

/**
 * The signed-in superadmin, or null. A session cookie only exists after a completed second
 * factor: cookies from before the two-factor release, challenge cookies and cookies issued
 * before the account's sessions were revoked are all refused. Throws when the second-factor
 * state cannot be read, so callers answer 503 instead of treating anyone as signed in.
 */
export async function currentAdmin(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value
  if (!token || token.length > 2048) return null
  return sessionAdmin(twoFactorContext(), token)
}

function setCookie(response: NextResponse, name: string, path: string, value: TwoFactorCookie) {
  if (value === undefined) return
  response.cookies.set(name, value?.token || "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path, maxAge: value?.maxAge || 0 })
}

const maxBodyBytes = 4096

/**
 * The request body as text, or null when it is not a small, length-declared body. The
 * declared length is checked before anything is read, and reading stops at the cap even if
 * the declaration was untrue.
 */
async function boundedBody(request: NextRequest) {
  const declared = request.headers.get("content-length") || ""
  if (!/^[0-9]{1,6}$/.test(declared) || Number(declared) > maxBodyBytes) return null
  if (!request.body) return ""
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBodyBytes) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString("utf8")
}

function twoFactorResponse(result: TwoFactorResult) {
  const response = NextResponse.json(result.body, { status: result.status, headers: privateHeaders })
  setCookie(response, cookieName, "/", result.session)
  setCookie(response, challengeCookieName, challengeCookiePath, result.challenge)
  return response
}

function twoFactorFailure(error: unknown) {
  // Unexpected errors are reported by type only: never a message that could carry a code or a secret.
  if (!(error instanceof TwoFactorFailure)) console.error("admin two-factor request failed: " + (error instanceof Error ? error.name : "error"))
  const failure = error instanceof TwoFactorFailure ? error : unavailable()
  const headers: Record<string, string> = { ...privateHeaders }
  if (failure.retryAfter) headers["Retry-After"] = String(failure.retryAfter)
  return NextResponse.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status, headers })
}

/**
 * Thin HTTP frame for the /api/admin/auth/2fa/* routes; all rules live in lib/admin-totp.mjs.
 * Routes that manage an existing authenticator pass `currentAdmin` as `guard`, so they are
 * refused without a signed-in session before anything else happens (the handler checks the
 * session again under the state lock). The sign-in-stage routes work from the challenge cookie.
 */
export async function twoFactorRoute(request: NextRequest, handler: (context: TwoFactorContext, input: TwoFactorRequest) => Promise<TwoFactorResult>, guard?: typeof currentAdmin) {
  try {
    if (guard && !(await guard(request))) throw loginRequired()
    let input: unknown = null
    if (request.method === "POST") {
      const text = await boundedBody(request)
      if (text === null) return NextResponse.json({ error: { code: "request_too_large", message: "Request too large." } }, { status: 413, headers: privateHeaders })
      try { input = JSON.parse(text) } catch { input = null }
    }
    return twoFactorResponse(await handler(twoFactorContext(), {
      // Same rule as every other state-changing admin request, plus the browser's own cross-site signal.
      sameOrigin: sameOrigin(request) && request.headers.get("sec-fetch-site")?.toLowerCase() !== "cross-site",
      session: request.cookies.get(cookieName)?.value,
      challenge: request.cookies.get(challengeCookieName)?.value,
      input,
    }))
  } catch (error) {
    return twoFactorFailure(error)
  }
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
  const verification = await verifyAdminTurnstile(body?.turnstile_token)
  if (!verification.ok) return NextResponse.json({ error: verification.message }, { status: verification.status, headers: privateHeaders })
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (!password || password.length > 256) return NextResponse.json({ error: "Invalid username or password" }, { status: 401, headers: privateHeaders })
  const config = await credentials()
  const passwordValid = await passwordMatches(password, config)
  if (!passwordValid || !equal(username, config.username)) return NextResponse.json({ error: "Invalid username or password" }, { status: 401, headers: privateHeaders })
  attempts.delete(ip)
  // The password is only the first factor: this never signs in. It hands the browser a
  // short-lived challenge; a session exists only after the authenticator step succeeds.
  try { return twoFactorResponse(await begin(twoFactorContext())) }
  catch (error) { return twoFactorFailure(error) }
}

/** Clears both cookies and revokes the session on the server; a storage failure still clears the cookies. */
export async function logout(request: NextRequest) {
  try {
    return twoFactorResponse(await signOut(twoFactorContext(), { session: request.cookies.get(cookieName)?.value, challenge: request.cookies.get(challengeCookieName)?.value }))
  } catch (error) {
    const response = twoFactorFailure(error)
    setCookie(response, cookieName, "/", null)
    setCookie(response, challengeCookieName, challengeCookiePath, null)
    return response
  }
}
