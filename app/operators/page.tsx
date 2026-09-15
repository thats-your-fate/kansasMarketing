import type { Metadata } from "next"
import { EntityIndexPage, generateEntityIndexMetadata, parseDirectoryPage } from "@/app/kansas-entity-pages"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

type PageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
	const resolved = await searchParams
	return generateEntityIndexMetadata("operators", parseDirectoryPage(resolved?.page))
}

export default async function KansasOperatorsIndexPage({ searchParams }: PageProps) {
	const resolved = await searchParams
	return <EntityIndexPage kind="operators" page={parseDirectoryPage(resolved?.page) ?? 0} />
}
