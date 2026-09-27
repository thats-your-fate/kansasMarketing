import { buildCanonicalUrl, normalizeSlug } from "./url-policy.mjs"

export const MAX_SITEMAP_URLS = 50000
export const SITEMAP_DIRECTORY_PAGE_SIZE = 100
export const MAX_SITEMAP_DIRECTORY_PAGES = 500

export const dynamicDirectoryFamilies = [
	{ kind: "counties", path: "/counties" },
	{ kind: "operators", path: "/operators" },
	{ kind: "fields", path: "/fields" },
]

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
 * @param {{ origin?: string, guidePaths?: string[], apiBaseUrl?: string, fetchImpl?: typeof fetch }} input
 */
export async function expandedEligibleSitemapUrls({ origin, guidePaths = [], apiBaseUrl, fetchImpl = globalThis.fetch }) {
	const dynamicPaths = await dynamicDirectorySitemapPaths({ apiBaseUrl, fetchImpl })
	const paths = [...staticSitemapPaths, ...guidePaths, ...dynamicPaths]
	const urls = paths.map((path) => buildCanonicalUrl(path, { origin }))
	assertSitemapUrlSet(urls)
	return urls
}

/**
 * @param {{ apiBaseUrl?: string, fetchImpl?: typeof fetch }} input
 */
export async function dynamicDirectorySitemapPaths({ apiBaseUrl, fetchImpl = globalThis.fetch } = {}) {
	if (!apiBaseUrl || typeof fetchImpl !== "function") return []
	const paths = []
	for (const family of dynamicDirectoryFamilies) {
		paths.push(...await dynamicDirectoryFamilyPaths({ ...family, apiBaseUrl, fetchImpl }))
	}
	return dedupePaths(paths)
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
		if (parsed.search && !allowedSitemapQuery(parsed)) {
			throw new Error(`Sitemap URL must not include noncanonical query parameters: ${url}`)
		}
	}
}

async function dynamicDirectoryFamilyPaths({ apiBaseUrl, fetchImpl, kind, path }) {
	const firstPage = await fetchDirectoryPage({ apiBaseUrl, fetchImpl, kind, page: 1 })
	if (!firstPage) return []
	const totalPages = boundedTotalPages(firstPage.total_pages)
	const paths = [
		...entityDetailPaths(path, firstPage.items),
		...Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => `${path}?page=${index + 2}`),
	]
	for (let page = 2; page <= totalPages; page += 1) {
		const pageData = await fetchDirectoryPage({ apiBaseUrl, fetchImpl, kind, page })
		if (!pageData) break
		paths.push(...entityDetailPaths(path, pageData.items))
	}
	return paths
}

async function fetchDirectoryPage({ apiBaseUrl, fetchImpl, kind, page }) {
	const url = new URL(`/api/ks/${kind}`, normalizeApiBaseUrl(apiBaseUrl))
	url.searchParams.set("page", String(page))
	url.searchParams.set("page_size", String(SITEMAP_DIRECTORY_PAGE_SIZE))
	try {
		const response = await fetchImpl(url.toString(), {
			cache: "no-store",
			signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
		})
		if (!response || !response.ok) return null
		const payload = await response.json().catch(() => null)
		const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload
		if (!data || typeof data !== "object" || !Array.isArray(data.items)) return null
		return data
	} catch {
		return null
	}
}

function entityDetailPaths(prefix, items) {
	return items
		.map((item) => {
			const source = item && typeof item === "object" ? item.display_name || item.key : ""
			const slug = normalizeSlug(source)
			return slug ? `${prefix}/${encodeURIComponent(slug)}` : null
		})
		.filter(Boolean)
}

function boundedTotalPages(value) {
	const pages = Number(value)
	if (!Number.isInteger(pages) || pages < 1) return 1
	return Math.min(pages, MAX_SITEMAP_DIRECTORY_PAGES)
}

function normalizeApiBaseUrl(value) {
	const url = new URL(value)
	url.pathname = url.pathname.replace(/\/+$/, "")
	url.search = ""
	url.hash = ""
	return url
}

function dedupePaths(paths) {
	const seen = new Set()
	return paths.filter((path) => {
		if (seen.has(path)) return false
		seen.add(path)
		return true
	})
}

function allowedSitemapQuery(url) {
	const params = url.searchParams
	if (Array.from(params.keys()).some((key) => key !== "page")) return false
	const page = Number(params.get("page"))
	if (!Number.isInteger(page) || page < 2) return false
	return dynamicDirectoryFamilies.some((family) => url.pathname === family.path)
}

function escapeXml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}
