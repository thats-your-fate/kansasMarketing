export const WORKFLOW_GUIDE_LINKS = {
	"Well and lease activity": "/guides/api-number-and-kgs-kid-explainer",
	"Drilling intent signals": "/guides/c1-notice-of-intent-explainer",
	"County and PLSS context": "/guides/plss-location-explainer",
	"Completion and plugging records": "/guides/aco1-completion-form-explainer",
	"Operator and transfer context": "/guides/t1-operator-transfer-explainer",
	"Lease production and documents": "/guides/lease-vs-well-production-explainer",
}

export function guideHrefForWorkflow(title) {
	return WORKFLOW_GUIDE_LINKS[title] || null
}

export function summarizeBrowsePreview(page = {}) {
	const topCounties = Array.isArray(page.top_counties) ? page.top_counties : []
	const topOperators = Array.isArray(page.top_operators) ? page.top_operators : []
	const topFields = Array.isArray(page.top_fields) ? page.top_fields : []
	const recentActivity = Array.isArray(page.recent_activity) ? page.recent_activity : []
	const representedWells = [...topCounties, ...topOperators, ...topFields]
		.reduce((total, item) => total + safeCount(item?.well_count), 0)
	const latestActivity = recentActivity
		.map((event) => eventDateValue(event))
		.filter((date) => date.value > 0)
		.sort((left, right) => right.value - left.value)[0] || null

	return {
		featuredCountyRows: topCounties.length,
		featuredOperatorRows: topOperators.length,
		featuredFieldRows: topFields.length,
		recentActivityRows: recentActivity.length,
		representedWells,
		latestActivityDate: latestActivity?.date || null,
		latestActivityDateKind: latestActivity?.kind || null,
	}
}

export function activityDateKind(event = {}) {
	if (event.event_date) return "source activity date"
	if (event.observed_at) return "local observation date"
	return "date not returned"
}

function eventDateValue(event = {}) {
	const date = event.event_date || event.observed_at || ""
	const value = Date.parse(date)
	return {
		date: date || null,
		kind: activityDateKind(event),
		value: Number.isFinite(value) ? value : 0,
	}
}

function safeCount(value) {
	const count = Number(value)
	return Number.isFinite(count) && count > 0 ? count : 0
}
