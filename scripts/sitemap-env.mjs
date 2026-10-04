import { siteConfig } from "../site-config.mjs"

export function publicBaseUrlFromEnv() {
	return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || siteConfig.defaultSiteUrl)
}

function normalizeOrigin(value) {
	const url = new URL(value)
	url.pathname = ""
	url.search = ""
	url.hash = ""
	return url.toString().replace(/\/$/, "")
}
