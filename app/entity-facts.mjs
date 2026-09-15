export function hasReportedNumber(value) {
	return value !== null && value !== undefined && Number.isFinite(Number(value))
}

export function productionEvidenceForWell(well = {}) {
	if (well.lifecycle_status === "producing") return "KGS lifecycle status reports producing."
	if ([well.ip_oil, well.ip_gas, well.ip_water].some(hasReportedNumber)) {
		return "Initial completion test values are present. These are source completion-test values, not current monthly well production."
	}
	return "No current well-level production volume is reported on this Kansas well card."
}

export function publicWellRelationshipFacts(well = {}) {
	return {
		county: cleanText(well.county),
		operator: cleanText(well.operator),
		field: cleanText(well.field_name),
		lease: cleanText(well.lease_name),
	}
}

export function stableRecordKey(record = {}) {
	return cleanText(record.api14)
		|| cleanText(record.api_raw)
		|| cleanText(record.kgs_kid)
		|| cleanText(record.id)
		|| cleanText(record.key)
		|| cleanText(record.display_name)
		|| ""
}

export function sourceDateFacts(well = {}) {
	return {
		sourceEventDates: {
			permitDate: cleanText(well.permit_date),
			spudDate: cleanText(well.spud_date),
			completionDate: cleanText(well.completion_date),
			plugDate: cleanText(well.plug_date),
		},
		reportingPeriod: null,
		sourcePublishedOrUpdatedAt: null,
		localFirstSeenAt: cleanText(well.first_seen_at),
		localLastSeenAt: cleanText(well.last_seen_at),
	}
}

export function deduplicatedLeasePeriodTotals(records = []) {
	const latestByPeriod = new Map()
	let skipped = 0
	for (const record of records) {
		const lease = cleanText(record.lease_id) || cleanText(record.lease_kid)
		const product = cleanText(record.product) || "unknown"
		const period = cleanText(record.period) || periodFromParts(record)
		if (!lease || !period) {
			skipped += 1
			continue
		}
		const key = [lease, product, period].join("|")
		const current = latestByPeriod.get(key)
		if (!current || observedTime(record) > observedTime(current)) {
			latestByPeriod.set(key, record)
		}
	}

	const totals = {}
	for (const record of latestByPeriod.values()) {
		const product = cleanText(record.product) || "unknown"
		if (!hasReportedNumber(record.volume)) continue
		totals[product] = (totals[product] || 0) + Number(record.volume)
	}

	return {
		inputCount: records.length,
		deduplicatedCount: latestByPeriod.size,
		skippedCount: skipped,
		totals,
	}
}

function periodFromParts(record) {
	const year = cleanText(record.year)
	const month = cleanText(record.month)
	if (!year) return ""
	return month ? `${year}-${String(month).padStart(2, "0")}` : year
}

function observedTime(record) {
	const value = cleanText(record.source_observed_at) || cleanText(record.observed_at) || cleanText(record.ingested_at)
	const time = Date.parse(value)
	return Number.isFinite(time) ? time : 0
}

function cleanText(value) {
	if (value === null || value === undefined) return ""
	return String(value).trim()
}
