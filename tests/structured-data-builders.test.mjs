import assert from "node:assert/strict"
import test from "node:test"
import { buildEntityPageJsonLd, buildWellPageJsonLd, serializeJsonLd } from "../app/structured-data-builders.mjs"

const site = "https://futurewellskansas.com/"
const wellUrl = "https://futurewellskansas.com/wells/15007230140000/ewb-ranch-b-2"

test("well page emits WebPage, breadcrumbs and a well with API/KGS identifiers", () => {
	const [page, breadcrumbs, well] = buildWellPageJsonLd({
		name: "Ewb Ranch B 2",
		description: "Kansas well record.",
		url: wellUrl,
		siteUrl: site,
		breadcrumbs: [{ name: "Home", url: site }, { name: "API 15-007-23014", url: wellUrl }],
		api: "15-007-23014",
		kgsKid: "1044234567",
		kccPermit: null,
		latitude: 37.1,
		longitude: -98.6,
		county: "Barber County",
		dateModified: "2026-11-18T10:59:11Z",
	})
	assert.equal(page["@type"], "WebPage")
	assert.equal(page.mainEntity["@id"], `${wellUrl}#well`)
	assert.equal(page.dateModified, "2026-11-18")
	assert.equal(breadcrumbs["@type"], "BreadcrumbList")
	assert.equal(breadcrumbs.itemListElement[1].position, 2)
	assert.deepEqual(well.identifier.map((item) => item.propertyID), ["API", "KGS KID"])
	assert.equal(well["@type"], "Place")
	assert.deepEqual(well.geo, { "@type": "GeoCoordinates", latitude: 37.1, longitude: -98.6 })
	assert.equal(well.containedInPlace.name, "Barber County")
})

test("well page drops missing or placeholder coordinates and identifiers", () => {
	const schemas = buildWellPageJsonLd({ name: "Well", url: wellUrl, siteUrl: site, latitude: 0, longitude: 0 })
	const well = schemas.find((schema) => schema["@id"] === `${wellUrl}#well`)
	assert.equal(well.geo, undefined)
	assert.equal(well.identifier, undefined)
	assert.equal(schemas.some((schema) => schema["@type"] === "BreadcrumbList"), false)
})

test("operator pages describe an Organization and list the wells shown", () => {
	const url = "https://futurewellskansas.com/operators/14start-energy-llc"
	const schemas = buildEntityPageJsonLd({
		kind: "operators",
		name: "14Start Energy LLC",
		url,
		siteUrl: site,
		wells: [
			{ name: "Ewb Ranch B 2", url: wellUrl },
			{ name: "Ewb Ranch B 2", url: wellUrl },
			{ name: "Davis Ranch 3-6", url: "https://futurewellskansas.com/wells/15007229610000/davis-ranch-3-6" },
		],
	})
	const types = schemas.map((schema) => schema["@type"])
	assert.deepEqual(types, ["CollectionPage", "Organization", "ItemList"])
	const list = schemas[2]
	assert.equal(list.numberOfItems, 2)
	assert.equal(schemas[0].mainEntity["@id"], `${url}#item-list`)
})

test("county and field pages describe a Place in Kansas", () => {
	const schemas = buildEntityPageJsonLd({ kind: "fields", name: "Hugoton Gas Area Field", url: "https://futurewellskansas.com/fields/hugoton-gas-area", siteUrl: site })
	const place = schemas.find((schema) => schema["@type"] === "Place")
	assert.deepEqual(place.containedInPlace, { "@type": "State", name: "Kansas" })
	assert.equal(schemas[0].mainEntity["@id"], place["@id"])
})

test("serialized JSON-LD cannot close its script element", () => {
	const text = serializeJsonLd({ name: "</script><script>alert(1)</script>" })
	assert(!text.includes("</script>"))
	assert.deepEqual(JSON.parse(text), { name: "</script><script>alert(1)</script>" })
})
