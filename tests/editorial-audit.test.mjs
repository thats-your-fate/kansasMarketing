import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { editorialAuditRows, guideQuestion, STATIC_EDITORIAL_URLS } from "../app/editorial-audit.mjs"

const explainerSource = readFileSync(new URL("../app/lib/explainers.ts", import.meta.url), "utf8")
const guideSlugs = [...explainerSource.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1])
const guides = guideSlugs.map((slug) => ({ slug, href: `/guides/${slug}` }))

test("every published guide has a specific user question", () => {
	for (const guide of guides) {
		const question = guideQuestion(guide.slug)
		assert.match(question, /\?$/)
		assert.notEqual(question, "What does this Kansas public record mean?")
	}
})

test("editorial audit inventory includes static pages and guides", () => {
	const rows = editorialAuditRows(guides)
	const paths = rows.map((row) => row.path)
	for (const path of STATIC_EDITORIAL_URLS) assert.ok(paths.includes(path), `${path} missing`)
	for (const guide of guides) assert.ok(paths.includes(guide.href), `${guide.href} missing`)
	assert.equal(new Set(paths).size, paths.length)
})
