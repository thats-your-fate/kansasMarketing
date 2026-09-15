import type { Metadata } from "next"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { futureWellsCtaHref } from "@/config/userArea"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: "Kansas Oil & Gas Activity Signals | Future Wells",
	description: "Understand Kansas drilling intents, completions, plugging, transfers, production updates, and other activity signals from public KCC and KGS records.",
	path: siteConfig.activityPath,
})

const eventTypes = [
	["Drilling intent posted", "A new KCC Notice of Intent to Drill (C-1) filing for a well, an early signal rather than a guarantee of drilling."],
	["Drilling intent expired", "A previously posted intent that KCC's rolling window no longer carries, with no matching spud recorded."],
	["Spud recorded", "KGS reports a well's spud date, or an existing well's status changes to a spudded state."],
	["Completion recorded", "KGS reports a completion event for a well already known to Future Wells Kansas."],
	["Well status changed", "A well's lifecycle status (for example producing, plugged, or shut-in) changes in the KGS well record."],
	["Plugging recorded", "A CP-1 or CP-4 plugging record is associated with a well."],
	["Operator transfer approved", "A KCC T-1 transfer-of-ownership filing is approved, linked to the wells it affects where source records support it."],
	["First lease production reported", "KGS reports the first monthly production row observed for a lease."],
	["Lease production updated", "KGS reports a revised or additional monthly production row for a lease already tracked."],
	["Document added", "A new KGS well-document record (such as a completion form) is indexed for a well."],
]

export default function ActivityPage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Activity", path: siteConfig.activityPath }]} />
			<section className="nm-section">
				<div className="nm-container">
					<span className="nm-eyebrow">Activity</span>
					<h1>Kansas oil and gas activity signals</h1>
					<p>
						{siteConfig.brandName} classifies Kansas well, lease, operator, and production activity into the event
						types below, generated from {siteConfig.officialAgencyName} (KCC) and {siteConfig.secondaryAgencyName} (KGS)
						source records. This page explains what each event type means. The live activity feed, county/operator/field
						watch areas, and alerting are available inside Future Wells Co.
					</p>
				</div>
			</section>
			<section className="nm-section">
				<div className="nm-container">
					<div className="fwt-grid two">
						{eventTypes.map(([title, body]) => (
							<article className="fwt-card" key={title}>
								<b>Event type</b>
								<h3>{title}</h3>
								<p>{body}</p>
							</article>
						))}
					</div>
				</div>
			</section>
			<section className="fwt-section fwt-cta-band">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Live activity</span>
						<h2>Watch Kansas activity in Future Wells Co</h2>
					</div>
					<a className="fwt-btn dark" href={futureWellsCtaHref("activity_page_cta")}>
						Open Kansas activity in Future Wells Co
					</a>
				</div>
			</section>
		</MarketingLayout>
	)
}
