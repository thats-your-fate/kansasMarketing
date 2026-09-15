import type { Metadata } from "next"
import { EntityIndexPage } from "@/app/kansas-entity-pages"
import { seoMetadata } from "@/app/seo"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export const metadata: Metadata = seoMetadata({
	title: "Kansas Oil & Gas Field Pages | Future Wells",
	description: "Browse top Kansas field landing cards with public KGS well counts and representative field-level oil and gas context.",
	path: "/fields",
})

export default function KansasFieldsIndexPage() {
	return <EntityIndexPage kind="fields" />
}
