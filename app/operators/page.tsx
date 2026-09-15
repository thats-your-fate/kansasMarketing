import type { Metadata } from "next"
import { EntityIndexPage } from "@/app/kansas-entity-pages"
import { seoMetadata } from "@/app/seo"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export const metadata: Metadata = seoMetadata({
	title: "Kansas Operator Well Pages | Future Wells",
	description: "Browse Kansas operator landing cards with public KGS well counts and representative operator-level oil and gas context.",
	path: "/operators",
})

export default function KansasOperatorsIndexPage() {
	return <EntityIndexPage kind="operators" />
}
