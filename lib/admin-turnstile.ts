type Config = { siteKey: string; secret: string }
type Result = { ok: true } | { ok: false; status: number; message: string }

export function turnstileConfig(): Config | null {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || ""
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() || ""
  return siteKey && secret ? { siteKey, secret } : null
}

export async function verifyAdminTurnstile(token: unknown, config = turnstileConfig(), fetcher: typeof fetch = fetch): Promise<Result> {
  const rejected = { ok: false as const, status: 403, message: "Complete security verification and try again." }
  const unavailable = { ok: false as const, status: 503, message: "Security verification is temporarily unavailable. Please try again." }
  if (typeof token !== "string" || !token.trim() || token.length > 2048) return rejected
  if (!config) return unavailable
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secret, response: token }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return unavailable
    const result = await response.json()
    return result.success === true && result.action === "admin_login"
      && ["futurewellskansas.com", "www.futurewellskansas.com"].includes(String(result.hostname).toLowerCase())
      ? { ok: true } : rejected
  } catch { return unavailable }
}
