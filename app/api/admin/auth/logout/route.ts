import { NextRequest, NextResponse } from "next/server"
import { logout, sameOrigin } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  return logout()
}
