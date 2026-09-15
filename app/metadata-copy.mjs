const PUBLIC_BRAND = "Future Wells"

export function titleWithBrand(title) {
	return `${cleanText(title) || "Kansas Oil & Gas Records"} | ${PUBLIC_BRAND}`
}

export function countyMetadata(name, stats = {}) {
	const countyName = ensureCountyName(name)
	return {
		title: titleWithBrand(`${countyName}, KS Oil & Gas Wells`),
		description: compact([
			`${countyName}, Kansas oil and gas well records from public KGS data.`,
			countPhrase(stats.wellCount, "well record"),
			countPhrase(stats.producingCount, "producing record"),
			"Includes representative wells, operators, fields, status counts, and source context where available.",
		]),
	}
}

export function operatorMetadata(name, stats = {}) {
	const operatorName = cleanText(name) || "Kansas Operator"
	return {
		title: titleWithBrand(`${operatorName} - Kansas Wells & Activity`),
		description: compact([
			`Kansas well records associated with ${operatorName} in public KGS data.`,
			countPhrase(stats.wellCount, "well record"),
			countPhrase(stats.producingCount, "producing record"),
			"Includes county, field, status, and representative well context where available.",
		]),
	}
}

export function fieldMetadata(name, stats = {}) {
	const fieldName = ensureFieldName(name)
	return {
		title: titleWithBrand(`${fieldName}, KS Oil & Gas Wells`),
		description: compact([
			`${fieldName} Kansas oil and gas well records from public KGS data.`,
			countPhrase(stats.wellCount, "well record"),
			countPhrase(stats.producingCount, "producing record"),
			"Includes county, operator, status, and representative well context where available.",
		]),
	}
}

export function wellMetadata(well) {
	const title = cleanText(wellTitleParts(well).join(" - ")) || "Kansas Well Record"
	const api = wellApiText(well)
	const county = countyForTitle(well?.county)
	return {
		title: titleWithBrand(title),
		description: compact([
			`Kansas public well record${api ? ` for ${api}` : ""}${county ? ` in ${county}, Kansas` : ""}.`,
			statusText(well?.lifecycle_status),
			"Includes operator, field, lease, dates, depth, location, and source context where available.",
		]),
	}
}

export function unavailableMetadata(kind) {
	const label = cleanText(kind) || "Record"
	return {
		title: titleWithBrand(`Kansas ${label} Unavailable`),
		description: `No Kansas ${label.toLowerCase()} page is available for this public-record path right now.`,
	}
}

export function wellDisplayName(well) {
	const lease = cleanText(well?.lease_name)
	const name = cleanText(well?.well_name)
	if (lease && name && lease.toLowerCase() !== name.toLowerCase()) return `${titleCase(lease)} ${name}`
	if (name) return titleCase(name)
	if (lease) return titleCase(lease)
	return wellApiText(well) || (cleanText(well?.kgs_kid) ? `KGS KID ${cleanText(well.kgs_kid)}` : "Kansas well")
}

function wellTitleParts(well) {
	const displayName = wellDisplayName(well)
	const api = wellApiText(well)
	const county = countyForTitle(well?.county)
	const parts = [displayName]
	if (api && displayName !== api) parts.push(api)
	if (county) parts.push(`${county}, KS`)
	return parts
}

function wellApiText(well) {
	const apiRaw = cleanText(well?.api_raw)
	const api14 = cleanText(well?.api14)
	if (apiRaw) return `API ${apiRaw}`
	if (api14) return `API ${api14}`
	return ""
}

function statusText(value) {
	const status = cleanText(value)
	return status ? `Inventory status: ${status.replace(/_/g, " ")}.` : ""
}

function countPhrase(value, label) {
	const number = Number(value)
	if (!Number.isFinite(number) || number <= 0) return ""
	return `${number.toLocaleString("en-US")} ${label}${number === 1 ? "" : "s"}.`
}

function ensureCountyName(value) {
	const cleaned = cleanText(value)
	if (!cleaned) return "Kansas County"
	return /\bCounty$/i.test(cleaned) ? titleCase(cleaned) : `${titleCase(cleaned)} County`
}

function ensureFieldName(value) {
	const cleaned = cleanText(value)
	if (!cleaned) return "Kansas Field"
	return /\bField$/i.test(cleaned) ? titleCase(cleaned) : `${titleCase(cleaned)} Field`
}

function countyForTitle(value) {
	const cleaned = cleanText(value)
	if (!cleaned) return ""
	return /\bCounty$/i.test(cleaned) ? titleCase(cleaned).replace(/\s+County$/i, " County") : `${titleCase(cleaned)} County`
}

function compact(parts) {
	return parts.map(cleanText).filter(Boolean).join(" ")
}

function cleanText(value) {
	return String(value ?? "").replace(/\s+/g, " ").trim()
}

function titleCase(value) {
	return cleanText(value).toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}
