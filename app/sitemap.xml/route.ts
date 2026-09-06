import { publicBaseUrl } from "@/app/config"

export const dynamic = "force-static"

/**
 * KS-M009 will replace this with a build-time-generated sitemap covering
 * wells/operators/counties/fields once those pages exist (see the
 * publish-sitemaps pattern in sibling marketing repos). Until then, this
 * lists only the routes that are actually live.
 */
export function GET() {
	const urls = [`${publicBaseUrl}/kansas`]
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
