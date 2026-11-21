import { NextRequest, NextResponse } from "next/server"
import { currentAdmin, privateHeaders, sameOrigin } from "@/lib/admin-auth"

const backendApiUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:4008"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await context.params
  const subpath = path.join("/")
  let admin: Awaited<ReturnType<typeof currentAdmin>>
  try {
    admin = await currentAdmin(request)
  } catch {
    return NextResponse.json(
      { error: { message: "Sign-in is temporarily unavailable" } },
      { status: 503, headers: privateHeaders },
    )
  }
  if (!admin || admin.role !== "superadmin") {
    if (request.method === "GET" && subpath === "app") {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", "/api/admin/ai-summaries/app")
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.json(
      { error: { message: "Sign in required" } },
      { status: 401, headers: privateHeaders },
    )
  }
  if (request.method !== "GET" && request.method !== "HEAD" && !sameOrigin(request)) {
    return NextResponse.json(
      { error: { message: "Invalid request origin" } },
      { status: 403, headers: privateHeaders },
    )
  }

  const target = `${backendApiUrl}/api/admin/ai-summaries/${subpath}${request.nextUrl.search}`
  const headers = new Headers()
  headers.set("X-KS-Admin-User", admin.username)
  const internalSecret = process.env.KS_INTERNAL_ADMIN_SECRET?.trim()
  if (internalSecret) headers.set("X-KS-Admin-Secret", internalSecret)
  const contentType = request.headers.get("content-type")
  if (contentType) headers.set("Content-Type", contentType)

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text()

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null)

  if (!upstream) {
    return NextResponse.json(
      { error: { message: "AI summary service is temporarily unavailable" } },
      { status: 503, headers: privateHeaders },
    )
  }

  const responseHeaders = new Headers(privateHeaders)
  const upstreamType = upstream.headers.get("content-type")
  if (upstreamType) responseHeaders.set("Content-Type", upstreamType)
  const payload = await upstream.arrayBuffer()
  return new NextResponse(payload, { status: upstream.status, headers: responseHeaders })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxy(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxy(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return proxy(request, context)
}
