import { apiBaseUrl, publicBaseUrl } from "@/app/config"
import { allExplainers } from "@/app/lib/explainers"
import { expandedEligibleSitemapUrls, sitemapXml } from "@/app/sitemap-policy.mjs"

export const dynamic = "force-dynamic"
export const revalidate = 3600

/**
 * Lists the approved marketing, guide, and lightweight entity-directory
 * pages this repo builds. County/operator/field details are expanded from
 * the Kansas backend when available; well detail pages still require a
 * complete eligible-well sitemap source before enumeration.
 */
export async function GET() {
	const guidePaths = allExplainers().map((explainer) => explainer.href)
	const urls = await expandedEligibleSitemapUrls({ origin: publicBaseUrl, guidePaths, apiBaseUrl })
	const body = sitemapXml(urls)

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	})
}
