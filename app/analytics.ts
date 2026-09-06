export type AnalyticsEventName = "account_cta_view" | "account_cta_click"

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>

type WindowWithGtag = Window & { gtag?: (...args: unknown[]) => void }

export function trackEvent(name: AnalyticsEventName, params: AnalyticsParams = {}) {
	if (typeof window === "undefined" || isAnalyticsBlockedPath(window.location.pathname)) return
	const gtag = (window as WindowWithGtag).gtag
	if (typeof gtag !== "function") return
	try {
		gtag("event", name, cleanParams(params))
	} catch {
		// Analytics must never interrupt a product flow.
	}
}

export function isAnalyticsBlockedPath(pathname: string | null | undefined) {
	return pathname === "/app" || pathname?.startsWith("/app/")
}

function cleanParams(params: AnalyticsParams) {
	const cleaned: Record<string, string | number | boolean> = {}
	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined || value === "") continue
		cleaned[key] = value
	}
	return cleaned
}
