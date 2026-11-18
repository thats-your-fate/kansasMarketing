import { NextRequest } from "next/server"
import { twoFactorRoute } from "@/lib/admin-auth"
import { enrollStart } from "@/lib/admin-totp.mjs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function POST(request: NextRequest) { return twoFactorRoute(request, enrollStart) }
