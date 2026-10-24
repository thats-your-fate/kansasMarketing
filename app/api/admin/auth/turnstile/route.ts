import { NextResponse } from "next/server"
import { turnstileConfig } from "@/lib/admin-turnstile"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET() {
  const config = turnstileConfig()
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" }
  return config
    ? NextResponse.json({ site_key: config.siteKey }, { headers })
    : NextResponse.json({ error: "Security verification is temporarily unavailable." }, { status: 503, headers })
}
