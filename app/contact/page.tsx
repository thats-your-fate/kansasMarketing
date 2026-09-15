import type { Metadata } from "next"
import { DisclaimerStrip, MarketingLayout } from "@/components/future/MarketingLayout"
import { futureWellsCtaHref } from "@/config/userArea"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: "Contact Future Wells Kansas",
	description: "Contact Future Wells Kansas for public data questions, product access, privacy requests, or Kansas workflow feedback.",
	path: "/contact",
})

// Colorado's /contact page posts to a real backend inquiry endpoint
// (/api/public/inquiries, with Turnstile captcha verification) that has no
// Kansas equivalent yet — building that pipeline is real backend/ops
// infrastructure work, not part of cloning the design system. This page
// uses a plain mailto contact instead of a form that would silently fail
// to submit anywhere.

const companyDetails: [string, string][] = [
	["Company", siteConfig.companyName],
	["Email", "info@futurewells.co"],
	["Mailing address", "30 N Gould St Ste N, Sheridan, WY 82801"],
	["Coverage", "Kansas oil and gas public-record data"],
]

const contactTopics = [
	["Product access", "Ask about creating a Future Wells Co account for Kansas search, maps, watch areas, and monitoring."],
	["Data questions", "Include a county, API number, operator, lease, or KGS KID when you have one."],
	["Privacy and legal", "Use the same inbox for account privacy, data correction, and disclaimer questions."],
]

const contactEmail = "info@futurewells.co"
const contactHref = `mailto:${contactEmail}`

export default function ContactPage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }]} />
			<section className="fwt-section dark">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Contact</span>
						<h1>Help shape the Kansas well activity workflow.</h1>
					</div>
					<p>{siteConfig.brandName} is a public information and guide site, with account workflows handled through the Future Wells Co product user area.</p>
				</div>
			</section>
			<section className="fwt-section fwt-contact-section">
				<div className="fwt-container">
					<div className="fwt-contact-info">
						<span className="fwt-eyebrow">Company</span>
						<h2>{siteConfig.companyName}</h2>
						<p>Operator of {siteConfig.brandName}, publishing Kansas public-record guides and coverage notes alongside the Future Wells Co product.</p>
						<dl>
							{companyDetails.map(([label, value]) => (
								<div key={label}>
									<dt>{label}</dt>
									<dd>{label === "Email" ? <a href={contactHref}>{value}</a> : value}</dd>
								</div>
							))}
						</dl>
					</div>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-grid">
					{contactTopics.map(([title, body]) => (
						<article className="fwt-card" key={title}>
							<b>Contact</b>
							<h3>{title}</h3>
							<p>{body}</p>
						</article>
					))}
				</div>
			</section>
			<section className="fwt-section fwt-cta-band">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Product access</span>
						<h2>Use the Future Wells Co user area for account workflows.</h2>
					</div>
					<a className="fwt-btn dark" href={futureWellsCtaHref("contact_page_cta")}>
						Open Kansas in Future Wells Co
					</a>
				</div>
			</section>
			<DisclaimerStrip />
		</MarketingLayout>
	)
}
