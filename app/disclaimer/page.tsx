import type { Metadata } from "next"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: `Legal and Data Disclaimer | ${siteConfig.brandName}`,
	description: `Read ${siteConfig.brandName} legal, public data, affiliation, verification, and professional advice disclaimers.`,
	path: "/disclaimer",
})

const items = [
	`${siteConfig.brandName} is not an official government website.`,
	`${siteConfig.brandName} is not affiliated with, endorsed by, or sponsored by the ${siteConfig.officialAgencyName} or the ${siteConfig.secondaryAgencyName}.`,
	"Public Kansas oil and gas data may be incomplete, delayed, corrected, duplicated, stale, transformed, or interpreted incorrectly.",
	"Kansas lease production figures are lease-level, not well-level, and are labeled with the exact source-reported coverage month rather than implied as current through today.",
	"A well flagged horizontal or directional reflects a status field only, never a drawn trajectory, unless a specific record states otherwise.",
	"Users should verify important decisions with official sources, original documents, county records, qualified professionals, and the relevant agencies.",
	`${siteConfig.brandName} does not provide legal, financial, investment, mineral-rights, royalty, land title, engineering, drilling, tax, or operational advice.`,
]

const contactEmail = "info@futurewells.co"
const contactHref = `mailto:${contactEmail}`

export default function DisclaimerPage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Disclaimer", path: "/disclaimer" }]} />
			<section className="fwt-section dark">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Disclaimer</span>
						<h1>Public data exploration only.</h1>
					</div>
					<p>Use {siteConfig.brandName} to discover and organize Kansas public-record context. Do not use it as a substitute for official records or professional advice.</p>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-grid two">
					{items.map((item, index) => (
						<article className="fwt-card" key={item}>
							<b>{String(index + 1).padStart(2, "0")}</b>
							<p>{item}</p>
						</article>
					))}
				</div>
			</section>
			<section className="fwt-section fwt-cta-band">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Contact</span>
						<h2>Questions about the Kansas data layer?</h2>
					</div>
					<p>
						For data questions, product access, or privacy requests, contact <a href={contactHref}>{contactEmail}</a>.
					</p>
				</div>
			</section>
		</MarketingLayout>
	)
}
