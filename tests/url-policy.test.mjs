import assert from "node:assert/strict"
import test from "node:test"
import {
	buildCanonicalUrl,
	canonicalPath,
	normalizeCanonicalOrigin,
	normalizeRecordIdentifier,
	normalizeSlug,
	recordPath,
} from "../app/url-policy.mjs"

test("normalizes canonical origins", () => {
	const cases = [
		["https://futurewellskansas.com/", "https://futurewellskansas.com"],
		["https://futurewellskansas.com/some/path?x=1#top", "https://futurewellskansas.com"],
		["http://localhost:3009/", "http://localhost:3009"],
		["not a url", "https://futurewellskansas.com"],
	]
	for (const [input, expected] of cases) {
		assert.equal(normalizeCanonicalOrigin(input), expected)
	}
})

test("builds absolute canonicals with normalized slashes and encoding", () => {
	const cases = [
		["/", "https://futurewellskansas.com"],
		["browse/", "https://futurewellskansas.com/browse"],
		["/guides/kcc and kgs explainer/", "https://futurewellskansas.com/guides/kcc%20and%20kgs%20explainer"],
		["/operators/Eiger%20Operating%20Company%2C%20LLC", "https://futurewellskansas.com/operators/Eiger%20Operating%20Company%2C%20LLC"],
	]
	for (const [path, expected] of cases) {
		assert.equal(buildCanonicalUrl(path), expected)
	}
})

test("drops tracking params without changing page identity", () => {
	assert.equal(
		buildCanonicalUrl("/browse?utm_source=a&utm_medium=b&fbclid=123"),
		"https://futurewellskansas.com/browse",
	)
	assert.equal(
		buildCanonicalUrl("/guides/kcc-and-kgs-explainer", { searchParams: "utm_campaign=x&gclid=y" }),
		"https://futurewellskansas.com/guides/kcc-and-kgs-explainer",
	)
})

test("preserves meaningful pagination, sort, search, and filter identity", () => {
	const cases = [
		["/browse?page=1", "/browse"],
		["/browse?page=2", "/browse?page=2"],
		["/browse?page=999", "/browse?page=999"],
		["/browse?page=last", "/browse"],
		["/browse?page=0", "/browse"],
		["/browse?page=-1", "/browse"],
		["/browse?page=2&sort=county", "/browse?page=2&sort=county"],
		["/browse?sort=county&page=2", "/browse?page=2&sort=county"],
		["/browse?filter=producing&sort=county&page=2&utm_source=x", "/browse?filter=producing&page=2&sort=county"],
		["/browse?q=allen+county", "/browse?q=allen+county"],
	]
	for (const [input, expected] of cases) {
		assert.equal(canonicalPath(input), expected)
	}
})

test("normalizes slugs and stable record identifiers", () => {
	assert.equal(normalizeSlug("Eiger Operating Company, LLC"), "eiger-operating-company-llc")
	assert.equal(normalizeSlug("A&B / Producing #1"), "a-and-b-producing-1")
	assert.equal(normalizeSlug("Café Field"), "cafe-field")
	assert.equal(normalizeRecordIdentifier("15-163-24539"), "1516324539")
	assert.equal(normalizeRecordIdentifier("15163245390000"), "15163245390000")
	assert.equal(recordPath("/wells", "15-163-24539", "Allan 1"), "/wells/1516324539/allan-1")
})

test("keeps duplicate display names distinct when stable IDs differ", () => {
	const first = recordPath("/wells", "15163245390000", "Duplicate Well")
	const second = recordPath("/wells", "15015242530000", "Duplicate Well")
	assert.notEqual(first, second)
	assert.equal(first, "/wells/15163245390000/duplicate-well")
	assert.equal(second, "/wells/15015242530000/duplicate-well")
})
