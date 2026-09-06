import { features as configuredFeatures, siteConfig as configuredSiteConfig } from "@/site-config.mjs"

export const siteConfig = {
	...configuredSiteConfig,
}

export const stateConfig = {
	code: siteConfig.stateCode,
	name: siteConfig.stateName,
	slug: siteConfig.stateSlug,
	siteName: siteConfig.brandName,
	defaultBaseUrl: siteConfig.defaultSiteUrl,
	officialAgencyName: siteConfig.officialAgencyName,
	secondaryAgencyName: siteConfig.secondaryAgencyName,
} as const

export const features = {
	...configuredFeatures,
}

export const apiBaseUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:4008"

const configuredPublicBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL
const indexingRequested = process.env.NEXT_PUBLIC_INDEXING_ENABLED === "true"

export const publicBaseUrl = normalizePublicBaseUrl(configuredPublicBaseUrl)
export const indexingEnabled = indexingRequested && isIndexablePublicBaseUrl(configuredPublicBaseUrl)

const analyticsRequested = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true"
export const analyticsMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""
export const analyticsEnabled = analyticsRequested && isGoogleAnalyticsMeasurementId(analyticsMeasurementId)

if (indexingRequested && !indexingEnabled && process.env.NODE_ENV === "production") {
	throw new Error(
		"NEXT_PUBLIC_INDEXING_ENABLED=true requires NEXT_PUBLIC_SITE_URL to be a real https Kansas production URL. Refusing to build with unsafe indexing.",
	)
}

export function normalizePublicBaseUrl(value?: string) {
	if (!value) return siteConfig.defaultSiteUrl
	try {
		const url = new URL(value)
		if (url.protocol !== "https:" && url.protocol !== "http:") return siteConfig.defaultSiteUrl
		url.pathname = url.pathname.replace(/\/+$/, "")
		url.search = ""
		url.hash = ""
		return url.toString().replace(/\/$/, "")
	} catch {
		return siteConfig.defaultSiteUrl
	}
}

export function isIndexablePublicBaseUrl(value?: string) {
	if (!value) return false
	try {
		const url = new URL(value)
		const hostname = url.hostname.toLowerCase()
		if (url.protocol !== "https:") return false
		if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) return false
		if (hostname.includes("example.") || hostname.includes("placeholder") || hostname.includes("your-domain")) return false
		const productionHostname = new URL(siteConfig.defaultSiteUrl).hostname.toLowerCase()
		return hostname === productionHostname || hostname.endsWith(`.${productionHostname}`)
	} catch {
		return false
	}
}

export function isGoogleAnalyticsMeasurementId(value?: string) {
	return /^G-[A-Z0-9]+$/.test(value || "")
}
