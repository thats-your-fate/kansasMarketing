import type { Metadata } from "next"
import { EntityDetailPage, generateEntityMetadata } from "@/app/kansas-entity-pages"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	return generateEntityMetadata("fields", slug)
}

export default async function KansasFieldPage({ params }: PageProps) {
	const { slug } = await params
	return <EntityDetailPage kind="fields" slug={slug} />
}
