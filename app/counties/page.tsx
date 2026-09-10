import type { Metadata } from "next"
import { EntityIndexPage } from "@/app/kansas-entity-pages"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export const metadata: Metadata = seoMetadata({
	title: `Kansas Oil & Gas Counties | ${siteConfig.brandName}`,
	description: "Browse Kansas county oil and gas record cards with public well counts and representative KGS-backed context.",
	path: "/counties",
})

export default function KansasCountiesIndexPage() {
	return <EntityIndexPage kind="counties" />
}
