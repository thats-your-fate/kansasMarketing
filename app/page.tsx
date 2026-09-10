import type { Metadata } from "next"
import Link from "next/link"
import { HeroMapPreview } from "@/components/future/HeroMapPreview"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { futureWellsCtaHref } from "@/config/userArea"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { OrganizationJsonLd, WebSiteJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: "Kansas Oil & Gas Activity, Drilling Intents & Public KCC/KGS Data | Future Wells Kansas",
	description: `${siteConfig.brandName} organizes public Kansas oil and gas source information from the ${siteConfig.officialAgencyName} and the ${siteConfig.secondaryAgencyName} into guides and coverage notes. Interactive search, maps, and saved areas live inside Future Wells Co.`,
	path: "/",
})

const workflows = [
	["Well and lease activity", "Learn how Kansas API numbers, KGS KIDs, and lease identifiers connect a well's record to its lease, field, and county context across KCC and KGS source systems."],
	["Drilling intent signals", "Understand how KCC's daily Notice of Intent to Drill filings work as an early signal of possible future well activity, and how to read a C-1 form correctly."],
	["County and PLSS context", "Get oriented on township, range, and section location conventions used across Kansas well and lease records before you go to the official source."],
	["Completion and plugging records", "See what an ACO-1 completion form and a CP-1/CP-4 plugging record actually document, and what they do not prove about a well's current status."],
	["Operator and transfer context", "Learn how KCC operator licenses and T-1 transfer-of-ownership filings work, including what a transfer does and does not tell you about who currently operates a well."],
	["Lease production and documents", "Understand why Kansas production is reported at the lease level rather than the well level, and how well-document metadata is indexed from KGS source pages."],
]

const activityEventTypes = [
	"New drilling intents (C-1 filings)",
	"Spuds and completions",
	"Plugging records",
	"Operator transfers (T-1 filings)",
	"Well status changes",
	"New or updated lease production",
]

export default function HomePage() {
	return (
		<MarketingLayout>
			<WebSiteJsonLd />
			<OrganizationJsonLd />

			<section className="fwt-hero">
				<div className="fwt-container fwt-hero-grid">
					<div>
						<span className="fwt-eyebrow">Kansas public oil and gas records</span>
						<h1>Kansas Oil &amp; Gas Activity, Drilling Intents &amp; Public KCC/KGS Data</h1>
						<p>{siteConfig.brandName} organizes public Kansas source information and guides. Interactive search, maps, saved areas, monitoring, and deeper record workflows live inside Future Wells Co.</p>
						<div className="fwt-hero-actions">
							<a className="fwt-btn gold" href={futureWellsCtaHref("homepage_hero_primary")}>
								Open Kansas in Future Wells Co
							</a>
							<Link className="fwt-btn ghost" href="/browse">
								Browse Kansas records
							</Link>
						</div>
					</div>
					<div className="fwt-map-card">
						<HeroMapPreview />
					</div>
				</div>
			</section>

			<section className="fwt-section">
				<div className="fwt-container">
					<div className="fwt-section-header">
						<div>
							<span className="fwt-eyebrow">Explore</span>
							<h2>What Future Wells Kansas helps you explore</h2>
						</div>
						<p>Use these guides to get oriented on Kansas source records faster, then move into Future Wells Co for interactive search, maps, and saved areas.</p>
					</div>
					<div className="fwt-grid">
						{workflows.map(([title, body]) => (
							<article className="fwt-card" key={title}>
								<b>Workflow</b>
								<h3>{title}</h3>
								<p>{body}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="fwt-section">
				<div className="fwt-container fwt-copy">
					<span className="fwt-eyebrow">Verification notice</span>
					<h2>Data limitations and verification notice</h2>
					<p>
						Kansas oil and gas records come from two separate agencies: the {siteConfig.officialAgencyName} (KCC), which
						regulates operators, drilling intents, and transfers, and the {siteConfig.secondaryAgencyName} (KGS), which
						maintains the statewide well, lease, and production record. Public source data may be incomplete, delayed,
						corrected, duplicated, or interpreted incorrectly.
					</p>
					<p>
						Kansas lease production is reported at the lease level, not the well level, and always carries the exact
						source-reported coverage month rather than being implied as current through today. A well flagged
						horizontal or directional reflects a status field only, never a drawn trajectory, unless a specific record
						states otherwise.
					</p>
					<p>
						<Link href="/methodology">Read the methodology</Link> and <Link href="/data">review Kansas data sources</Link>.
					</p>
				</div>
			</section>

			<section className="fwt-section dark">
				<div className="fwt-container">
					<div className="fwt-section-header">
						<div>
							<span className="fwt-eyebrow">Activity</span>
							<h2>Kansas oil and gas activity signals</h2>
						</div>
						<p>Future Wells Kansas tracks these event types from KCC and KGS source records. Live activity feeds and watch-area alerts are available inside Future Wells Co.</p>
					</div>
					<div className="fwt-grid two">
						<article className="fwt-card">
							<b>Event types</b>
							<h3>What counts as Kansas activity</h3>
							<ul>
								{activityEventTypes.map((eventType) => (
									<li key={eventType}>{eventType}</li>
								))}
							</ul>
						</article>
						<article className="fwt-card">
							<b>Latest activity</b>
							<h3>Open the Kansas activity workspace</h3>
							<p>Read how Future Wells Kansas classifies activity, then open Future Wells Co for the live feed and saved watch areas.</p>
							<Link href={siteConfig.activityPath}>Read the activity guide</Link>
						</article>
					</div>
				</div>
			</section>

			<section className="fwt-section">
				<div className="fwt-container">
					<div className="fwt-section-header">
						<div>
							<span className="fwt-eyebrow">Guides</span>
							<h2>Kansas source and document explainers</h2>
						</div>
						<p>Plain-English guides to KCC and KGS forms, identifiers, and record types, each ending with a link into the Kansas workspace in Future Wells Co.</p>
					</div>
					<div className="fwt-grid two">
						<article className="fwt-card">
							<b>Guide library</b>
							<h3>Browse all Kansas guides</h3>
							<p>Twelve guides covering KCC and KGS agencies, API numbers and KGS KIDs, C-1/ACO-1/T-1/CP-1/CP-4 forms, lease production, well statuses, PLSS locations, and data limitations.</p>
							<Link href="/guides">Open the guide library</Link>
						</article>
						<article className="fwt-card">
							<b>Data coverage</b>
							<h3>See what Future Wells Kansas covers</h3>
							<p>Review which KCC and KGS sources this project draws from and their recommended update cadence.</p>
							<Link href="/data-coverage">Open data coverage</Link>
						</article>
					</div>
				</div>
			</section>
		</MarketingLayout>
	)
}
