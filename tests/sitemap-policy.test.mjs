import assert from "node:assert/strict"
import test from "node:test"
import {
	MAX_SITEMAP_URLS,
	assertSitemapUrlSet,
	eligibleSitemapUrls,
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
	assert(!urls.some((url) => url.includes("?")))
	assert.equal(new Set(urls).size, urls.length)
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
