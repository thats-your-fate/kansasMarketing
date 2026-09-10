import WellPage, { generateMetadata, type WellPageProps } from "../page"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export { generateMetadata }

export default function KansasWellSlugPage({ params }: WellPageProps) {
	return <WellPage params={params} />
}
