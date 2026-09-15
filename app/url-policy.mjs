import { siteConfig } from "../site-config.mjs"

export const productionOrigin = normalizeCanonicalOrigin(siteConfig.defaultSiteUrl)

const TRACKING_PARAMS = new Set([
	"fbclid",
	"gclid",
	"gbraid",
	"mc_cid",
	"mc_eid",
	"msclkid",
	"utm_campaign",
	"utm_content",
	"utm_medium",
	"utm_source",
	"utm_term",
])

const IDENTITY_PARAMS = new Set(["filter", "page", "q", "sort"])

export function normalizeCanonicalOrigin(value = productionOrigin) {
	try {
		const url = new URL(value)
		if (url.protocol !== "http:" && url.protocol !== "https:") return productionOrigin
		url.pathname = ""
		url.search = ""
		url.hash = ""
		return url.toString().replace(/\/$/, "")
	} catch {
		return productionOrigin
	}
}

export function canonicalPath(path = "/", searchParams) {
	const [pathOnly, inlineQuery = ""] = String(path || "/").split("?")
	const normalizedPath = normalizePathname(pathOnly)
	const params = new URLSearchParams(inlineQuery)
	appendSearchParams(params, searchParams)
	const query = canonicalQueryString(params)
	return query ? `${normalizedPath}?${query}` : normalizedPath
}

export function buildCanonicalUrl(path = "/", options = {}) {
	const origin = normalizeCanonicalOrigin(options.origin || productionOrigin)
	return `${origin}${canonicalPath(path, options.searchParams) === "/" ? "" : canonicalPath(path, options.searchParams)}`
}

export function normalizeSlug(value) {
	return String(value || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

export function normalizeRecordIdentifier(value) {
	const trimmed = String(value || "").trim()
	if (!trimmed) return ""
	const digits = trimmed.replace(/\D/g, "")
	if (trimmed.includes("-") && digits.length >= 10) return digits
	return trimmed
}

export function recordPath(prefix, identifier, slug) {
	const normalizedPrefix = normalizePathname(prefix)
	const normalizedIdentifier = encodeURIComponent(normalizeRecordIdentifier(identifier))
	const normalizedSlug = normalizeSlug(slug)
	return normalizedSlug ? `${normalizedPrefix}/${normalizedIdentifier}/${encodeURIComponent(normalizedSlug)}` : `${normalizedPrefix}/${normalizedIdentifier}`
}

function normalizePathname(value) {
	const raw = String(value || "/").split("#")[0] || "/"
	const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`
	const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, "") || "/"
	return withoutTrailingSlash
		.split("/")
		.map((segment, index) => index === 0 ? "" : encodeURIComponent(safeDecode(segment)))
		.join("/") || "/"
}

function canonicalQueryString(params) {
	const kept = []
	for (const [key, value] of params.entries()) {
		const normalizedKey = key.toLowerCase()
		if (TRACKING_PARAMS.has(normalizedKey)) continue
		if (!IDENTITY_PARAMS.has(normalizedKey)) continue
		if (normalizedKey === "page") {
			const page = Number(value)
			if (!Number.isInteger(page) || page < 2) continue
		}
		kept.push([normalizedKey, value])
	}
	kept.sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
	const output = new URLSearchParams()
	for (const [key, value] of kept) output.append(key, value)
	return output.toString()
}

function appendSearchParams(params, searchParams) {
	if (!searchParams) return
	const source = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams)
	for (const [key, value] of source.entries()) params.append(key, value)
}

function safeDecode(value) {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}
