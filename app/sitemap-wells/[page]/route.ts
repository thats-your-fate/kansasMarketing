import { indexingEnabled, publicBaseUrl } from "@/app/config"
import { wellPath } from "@/app/kansas-entity-pages"
import { loadWellSitemapPage, wellSitemapResponse } from "@/app/well-sitemap-source"
import { parseWellSitemapPage, wellSitemapUrlsetXml } from "@/app/well-sitemap-policy.mjs"

export const dynamic = "force-dynamic"

// Public URL is /sitemap-wells-<n>.xml (rewritten in next.config.mjs).
export async function GET(_request: Request, { params }: { params: Promise<{ page: string }> }) {
	if (!indexingEnabled) return new Response("Not found", { status: 404 })
	const page = parseWellSitemapPage((await params).page)
	if (!page) return new Response("Not found", { status: 404 })
	const data = await loadWellSitemapPage(page)
	if (!data) return new Response("Well sitemap unavailable", { status: 503, headers: { "Retry-After": "600" } })
	if (page > data.total_pages) return new Response("Not found", { status: 404 })
	return wellSitemapResponse(wellSitemapUrlsetXml({ origin: publicBaseUrl, entries: data.entries, pathFor: wellPath }))
}
