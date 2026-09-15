import type { Metadata } from "next"
import { EntityIndexPage } from "@/app/kansas-entity-pages"
import { seoMetadata } from "@/app/seo"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export const metadata: Metadata = seoMetadata({
	title: "Kansas County Oil & Gas Pages | Future Wells",
	description: "Browse Kansas county landing cards with public KGS well counts and representative county-level oil and gas context.",
	path: "/counties",
})

export default function KansasCountiesIndexPage() {
	return <EntityIndexPage kind="counties" />
}
