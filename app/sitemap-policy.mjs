import { buildCanonicalUrl } from "./url-policy.mjs"

export const MAX_SITEMAP_URLS = 50000

export const staticSitemapPaths = [
	"/",
	"/browse",
	"/map",
	"/future-wells-sites",
	"/counties",
	"/operators",
	"/fields",
	"/data",
	"/data-coverage",
	"/methodology",
	"/activity",
	"/guides",
	"/disclaimer",
	"/privacy",
	"/terms",
	"/contact",
]

/**
 * @param {{ origin?: string, guidePaths?: string[] }} input
 */
export function eligibleSitemapUrls({ origin, guidePaths = [] }) {
	const paths = [...staticSitemapPaths, ...guidePaths]
	const urls = paths.map((path) => buildCanonicalUrl(path, { origin }))
	assertSitemapUrlSet(urls)
	return urls
}

/**
 * @param {string[]} urls
 */
export function sitemapXml(urls) {
	assertSitemapUrlSet(urls)
	const entries = urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n")
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

/**
 * @param {string[]} urls
 */
export function assertSitemapUrlSet(urls) {
	if (urls.length > MAX_SITEMAP_URLS) {
		throw new Error(`Sitemap URL count ${urls.length} exceeds ${MAX_SITEMAP_URLS}`)
	}
	const seen = new Set()
	for (const url of urls) {
		if (seen.has(url)) throw new Error(`Duplicate sitemap URL: ${url}`)
		seen.add(url)
		const parsed = new URL(url)
		if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
			throw new Error(`Sitemap URL must be absolute HTTPS outside local development: ${url}`)
		}
		if (parsed.search) throw new Error(`Sitemap URL must not include query parameters: ${url}`)
	}
}

function escapeXml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}
