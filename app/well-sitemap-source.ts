import { apiBaseUrl } from "@/app/config"

export type WellSitemapEntry = {
	id: string
	api14: string | null
	api_raw: string | null
	kgs_kid: string | null
	well_name: string | null
	lease_name: string | null
	lastmod: string | null
}

export type WellSitemapPage = {
	tier: "primary"
	page: number
	page_size: number
	total_pages: number
	total_items: number
	entries: WellSitemapEntry[]
}

/** One page of primary-tier wells from the backend (cached there for hours). */
export async function loadWellSitemapPage(page: number): Promise<WellSitemapPage | null> {
	try {
		const response = await fetch(`${apiBaseUrl}/api/ks/seo/sitemap-wells?page=${page}`, {
			cache: "no-store",
			signal: AbortSignal.timeout(60000),
		})
		if (!response.ok) return null
		const envelope = (await response.json()) as { data?: WellSitemapPage }
		const data = envelope?.data
		if (!data || !Array.isArray(data.entries) || !Number.isInteger(data.total_pages)) return null
		return data
	} catch {
		return null
	}
}

export function wellSitemapResponse(body: string) {
	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
			"X-Robots-Tag": "noindex, follow",
		},
	})
}
