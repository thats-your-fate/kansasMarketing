import type { Metadata } from "next"
import Link from "next/link"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: `Kansas Data Sources | ${siteConfig.brandName}`,
	description: `The KCC and KGS public source layers ${siteConfig.brandName} organizes: well records, lease and production data, operator licenses, drilling intents, transfers, and well-document metadata.`,
	path: "/data",
})

const sources = [
	["Well records", `The ${siteConfig.secondaryAgencyName} (KGS) statewide well master, including API numbers, KGS KIDs, location, lifecycle status, and horizontal/directional status flags.`],
	["Lease and county context", "KGS's lease dimension data, linking wells to leases and to Kansas county and township/range/section (PLSS) location context."],
	["Lease production", "KGS's monthly lease-level oil and gas production archives, reported by lease rather than by individual well."],
	["Operator licenses", `The ${siteConfig.officialAgencyName} (KCC) operator license registry, including license status and operator identity.`],
	["Drilling intents", "KCC's daily Notice of Intent to Drill (C-1) filings, tracked on a rolling window as an early signal of possible future well activity."],
	["Approved transfers", "KCC's Notice of Transfer of Ownership (T-1) filings, linking operator changes to the wells they affect where source records support it."],
	["Well-document metadata", "Indexed metadata for KGS well documents (ACO-1 completions, plugging records, and other filed forms), respecting confidential, login-required, and robots-restricted sources."],
	["Conservation dockets", "KCC conservation docket filings, tracked for coverage as a source-metadata layer."],
]

export default function DataPage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Data", path: "/data" }]} />
			<section className="nm-section">
				<div className="nm-container">
					<span className="nm-eyebrow">Data sources</span>
					<h1>Kansas oil and gas record sources</h1>
					<p>
						{siteConfig.brandName} organizes public Kansas well, lease, operator, and production records from the{" "}
						{siteConfig.officialAgencyName} (KCC) and the {siteConfig.secondaryAgencyName} (KGS) so you can move from a
						guide to the underlying source context. See <Link href="/data-coverage">data coverage</Link> for how often each
						source is intended to refresh.
					</p>
				</div>
			</section>
			<section className="nm-section">
				<div className="nm-container">
					<div className="fwt-grid two">
						{sources.map(([title, body]) => (
							<article className="fwt-card" key={title}>
								<h2>{title}</h2>
								<p>{body}</p>
							</article>
						))}
					</div>
				</div>
			</section>
		</MarketingLayout>
	)
}
