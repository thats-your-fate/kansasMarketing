import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { NextRequest, NextResponse } from "next/server"
import { currentAdmin, privateHeaders, sameOrigin } from "@/lib/admin-auth"

const execute = promisify(execFile)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function handle(request: NextRequest, start: boolean) {
  try {
    const admin = await currentAdmin(request)
    if (!admin || admin.role !== "superadmin") return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: privateHeaders })
    if (start && !sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers: privateHeaders })
    const { stdout } = await execute("/usr/bin/python3", ["/home/yaro/.local/lib/future-wells/kansas_sync_source.py", start ? "manual-start" : "manual-status"], { timeout: 15000, maxBuffer: 1024 * 1024 })
    return NextResponse.json(JSON.parse(stdout), { status: start ? 202 : 200, headers: privateHeaders })
  } catch {
    return NextResponse.json({ error: "Export service is temporarily unavailable" }, { status: 503, headers: privateHeaders })
  }
}
export async function GET(request: NextRequest) { return handle(request, false) }
export async function POST(request: NextRequest) { return handle(request, true) }
