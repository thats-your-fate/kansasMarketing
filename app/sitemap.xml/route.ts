import { publicBaseUrl } from "@/app/config"
import { allExplainers } from "@/app/lib/explainers"

export const dynamic = "force-static"

/**
 * Lists the approved marketing, guide, and lightweight entity-directory
 * pages this repo builds. Dynamic well/operator/county/field detail cards
 * are served on demand from the Kansas backend rather than enumerated here.
 */
export function GET() {
	const staticPaths = ["/", "/browse", "/counties", "/operators", "/fields", "/data", "/data-coverage", "/methodology", "/activity", "/guides", "/disclaimer", "/privacy", "/terms", "/contact"]
	const guidePaths = allExplainers().map((explainer) => explainer.href)
	const urls = [...staticPaths, ...guidePaths].map((path) => `${publicBaseUrl}${path === "/" ? "" : path}`)

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
		.map((url) => `  <url><loc>${url}</loc></url>`)
		.join("\n")}\n</urlset>\n`

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	})
}
