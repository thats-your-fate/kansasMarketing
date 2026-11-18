import { NextRequest } from "next/server"
import { twoFactorRoute } from "@/lib/admin-auth"
import { status } from "@/lib/admin-totp.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(request: NextRequest) { return twoFactorRoute(request, status) }
