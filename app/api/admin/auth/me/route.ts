import { NextRequest, NextResponse } from "next/server"
import { currentAdmin, privateHeaders } from "@/lib/admin-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(request: NextRequest) {
  try {
    const admin = await currentAdmin(request)
    return NextResponse.json(admin ? { admin } : { error: "Sign in required" }, { status: admin ? 200 : 401, headers: privateHeaders })
  } catch { return NextResponse.json({ error: "Sign-in is temporarily unavailable" }, { status: 503, headers: privateHeaders }) }
}
