// XML for the primary-tier well sitemap: an index at /sitemap-wells.xml and
// one urlset per backend page at /sitemap-wells-<n>.xml. These are served
// live by the web app (the root /sitemap.xml is a fixed publication file), and
// are submitted to search engines directly rather than through robots.txt.

import { MAX_SITEMAP_URLS } from "./sitemap-policy.mjs"

export const WELL_SITEMAP_INDEX_PATH = "/sitemap-wells.xml"
export const MAX_WELL_SITEMAP_PAGES = 1000

export function wellSitemapPagePath(page) {
	return `/sitemap-wells-${page}.xml`
}

/**
 * Parse the numeric page from the internal route segment; null when invalid.
 * @param {string | undefined} value
 */
export function parseWellSitemapPage(value) {
	if (!/^[1-9]\d{0,3}$/.test(String(value || ""))) return null
	const page = Number(value)
	return page <= MAX_WELL_SITEMAP_PAGES ? page : null
}

/**
 * @param {{ origin: string, totalPages: number }} input
 */
export function wellSitemapIndexXml({ origin, totalPages }) {
	const pages = Math.max(0, Math.min(Number(totalPages) || 0, MAX_WELL_SITEMAP_PAGES))
	const entries = Array.from({ length: pages }, (_, index) =>
		`  <sitemap><loc>${escapeXml(absoluteUrl(origin, wellSitemapPagePath(index + 1)))}</loc></sitemap>`,
	)
	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}${entries.length ? "\n" : ""}</sitemapindex>\n`
}

/**
 * @param {{ origin: string, entries: { lastmod?: string | null }[], pathFor: (entry: any) => string }} input
 */
export function wellSitemapUrlsetXml({ origin, entries, pathFor }) {
	const seen = new Set()
	const lines = []
	for (const entry of entries || []) {
		const path = pathFor(entry)
		if (!path || !path.startsWith("/wells/")) continue
		const url = absoluteUrl(origin, path)
		if (seen.has(url)) continue
		seen.add(url)
		const lastmod = sitemapDate(entry?.lastmod)
		lines.push(lastmod ? `  <url><loc>${escapeXml(url)}</loc><lastmod>${lastmod}</lastmod></url>` : `  <url><loc>${escapeXml(url)}</loc></url>`)
	}
	if (lines.length > MAX_SITEMAP_URLS) throw new Error(`Well sitemap URL count ${lines.length} exceeds ${MAX_SITEMAP_URLS}`)
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}${lines.length ? "\n" : ""}</urlset>\n`
}

/** W3C date (YYYY-MM-DD) from the backend's evidence date, never in the future. */
export function sitemapDate(value, today = new Date().toISOString().slice(0, 10)) {
	const text = String(value || "").slice(0, 10)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
	if (Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) return null
	return text > today ? today : text
}

function absoluteUrl(origin, path) {
	return new URL(path, String(origin).replace(/\/+$/, "") + "/").toString()
}

function escapeXml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}
