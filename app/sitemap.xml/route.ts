import { publicBaseUrl } from "@/app/config"
import { allExplainers } from "@/app/lib/explainers"
import { eligibleSitemapUrls, sitemapXml } from "@/app/sitemap-policy.mjs"

export const dynamic = "force-static"

/**
 * Lists the approved marketing, guide, and lightweight entity-directory
 * pages this repo builds. Dynamic well/operator/county/field detail cards
 * are served on demand from the Kansas backend rather than enumerated here.
 */
export function GET() {
	const guidePaths = allExplainers().map((explainer) => explainer.href)
	const urls = eligibleSitemapUrls({ origin: publicBaseUrl, guidePaths })
	const body = sitemapXml(urls)

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	})
}
