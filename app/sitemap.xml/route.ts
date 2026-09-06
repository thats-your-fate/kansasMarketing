import { publicBaseUrl } from "@/app/config"
import { allExplainers } from "@/app/lib/explainers"

export const dynamic = "force-static"

/**
 * KS-18: lists exactly the approved marketing and guide pages this repo
 * builds — no wells/operators/counties/fields pages exist to include, by
 * design (see docs/architecture/kansas-marketing-boundary.md). Each guide
 * slug is derived from app/lib/explainers.ts, so a new published guide is
 * picked up automatically without a second list to keep in sync.
 */
export function GET() {
	const staticPaths = ["/", "/data", "/data-coverage", "/methodology", "/activity", "/guides", "/disclaimer", "/privacy", "/terms", "/contact"]
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
