import type { Metadata } from "next"
import { indexingEnabled, publicBaseUrl, siteConfig } from "@/app/config"

// Simplified from coloradoMarketing's app/seo.ts: Colorado's version also
// gates deep-pagination/thin-content well/operator/county/field pages via
// a route-prefix allowlist (app/seo-policy.ts) that this site has no
// equivalent of — every route this repo builds is an intentional,
// approved marketing/guide page (KS-18's own route list), so the only
// index/noindex decision left is the existing site-wide `indexingEnabled`
// safety gate from app/config.ts.

export const siteName = siteConfig.brandName
export const siteUrl = publicBaseUrl

type SeoMetadataInput = {
	title: string
	description: string
	path: string
	type?: "website" | "article"
	noIndex?: boolean
}

export function seoMetadata({ title, description, path, type = "website", noIndex = false }: SeoMetadataInput): Metadata {
	const canonical = canonicalUrl(path)
	const shouldIndex = indexingEnabled && !noIndex
	return {
		title: { absolute: title },
		description,
		alternates: { canonical },
		robots: shouldIndex ? { index: true, follow: true } : { index: false, follow: false },
		openGraph: {
			title,
			description,
			url: canonical,
			siteName,
			type,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
		},
	}
}

export function canonicalUrl(path = "/") {
	const normalized = path.startsWith("/") ? path : `/${path}`
	return `${siteUrl}${normalized === "/" ? "" : normalized}`
}
