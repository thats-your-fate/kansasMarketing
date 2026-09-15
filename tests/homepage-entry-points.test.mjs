import assert from "node:assert/strict"
import test from "node:test"
import {
	activityDateKind,
	guideHrefForWorkflow,
	summarizeBrowsePreview,
} from "../app/homepage-entry-points.mjs"

test("links homepage workflows to implemented guides", () => {
	assert.equal(guideHrefForWorkflow("Drilling intent signals"), "/guides/c1-notice-of-intent-explainer")
	assert.equal(guideHrefForWorkflow("County and PLSS context"), "/guides/plss-location-explainer")
	assert.equal(guideHrefForWorkflow("Missing workflow"), null)
})

test("summarizes browse preview without inventing statewide totals", () => {
	const summary = summarizeBrowsePreview({
		top_counties: [{ well_count: 10 }, { well_count: 5 }],
		top_operators: [{ well_count: 7 }],
		top_fields: [{ well_count: 3 }, { well_count: null }],
		recent_activity: [
			{ event_date: "2024-01-01", observed_at: "2024-01-03T00:00:00Z" },
			{ event_date: null, observed_at: "2024-01-05T00:00:00Z" },
		],
	})
	assert.equal(summary.featuredCountyRows, 2)
	assert.equal(summary.featuredOperatorRows, 1)
	assert.equal(summary.featuredFieldRows, 2)
	assert.equal(summary.recentActivityRows, 2)
	assert.equal(summary.representedWells, 25)
	assert.equal(summary.latestActivityDate, "2024-01-05T00:00:00Z")
	assert.equal(summary.latestActivityDateKind, "local observation date")
})

test("labels activity dates by source meaning", () => {
	assert.equal(activityDateKind({ event_date: "2024-01-01", observed_at: "2024-01-02" }), "source activity date")
	assert.equal(activityDateKind({ event_date: null, observed_at: "2024-01-02" }), "local observation date")
	assert.equal(activityDateKind({}), "date not returned")
})
