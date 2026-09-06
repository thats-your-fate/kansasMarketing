import { indexingEnabled, publicBaseUrl } from "@/app/config"

export const dynamic = "force-static"

export function GET() {
	const body = indexingEnabled
		? `User-agent: *\nAllow: /\nSitemap: ${publicBaseUrl}/sitemap.xml\n`
		: `User-agent: *\nDisallow: /\n`

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	})
}
