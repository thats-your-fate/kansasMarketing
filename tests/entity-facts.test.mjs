import assert from "node:assert/strict"
import test from "node:test"
import {
	deduplicatedLeasePeriodTotals,
	hasReportedNumber,
	productionEvidenceForWell,
	publicWellRelationshipFacts,
	sourceDateFacts,
	stableRecordKey,
} from "../app/entity-facts.mjs"

test("distinguishes missing numeric facts from reported zero values", () => {
	assert.equal(hasReportedNumber(0), true)
	assert.equal(hasReportedNumber("0"), true)
	assert.equal(hasReportedNumber(null), false)
	assert.equal(hasReportedNumber(undefined), false)
	assert.match(productionEvidenceForWell({ ip_oil: 0, ip_gas: null, ip_water: null }), /Initial completion test values/)
	assert.match(productionEvidenceForWell({ ip_oil: null, ip_gas: null, ip_water: null }), /No current well-level production/)
})

test("keeps source event dates separate from local observation dates", () => {
	const facts = sourceDateFacts({
		permit_date: "2024-02-01",
		completion_date: "2024-04-05",
		first_seen_at: "2024-05-01T00:00:00Z",
		last_seen_at: "2024-06-01T00:00:00Z",
	})
	assert.equal(facts.sourceEventDates.permitDate, "2024-02-01")
	assert.equal(facts.sourceEventDates.completionDate, "2024-04-05")
	assert.equal(facts.reportingPeriod, null)
	assert.equal(facts.sourcePublishedOrUpdatedAt, null)
	assert.equal(facts.localFirstSeenAt, "2024-05-01T00:00:00Z")
	assert.equal(facts.localLastSeenAt, "2024-06-01T00:00:00Z")
})

test("deduplicates lease-period production before totaling", () => {
	const totals = deduplicatedLeasePeriodTotals([
		{ lease_kid: "L1", product: "oil_bbl", period: "2024-01", volume: 10, well_id: "w1", source_observed_at: "2024-03-01" },
		{ lease_kid: "L1", product: "oil_bbl", period: "2024-01", volume: 10, well_id: "w2", source_observed_at: "2024-03-01" },
		{ lease_kid: "L1", product: "oil_bbl", period: "2024-01", volume: 12, well_id: "w1", source_observed_at: "2024-04-01" },
		{ lease_kid: "L1", product: "gas_mcf", period: "2024-01", volume: 0, well_id: "w1", source_observed_at: "2024-03-01" },
		{ lease_kid: "L2", product: "oil_bbl", year: 2024, month: 1, volume: 5, well_id: "w3" },
		{ lease_kid: "", product: "oil_bbl", period: "2024-01", volume: 99 },
	])
	assert.equal(totals.inputCount, 6)
	assert.equal(totals.deduplicatedCount, 3)
	assert.equal(totals.skippedCount, 1)
	assert.deepEqual(totals.totals, { oil_bbl: 17, gas_mcf: 0 })
})

test("retains partial relationships without inventing absent ones", () => {
	assert.deepEqual(publicWellRelationshipFacts({
		county: "Rooks",
		operator: " ",
		field_name: null,
		lease_name: "Allan",
	}), {
		county: "Rooks",
		operator: "",
		field: "",
		lease: "Allan",
	})
})

test("duplicate display names remain distinguishable by stable identifiers", () => {
	const first = stableRecordKey({ display_name: "Duplicate Well", api14: "15163245390000" })
	const second = stableRecordKey({ display_name: "Duplicate Well", api14: "15015242530000" })
	assert.notEqual(first, second)
	assert.equal(first, "15163245390000")
	assert.equal(second, "15015242530000")
})
