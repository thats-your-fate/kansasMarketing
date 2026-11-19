// JSON-LD for Kansas well and entity detail pages, following the shapes
// coloradoMarketing's app/structured-data-builders.mjs emits for the same
// page types: a WebPage/CollectionPage, its BreadcrumbList, the page subject
// (a well, an operator Organization, or a county/field Place) and, on entity
// pages, an ItemList of the wells shown. Callers pass absolute canonical URLs
// so this module stays free of site configuration and is easy to test.

const SCHEMA_CONTEXT = "https://schema.org"

/**
 * @param {{ name: string, url: string }[]} items
 */
export function buildBreadcrumbList(items) {
	const usable = (items || []).filter((item) => cleanText(item?.name) && item?.url)
	if (!usable.length) return null
	return withContext({
		"@type": "BreadcrumbList",
		itemListElement: usable.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: cleanText(item.name),
			item: item.url,
		})),
	})
}

/**
 * @param {{
 *   name: string, description?: string, url: string, siteUrl: string,
 *   breadcrumbs?: { name: string, url: string }[],
 *   api?: string | null, kgsKid?: string | null, kccPermit?: string | null,
 *   latitude?: number | null, longitude?: number | null,
 *   county?: string | null, dateModified?: string | null,
 * }} input
 */
export function buildWellPageJsonLd(input) {
	const url = input.url
	const identifier = [
		propertyValue("API", input.api),
		propertyValue("KGS KID", input.kgsKid),
		propertyValue("KCC permit", input.kccPermit),
	].filter(Boolean)
	const subject = compact({
		"@type": "Place",
		"@id": `${url}#well`,
		name: cleanText(input.name),
		url,
		description: cleanText(input.description),
		identifier: identifier.length ? identifier : undefined,
		geo: geoCoordinates(input),
		containedInPlace: cleanText(input.county)
			? { "@type": "AdministrativeArea", name: cleanText(input.county), containedInPlace: { "@type": "State", name: "Kansas" } }
			: { "@type": "State", name: "Kansas" },
	})
	return [
		webPage({ type: "WebPage", input, mainEntity: { "@id": subject["@id"] } }),
		buildBreadcrumbList(input.breadcrumbs),
		withContext(subject),
	].filter(Boolean)
}

/**
 * @param {{
 *   kind: "counties" | "operators" | "fields",
 *   name: string, description?: string, url: string, siteUrl: string,
 *   breadcrumbs?: { name: string, url: string }[],
 *   wells?: { name: string, url: string }[],
 *   dateModified?: string | null,
 * }} input
 */
export function buildEntityPageJsonLd(input) {
	const url = input.url
	const isOperator = input.kind === "operators"
	const subject = compact({
		"@type": isOperator ? "Organization" : "Place",
		"@id": `${url}#${isOperator ? "operator" : "place"}`,
		name: cleanText(input.name),
		url,
		containedInPlace: isOperator ? undefined : { "@type": "State", name: "Kansas" },
	})
	const wells = dedupeByUrl(input.wells || []).filter((well) => cleanText(well.name))
	const itemList = wells.length
		? withContext({
			"@type": "ItemList",
			"@id": `${url}#item-list`,
			name: `${cleanText(input.name)} wells`,
			numberOfItems: wells.length,
			itemListElement: wells.map((well, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: cleanText(well.name),
				url: well.url,
			})),
		})
		: null
	return [
		webPage({
			type: "CollectionPage",
			input,
			about: { "@id": subject["@id"] },
			mainEntity: itemList ? { "@id": itemList["@id"] } : { "@id": subject["@id"] },
		}),
		buildBreadcrumbList(input.breadcrumbs),
		withContext(subject),
		itemList,
	].filter(Boolean)
}

/**
 * Serialize for a <script type="application/ld+json"> body; "<" is escaped so
 * record text can never close the script element.
 * @param {unknown} data
 */
export function serializeJsonLd(data) {
	return JSON.stringify(data).replace(/</g, "\\u003c")
}

function webPage({ type, input, about, mainEntity }) {
	return withContext(compact({
		"@type": type,
		"@id": `${input.url}#webpage`,
		name: cleanText(input.name),
		description: cleanText(input.description),
		url: input.url,
		dateModified: isoDate(input.dateModified),
		isPartOf: { "@type": "WebSite", "@id": `${input.siteUrl}#website`, url: input.siteUrl },
		about,
		mainEntity,
	}))
}

function geoCoordinates(input) {
	const latitude = Number(input.latitude)
	const longitude = Number(input.longitude)
	if (input.latitude == null || input.longitude == null) return undefined
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined
	if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (latitude === 0 && longitude === 0)) return undefined
	return { "@type": "GeoCoordinates", latitude, longitude }
}

function propertyValue(propertyID, value) {
	const text = cleanText(value)
	return text ? { "@type": "PropertyValue", propertyID, value: text } : null
}

function isoDate(value) {
	if (!value) return undefined
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00Z` : value)
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

function dedupeByUrl(items) {
	const seen = new Set()
	return items.filter((item) => {
		if (!item?.url || seen.has(item.url)) return false
		seen.add(item.url)
		return true
	})
}

function cleanText(value) {
	if (value == null) return ""
	return String(value).replace(/\s+/g, " ").trim()
}

function compact(object) {
	return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ""))
}

function withContext(object) {
	return { "@context": SCHEMA_CONTEXT, ...object }
}
