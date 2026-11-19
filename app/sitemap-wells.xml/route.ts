import { indexingEnabled, publicBaseUrl } from "@/app/config"
import { loadWellSitemapPage, wellSitemapResponse } from "@/app/well-sitemap-source"
import { wellSitemapIndexXml } from "@/app/well-sitemap-policy.mjs"

export const dynamic = "force-dynamic"

export async function GET() {
	if (!indexingEnabled) return new Response("Not found", { status: 404 })
	const first = await loadWellSitemapPage(1)
	if (!first) return new Response("Well sitemap unavailable", { status: 503, headers: { "Retry-After": "600" } })
	return wellSitemapResponse(wellSitemapIndexXml({ origin: publicBaseUrl, totalPages: first.total_pages }))
}
