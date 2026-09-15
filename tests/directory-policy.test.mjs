import assert from "node:assert/strict"
import test from "node:test"
import {
	entityDirectoryPath,
	paginateDirectoryItems,
	parseDirectoryPage,
} from "../app/directory-policy.mjs"

test("builds crawlable entity directory page paths", () => {
	assert.equal(entityDirectoryPath("counties"), "/counties")
	assert.equal(entityDirectoryPath("operators", 1), "/operators")
	assert.equal(entityDirectoryPath("fields", 2), "/fields?page=2")
	assert.throws(() => entityDirectoryPath("wells"), /Unknown Kansas directory kind/)
})

test("bounds directory page parameters", () => {
	assert.equal(parseDirectoryPage(undefined), 1)
	assert.equal(parseDirectoryPage(""), 1)
	assert.equal(parseDirectoryPage(["3", "4"]), 3)
	assert.equal(parseDirectoryPage("2"), 2)
	assert.equal(parseDirectoryPage("0"), null)
	assert.equal(parseDirectoryPage("-1"), null)
	assert.equal(parseDirectoryPage("1.5"), null)
	assert.equal(parseDirectoryPage("last"), null)
})

test("fixture pagination covers every record exactly once", () => {
	const items = [
		{ id: "a", displayName: "Allen County" },
		{ id: "b", displayName: "Allen County" },
		{ id: "c", displayName: "Chase & West Field" },
		{ id: "d", displayName: "Zeta Operator" },
		{ id: "e", displayName: "Zeta Operator" },
	]
	const pages = [1, 2, 3].map((page) => paginateDirectoryItems(items, page, 2))
	assert.deepEqual(pages.map((page) => page?.items.map((item) => item.id)), [["a", "b"], ["c", "d"], ["e"]])
	assert.equal(paginateDirectoryItems(items, 4, 2), null)

	const collected = pages.flatMap((page) => page?.items.map((item) => item.id) || [])
	assert.equal(collected.length, items.length)
	assert.equal(new Set(collected).size, items.length)
	assert.deepEqual(collected.toSorted(), items.map((item) => item.id).toSorted())
})
