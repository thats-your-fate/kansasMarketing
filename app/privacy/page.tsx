import type { Metadata } from "next"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: "Privacy Policy for Future Wells Kansas",
	description: "Read how Future Wells Kansas handles account data, server logs, cookies, sessions, analytics, and contact information.",
	path: "/privacy",
})

const contactEmail = "info@futurewells.co"
const contactHref = `mailto:${contactEmail}`

const privacyItems = [
	["Account data", "If you create a Future Wells Co account, the product may store account information such as your email address, name if provided, password hash, role, session records, and account timestamps."],
	["Usage and server logs", "Servers, hosting providers, and security tools may record technical logs such as IP address, browser information, requested URLs, timestamps, response codes, and error details."],
	["Cookies and sessions", "The Future Wells Co user area uses cookies or similar session storage to keep you signed in and to protect authenticated routes. You can clear cookies in your browser, but doing so may sign you out."],
	["Analytics", `${siteConfig.brandName} may use analytics to understand site usage, page views, traffic sources, device/browser context, and general engagement.`],
	["Contact", `For data questions, product access, or privacy requests, contact ${contactEmail}.`],
]

export default function PrivacyPage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Privacy", path: "/privacy" }]} />
			<section className="fwt-section dark">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Privacy</span>
						<h1>Privacy Policy.</h1>
					</div>
					<p>This policy explains the information {siteConfig.brandName} may collect across the public site and account-related product workflows.</p>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-grid two">
					{privacyItems.map(([title, body]) => (
						<article className="fwt-card" key={title}>
							<b>Privacy</b>
							<h3>{title}</h3>
							<p>{body}</p>
						</article>
					))}
				</div>
			</section>
			<section className="fwt-section fwt-cta-band">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Questions</span>
						<h2>Need to ask about data or account privacy?</h2>
					</div>
					<a className="fwt-btn dark" href={contactHref}>
						Email {siteConfig.brandName}
					</a>
				</div>
			</section>
		</MarketingLayout>
	)
}
