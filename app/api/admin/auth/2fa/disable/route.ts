import { NextRequest } from "next/server"
import { currentAdmin, twoFactorRoute } from "@/lib/admin-auth"
import { disable } from "@/lib/admin-totp.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function POST(request: NextRequest) { return twoFactorRoute(request, disable, currentAdmin) }
