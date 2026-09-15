import assert from "node:assert/strict"
import test from "node:test"
import {
	countyMetadata,
	fieldMetadata,
	operatorMetadata,
	unavailableMetadata,
	wellDisplayName,
	wellMetadata,
} from "../app/metadata-copy.mjs"

test("county metadata uses the county name and counts without duplicated county suffix", () => {
	const metadata = countyMetadata("Montgomery County", { wellCount: 22387, producingCount: 1200 })
	assert.equal(metadata.title, "Montgomery County, KS Oil & Gas Wells | Future Wells")
	assert.match(metadata.description, /22,387 well records/)
	assert.doesNotMatch(metadata.title, /County County/)
})

test("operator metadata handles special characters", () => {
	const metadata = operatorMetadata("A&B Operating, LLC", { wellCount: 12 })
	assert.equal(metadata.title, "A&B Operating, LLC - Kansas Wells & Activity | Future Wells")
	assert.match(metadata.description, /A&B Operating, LLC/)
	assert.doesNotMatch(metadata.description, /undefined|null/)
})

test("field metadata adds a field suffix only when needed", () => {
	assert.equal(fieldMetadata("WILDCAT").title, "Wildcat Field, KS Oil & Gas Wells | Future Wells")
	assert.equal(fieldMetadata("Wildcat Field").title, "Wildcat Field, KS Oil & Gas Wells | Future Wells")
})

test("well metadata includes stable API and county when available", () => {
	const metadata = wellMetadata({
		api_raw: "15-163-24539",
		api14: "15163245390000",
		kgs_kid: "1057551044",
		well_name: "1",
		lease_name: "ALLAN",
		county: "Rooks County",
		lifecycle_status: "planned",
	})
	assert.equal(metadata.title, "Allan 1 - API 15-163-24539 - Rooks County, KS | Future Wells")
	assert.match(metadata.description, /API 15-163-24539/)
	assert.match(metadata.description, /Rooks County, Kansas/)
	assert.doesNotMatch(metadata.title + metadata.description, /undefined|null/)
})

test("well metadata falls back cleanly for missing names and long identifiers", () => {
	const metadata = wellMetadata({
		api14: "151234567890001234567890",
		kgs_kid: "9999999999",
		well_name: "",
		lease_name: "",
		county: "",
		lifecycle_status: null,
	})
	assert.equal(metadata.title, "API 151234567890001234567890 | Future Wells")
	assert.doesNotMatch(metadata.description, /undefined|null/)
})

test("duplicate well names stay distinguishable by stable ID", () => {
	const first = wellMetadata({ api_raw: "15-001-00001", well_name: "1", lease_name: "Smith", county: "Allen County" })
	const second = wellMetadata({ api_raw: "15-003-00001", well_name: "1", lease_name: "Smith", county: "Anderson County" })
	assert.notEqual(first.title, second.title)
})

test("display names and unavailable metadata do not leak template placeholders", () => {
	assert.equal(wellDisplayName({ kgs_kid: "12345" }), "KGS KID 12345")
	const metadata = unavailableMetadata("Well")
	assert.equal(metadata.title, "Kansas Well Unavailable | Future Wells")
	assert.doesNotMatch(metadata.description, /undefined|null/)
})
