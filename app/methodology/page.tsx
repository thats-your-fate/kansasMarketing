import type { Metadata } from "next"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: `Methodology | ${siteConfig.brandName}`,
	description: `How ${siteConfig.brandName} presents Kansas well, lease, operator, and production records sourced from the KCC and KGS.`,
	path: "/methodology",
})

const sections = [
	[
		"Two source agencies, credited separately",
		`Kansas oil and gas records come from two legally distinct agencies: the ${siteConfig.officialAgencyName} (KCC), which regulates operators, drilling intents, and approved transfers, and the ${siteConfig.secondaryAgencyName} (KGS), which maintains the statewide well, lease, and production record. Guides and coverage notes credit both explicitly rather than one combined "official agency."`,
	],
	[
		"Lease-level production, not well-level",
		"Kansas production is reported and reconciled at the lease level. A lease can cover more than one well, so production figures are linked-lease context, not a single well's individual output, and are always labeled with the exact source-reported month rather than implied as current through today.",
	],
	[
		"Horizontal status is a field, not a drawn trajectory",
		"A well flagged horizontal or directional reflects a status field reported by KGS. Future Wells Kansas does not draw or estimate a wellbore trajectory for any Kansas well unless a specific, verified record states one — see the guide on what horizontal-well records do and do not show.",
	],
	[
		"Coverage limits",
		"This site does not claim complete, real-time statewide coverage. Where a coverage note states an expected update cadence, that is a target refresh interval, not a guarantee that every source has been refreshed since that time.",
	],
	[
		"Editorial content, not a data application",
		`${siteConfig.brandName} publishes guides and coverage notes. It does not host a public well search, an interactive map, or browse-first well/operator/county/field directories. Interactive search, maps, saved watch areas, and monitoring for Kansas live inside Future Wells Co.`,
	],
]

export default function MethodologyPage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Methodology", path: "/methodology" }]} />
			<section className="nm-section">
				<div className="nm-container">
					<span className="nm-eyebrow">Methodology</span>
					<h1>How {siteConfig.brandName} presents Kansas records</h1>
					<p>{siteConfig.brandName} organizes public Kansas source information into guides and coverage notes for research and orientation, not as a substitute for the official source record.</p>
				</div>
			</section>
			<section className="nm-section">
				<div className="nm-container">
					<div className="fwt-grid">
						{sections.map(([title, body]) => (
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
