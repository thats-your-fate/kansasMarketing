import { NextRequest, NextResponse } from "next/server"
import { login, privateHeaders } from "@/lib/admin-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function POST(request: NextRequest) {
  try { return await login(request) }
  catch { return NextResponse.json({ error: "Sign-in is temporarily unavailable" }, { status: 503, headers: privateHeaders }) }
}
