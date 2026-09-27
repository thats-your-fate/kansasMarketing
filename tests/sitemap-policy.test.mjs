import assert from "node:assert/strict"
import test from "node:test"
import {
	MAX_SITEMAP_URLS,
	assertSitemapUrlSet,
	dynamicDirectorySitemapPaths,
	eligibleSitemapUrls,
	expandedEligibleSitemapUrls,
	sitemapXml,
	staticSitemapPaths,
} from "../app/sitemap-policy.mjs"

const guidePaths = [
	"/guides/kcc-and-kgs-explainer",
	"/guides/api-number-and-kgs-kid-explainer",
]

test("eligible sitemap URLs align with finite public inventory", () => {
	const urls = eligibleSitemapUrls({ origin: "https://futurewellskansas.com", guidePaths })
	assert(urls.includes("https://futurewellskansas.com"))
	assert(urls.includes("https://futurewellskansas.com/future-wells-sites"))
	assert(urls.includes("https://futurewellskansas.com/map"))
	assert(urls.includes("https://futurewellskansas.com/guides/kcc-and-kgs-explainer"))
	assert(!urls.includes("https://futurewellskansas.com/kansas"))
	assert(!urls.includes("https://futurewellskansas.com/wells/15163245390000/allan-1"))
	assert.equal(new Set(urls).size, urls.length)
})

test("expanded sitemap includes backend directory detail and pagination URLs", async () => {
	const urls = await expandedEligibleSitemapUrls({
		origin: "https://futurewellskansas.com",
		guidePaths,
		apiBaseUrl: "http://127.0.0.1:4008",
		fetchImpl: mockDirectoryFetch({
			counties: [
				{ display_name: "Ellis" },
				{ display_name: "St. John & South" },
			],
			operators: [
				{ display_name: "Acme Oil, LLC" },
			],
			fields: [
				{ display_name: "Unnamed" },
			],
		}, { totalPages: { counties: 2 } }),
	})
	assert(urls.includes("https://futurewellskansas.com/counties/ellis"))
	assert(urls.includes("https://futurewellskansas.com/counties/st-john-and-south"))
	assert(urls.includes("https://futurewellskansas.com/operators/acme-oil-llc"))
	assert(urls.includes("https://futurewellskansas.com/fields/unnamed"))
	assert(urls.includes("https://futurewellskansas.com/counties?page=2"))
	assert.equal(new Set(urls).size, urls.length)
})

test("expanded sitemap prefers compact backend sitemap directory source", async () => {
	const urls = await expandedEligibleSitemapUrls({
		origin: "https://futurewellskansas.com",
		apiBaseUrl: "http://127.0.0.1:4008",
		fetchImpl: async (url) => {
			assert.equal(new URL(url).pathname, "/api/ks/seo/sitemap-directories")
			return {
				ok: true,
				async json() {
					return {
						data: {
							directories: [
								{
									kind: "counties",
									path: "/counties",
									total_pages: 3,
									items: [{ display_name: "Barton County" }],
								},
							],
						},
					}
				},
			}
		},
	})
	assert(urls.includes("https://futurewellskansas.com/counties/barton-county"))
	assert(urls.includes("https://futurewellskansas.com/counties?page=2"))
	assert(urls.includes("https://futurewellskansas.com/counties?page=3"))
})

test("directory sitemap expansion falls back cleanly when the backend lacks routes", async () => {
	const paths = await dynamicDirectorySitemapPaths({
		apiBaseUrl: "http://127.0.0.1:4008",
		fetchImpl: async () => ({ ok: false, status: 404 }),
	})
	assert.deepEqual(paths, [])
})

test("static sitemap paths stay below single sitemap limits", () => {
	assert(staticSitemapPaths.length + guidePaths.length < MAX_SITEMAP_URLS)
})

test("sitemap XML is parseable and escapes URL text", () => {
	const urls = [
		"https://futurewellskansas.com",
		"https://futurewellskansas.com/guides/a-and-b",
	]
	const xml = sitemapXml(urls)
	assert(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
	assert(xml.includes("<urlset"))
	assert(xml.includes("<loc>https://futurewellskansas.com/guides/a-and-b</loc>"))
	assert.equal((xml.match(/<url>/g) || []).length, urls.length)
})

test("duplicate, query, non-https production, and oversize outputs fail", () => {
	assert.throws(() => assertSitemapUrlSet(["https://futurewellskansas.com/a", "https://futurewellskansas.com/a"]), /Duplicate/)
	assert.throws(() => assertSitemapUrlSet(["https://futurewellskansas.com/a?utm_source=x"]), /query/)
	assert.doesNotThrow(() => assertSitemapUrlSet(["https://futurewellskansas.com/counties?page=2"]))
	assert.throws(() => assertSitemapUrlSet(["https://futurewellskansas.com/counties?page=1"]), /query/)
	assert.throws(() => assertSitemapUrlSet(["http://futurewellskansas.com/a"]), /absolute HTTPS/)
	assert.throws(
		() => assertSitemapUrlSet(Array.from({ length: MAX_SITEMAP_URLS + 1 }, (_, index) => `https://futurewellskansas.com/p-${index}`)),
		/exceeds/,
	)
})

test("local development origins remain valid for local XML checks", () => {
	const urls = eligibleSitemapUrls({ origin: "http://localhost:3009", guidePaths: [] })
	assert(urls.every((url) => url.startsWith("http://localhost:3009")))
})

function mockDirectoryFetch(itemsByKind, options = {}) {
	const totalPages = options.totalPages || {}
	return async (url) => {
		const parsed = new URL(url)
		const kind = parsed.pathname.split("/").pop()
		const page = Number(parsed.searchParams.get("page") || "1")
		const items = itemsByKind[kind] || []
		return {
			ok: true,
			async json() {
				return {
					data: {
						kind,
						page,
						page_size: 50,
						total_items: items.length,
						total_pages: totalPages[kind] || 1,
						items: page === 1 ? items : [],
					},
				}
			},
		}
	}
}
