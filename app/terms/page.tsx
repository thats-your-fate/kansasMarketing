import type { Metadata } from "next"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: `Terms of Use | ${siteConfig.brandName}`,
	description: `Read the ${siteConfig.brandName} terms for product access, public data limitations, user responsibility, uptime, accuracy, and professional advice disclaimers.`,
	path: "/terms",
})

const contactEmail = "info@futurewells.co"
const contactHref = `mailto:${contactEmail}`

const termsItems = [
	["Product access", `${siteConfig.brandName} publishes guides and coverage notes. Interactive search, maps, saved watch areas, monitoring, and account tools are provided through the separate Future Wells Co product and may change as coverage evolves.`],
	["Public data limitations", "Kansas oil and gas records, lease production figures, and derived activity signals may be incomplete, delayed, duplicated, corrected, transformed, stale, or interpreted incorrectly."],
	["No professional advice", `${siteConfig.brandName} does not provide legal, financial, investment, mineral-rights, royalty, title, engineering, drilling, tax, regulatory, or operational advice.`],
	["User responsibility", "You are responsible for how you use this site and Future Wells Co, and for verifying records before relying on them."],
	["No guarantee", `${siteConfig.brandName} does not guarantee uptime, availability, completeness, accuracy, data coverage, or suitability for any decision.`],
	["Official sources", "Always verify critical records with official sources, original documents, county records, qualified professionals, and the relevant agencies before making decisions."],
	["Contact", `For data questions, product access, or privacy requests, contact ${contactEmail}.`],
]

export default function TermsPage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }]} />
			<section className="fwt-section dark">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Terms</span>
						<h1>Terms of Use.</h1>
					</div>
					<p>These terms cover the public Kansas regional site and related Future Wells Co user-area workflows. They are practical launch terms, not a substitute for formal legal review.</p>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-grid two">
					{termsItems.map(([title, body]) => (
						<article className="fwt-card" key={title}>
							<b>Terms</b>
							<h3>{title}</h3>
							<p>{body}</p>
						</article>
					))}
				</div>
			</section>
			<section className="fwt-section fwt-cta-band">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Use carefully</span>
						<h2>Use the platform as a discovery layer.</h2>
					</div>
					<div className="fwt-product-actions">
						<a className="fwt-btn dark" href="/disclaimer">
							Read the full disclaimer
						</a>
						<a className="fwt-btn light" href={contactHref}>
							Contact {siteConfig.brandName}
						</a>
					</div>
				</div>
			</section>
		</MarketingLayout>
	)
}
