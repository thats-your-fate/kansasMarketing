import type { Metadata } from "next"
import { WellDetailPage, generateWellMetadata } from "@/app/kansas-entity-pages"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export type WellPageProps = { params: Promise<{ api: string; slug?: string[] }> }

export async function generateMetadata({ params }: WellPageProps): Promise<Metadata> {
	const { api } = await params
	return generateWellMetadata(api)
}

export default async function KansasWellPage({ params }: WellPageProps) {
	const { api, slug } = await params
	return <WellDetailPage api={api} slug={slug} />
}
