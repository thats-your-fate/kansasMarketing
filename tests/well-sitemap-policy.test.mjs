import assert from "node:assert/strict"
import test from "node:test"
import { isIndexableWellTier } from "../app/directory-policy.mjs"
import { parseWellSitemapPage, sitemapDate, wellSitemapIndexXml, wellSitemapPagePath, wellSitemapUrlsetXml } from "../app/well-sitemap-policy.mjs"

const origin = "https://futurewellskansas.com"

test("only thin wells are kept out of the index; a missing tier stays indexable", () => {
	assert.equal(isIndexableWellTier("thin"), false)
	assert.equal(isIndexableWellTier("primary"), true)
	assert.equal(isIndexableWellTier("secondary"), true)
	assert.equal(isIndexableWellTier(undefined), true)
})

test("index lists one root-level file per backend page", () => {
	const xml = wellSitemapIndexXml({ origin, totalPages: 3 })
	assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<sitemapindex /)
	assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]), [
		"https://futurewellskansas.com/sitemap-wells-1.xml",
		"https://futurewellskansas.com/sitemap-wells-2.xml",
		"https://futurewellskansas.com/sitemap-wells-3.xml",
	])
	assert.equal(wellSitemapPagePath(2), "/sitemap-wells-2.xml")
	assert.doesNotMatch(wellSitemapIndexXml({ origin, totalPages: 0 }), /<sitemap>/)
})

test("urlset uses the page's own path builder, dedupes and carries lastmod", () => {
	const entries = [
		{ api14: "15007230140000", name: "ewb-ranch-b-2", lastmod: "2026-07-01" },
		{ api14: "15007230140000", name: "ewb-ranch-b-2", lastmod: "2026-07-01" },
		{ api14: "15001000030001", name: "stoll-16", lastmod: null },
		{ api14: "x", name: "bad", lastmod: "2026-01-01" },
	]
	const xml = wellSitemapUrlsetXml({ origin, entries, pathFor: (entry) => (entry.api14 === "x" ? "/elsewhere" : `/wells/${entry.api14}/${entry.name}`) })
	assert.equal((xml.match(/<url>/g) || []).length, 2)
	assert.match(xml, /<url><loc>https:\/\/futurewellskansas.com\/wells\/15007230140000\/ewb-ranch-b-2<\/loc><lastmod>2026-07-01<\/lastmod><\/url>/)
	assert.match(xml, /<url><loc>https:\/\/futurewellskansas.com\/wells\/15001000030001\/stoll-16<\/loc><\/url>/)
})

test("lastmod is a W3C date never later than today", () => {
	assert.equal(sitemapDate("2026-07-01", "2026-11-19"), "2026-07-01")
	assert.equal(sitemapDate("2027-01-01", "2026-11-19"), "2026-11-19")
	assert.equal(sitemapDate("garbage"), null)
	assert.equal(sitemapDate(null), null)
})

test("only plain page numbers reach the backend", () => {
	assert.equal(parseWellSitemapPage("1"), 1)
	assert.equal(parseWellSitemapPage("0"), null)
	assert.equal(parseWellSitemapPage("01"), null)
	assert.equal(parseWellSitemapPage("1.xml"), null)
	assert.equal(parseWellSitemapPage("5000"), null)
})
