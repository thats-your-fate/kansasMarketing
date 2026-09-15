import type { Metadata } from "next"
import Link from "next/link"
import { HeroMapPreview } from "@/components/future/HeroMapPreview"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { futureWellsCtaHref } from "@/config/userArea"
import { apiBaseUrl, siteConfig } from "@/app/config"
import { guideHrefForWorkflow, summarizeBrowsePreview, activityDateKind } from "@/app/homepage-entry-points.mjs"
import { entityPath, wellPath, wellTitle } from "@/app/kansas-entity-pages"
import { allExplainers } from "@/app/lib/explainers"
import { seoMetadata } from "@/app/seo"
import { OrganizationJsonLd, WebSiteJsonLd } from "@/app/structured-data"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export const metadata: Metadata = seoMetadata({
	title: "Kansas Oil & Gas Records & Guides | Future Wells",
	description: `Kansas oil and gas record guides, source notes, and activity context for public KCC and KGS data. Interactive search, maps, and saved areas live inside Future Wells Co.`,
	path: "/",
})

type BrowsePageEnvelope = {
	data?: KansasBrowsePage
}

type KansasBrowsePage = {
	recent_activity: KansasActivityEvent[]
	top_counties: SummaryEntry[]
	top_operators: SummaryEntry[]
	top_fields: SummaryEntry[]
}

type SummaryEntry = {
	key: string
	display_name: string
	well_count: number
}

type KansasActivityEvent = {
	id: string
	event_type: string
	title: string
	event_date: string | null
	observed_at: string | null
	api14: string | null
	api_raw: string | null
	kgs_kid: string | null
	well_name: string | null
	county: string | null
	operator: string | null
	field_name: string | null
	lease_name: string | null
}

const workflows: Array<{ title: string; body: string }> = [
	{ title: "Well and lease activity", body: "Learn how Kansas API numbers, KGS KIDs, and lease identifiers connect a well's record to its lease, field, and county context across KCC and KGS source systems." },
	{ title: "Drilling intent signals", body: "Understand how KCC's daily Notice of Intent to Drill filings work as an early signal of possible future well activity, and how to read a C-1 form correctly." },
	{ title: "County and PLSS context", body: "Get oriented on township, range, and section location conventions used across Kansas well and lease records before you go to the official source." },
	{ title: "Completion and plugging records", body: "See what an ACO-1 completion form and a CP-1/CP-4 plugging record actually document, and what they do not prove about a well's current status." },
	{ title: "Operator and transfer context", body: "Learn how KCC operator licenses and T-1 transfer-of-ownership filings work, including what a transfer does and does not tell you about who currently operates a well." },
	{ title: "Lease production and documents", body: "Understand why Kansas production is reported at the lease level rather than the well level, and how well-document metadata is indexed from KGS source pages." },
]

const activityEventTypes = [
	"New drilling intents (C-1 filings)",
	"Spuds and completions",
	"Plugging records",
	"Operator transfers (T-1 filings)",
	"Well status changes",
	"New or updated lease production",
]

export default async function HomePage() {
	const browsePage = await loadBrowsePreview()
	const summary = summarizeBrowsePreview(browsePage || {})
	const guideCount = allExplainers().filter((guide) => guide.published).length
	const recentActivity = browsePage?.recent_activity.slice(0, 3) || []
	const featuredCounties = browsePage?.top_counties.slice(0, 3) || []
	const featuredOperators = browsePage?.top_operators.slice(0, 2) || []
	const featuredFields = browsePage?.top_fields.slice(0, 2) || []

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
							<span className="fwt-eyebrow">Public entry points</span>
							<h2>Start with public Kansas record pages</h2>
						</div>
						<p>These are server-rendered public links from the existing browse feed. Counts are featured preview rows, not a claim of complete statewide coverage.</p>
					</div>
					<div className="fwt-grid">
						<article className="fwt-card">
							<b>Browse first</b>
							<h3>Records you can open without the map</h3>
							<p>Open county, operator, field, and sampled well pages through ordinary HTML links before moving into app workflows.</p>
							<Link href="/browse">Browse Kansas records</Link>
						</article>
						<article className="fwt-card">
							<b>Featured preview</b>
							<h3>{formatNumber(summary.representedWells)} wells represented by featured links</h3>
							<p>{summary.featuredCountyRows} county rows, {summary.featuredOperatorRows} operator rows, and {summary.featuredFieldRows} field rows returned by the current browse preview.</p>
							<Link href="/counties">Open county directory</Link>
						</article>
						<article className="fwt-card">
							<b>Guide library</b>
							<h3>{guideCount.toLocaleString("en-US")} Kansas source guides</h3>
							<p>Guide count is derived from the published guide configuration so this page does not drift from the library.</p>
							<Link href="/guides">Open Kansas guides</Link>
						</article>
					</div>
					<HomepageBrowsePreview
						recentActivity={recentActivity}
						counties={featuredCounties}
						operators={featuredOperators}
						fields={featuredFields}
						latestActivityDate={summary.latestActivityDate}
						latestActivityDateKind={summary.latestActivityDateKind}
						previewAvailable={Boolean(browsePage)}
					/>
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
						{workflows.map(({ title, body }) => (
							<article className="fwt-card" key={title}>
								<b>Workflow</b>
								<h3>{title}</h3>
								<p>{body}</p>
								{guideHrefForWorkflow(title) ? <Link href={guideHrefForWorkflow(title) || "/guides"}>Read matching guide</Link> : null}
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
							<b>Public activity preview</b>
							<h3>{recentActivity.length ? "Recent source-linked well records" : "Open the Kansas activity workspace"}</h3>
							<p>{recentActivity.length ? "A small dated preview appears above from the existing browse feed. The live feed and watch-area alerts remain inside Future Wells Co." : "The public homepage does not have a recent-activity preview available right now. Read how activity is classified, then open Future Wells Co for live feed and saved watch areas."}</p>
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
							<p>{guideCount.toLocaleString("en-US")} guides covering KCC and KGS agencies, API numbers and KGS KIDs, C-1/ACO-1/T-1/CP-1/CP-4 forms, lease production, well statuses, PLSS locations, and data limitations.</p>
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

async function loadBrowsePreview(): Promise<KansasBrowsePage | null> {
	try {
		const response = await fetch(`${apiBaseUrl}/api/ks/browse`, {
			cache: "no-store",
			signal: AbortSignal.timeout(8000),
		})
		if (!response.ok) return null
		const envelope = (await response.json()) as BrowsePageEnvelope
		return {
			recent_activity: Array.isArray(envelope.data?.recent_activity) ? envelope.data.recent_activity : [],
			top_counties: Array.isArray(envelope.data?.top_counties) ? envelope.data.top_counties : [],
			top_operators: Array.isArray(envelope.data?.top_operators) ? envelope.data.top_operators : [],
			top_fields: Array.isArray(envelope.data?.top_fields) ? envelope.data.top_fields : [],
		}
	} catch {
		return null
	}
}

function HomepageBrowsePreview({
	recentActivity,
	counties,
	operators,
	fields,
	latestActivityDate,
	latestActivityDateKind,
	previewAvailable,
}: {
	recentActivity: KansasActivityEvent[]
	counties: SummaryEntry[]
	operators: SummaryEntry[]
	fields: SummaryEntry[]
	latestActivityDate: string | null
	latestActivityDateKind: string | null
	previewAvailable: boolean
}) {
	if (!previewAvailable) {
		return (
			<div className="fwt-copy">
				<p className="fwt-map-status">The public browse preview is unavailable from the local backend right now. Guide links and Future Wells Co access remain available.</p>
			</div>
		)
	}
	return (
		<div className="fwt-entry-grid">
			<section className="fwt-copy fwt-entry-block fwt-entry-block-wide">
				<span className="fwt-eyebrow">Dated preview</span>
				<h3>Recent public well activity</h3>
				{latestActivityDate ? <p>Latest preview date: {dateLabel(latestActivityDate)} ({latestActivityDateKind}).</p> : <p>No dated activity rows were returned in this preview.</p>}
				<RecentActivityPreview events={recentActivity} />
			</section>
			<HomepageEntityLinks title="County entry points" href="/counties" items={counties} hrefFor={(item) => entityPath("counties", item.display_name)} labelFor={(item) => countyLabel(item.display_name)} />
			<HomepageEntityLinks title="Operator entry points" href="/operators" items={operators} hrefFor={(item) => entityPath("operators", item.display_name)} />
			<HomepageEntityLinks title="Field entry points" href="/fields" items={fields} hrefFor={(item) => entityPath("fields", item.display_name)} labelFor={(item) => fieldLabel(item.display_name)} />
		</div>
	)
}

function RecentActivityPreview({ events }: { events: KansasActivityEvent[] }) {
	if (!events.length) return <p className="fwt-map-status">No linked recent Kansas well activity is available for the homepage preview right now.</p>
	return (
		<div className="fwt-county-well-list">
			{events.map((event) => (
				<article key={event.id}>
					<strong><a href={wellPath(event)}>{wellTitle(event)}</a></strong>
					<p>{activitySummary(event)}</p>
					<div className="fwt-county-card-meta">
						<span>{event.title || humanEventType(event.event_type)}</span>
						<span>{activityDateKind(event)}</span>
						{activityDate(event) ? <span><time dateTime={activityDate(event) || undefined}>{dateLabel(activityDate(event) || "")}</time></span> : null}
						{event.county ? <span>{countyLabel(event.county)}</span> : null}
					</div>
				</article>
			))}
		</div>
	)
}

function HomepageEntityLinks({
	title,
	href,
	items,
	hrefFor,
	labelFor = (item) => item.display_name,
}: {
	title: string
	href: string
	items: SummaryEntry[]
	hrefFor: (item: SummaryEntry) => string
	labelFor?: (item: SummaryEntry) => string
}) {
	return (
		<section className="fwt-copy fwt-entry-block">
			<span className="fwt-eyebrow">Featured rows</span>
			<h3>{title}</h3>
			{items.length ? (
				<div className="fwt-entry-link-list">
					{items.map((item) => (
						<a href={hrefFor(item)} key={item.key}>
							<span>{labelFor(item)}</span>
							<strong>{formatNumber(item.well_count)} wells</strong>
						</a>
					))}
				</div>
			) : <p className="fwt-map-status">No featured rows were returned for this group.</p>}
			<p><Link className="fwt-gold-link" href={href}>Open full directory</Link></p>
		</section>
	)
}

function activityDate(event: KansasActivityEvent) {
	return event.event_date || event.observed_at || null
}

function activitySummary(event: KansasActivityEvent) {
	return [
		meaningfulOperator(event.operator),
		event.county ? countyLabel(event.county) : null,
		meaningfulField(event.field_name),
		event.lease_name ? `${titleCase(event.lease_name)} lease` : null,
	].filter(Boolean).join(" - ") || "Kansas public-record activity"
}

function countyLabel(value?: string | null) {
	const clean = (value || "").trim()
	if (!clean) return "Kansas County"
	return /\bCounty$/i.test(clean) ? titleCase(clean) : `${titleCase(clean)} County`
}

function fieldLabel(value?: string | null) {
	const clean = (value || "").trim()
	if (!clean) return "Kansas Field"
	return /\bField$/i.test(clean) ? titleCase(clean) : `${titleCase(clean)} Field`
}

function meaningfulOperator(value?: string | null) {
	const clean = (value || "").trim()
	if (!clean || /^(unavailable|unknown|n\/a|na)$/i.test(clean)) return null
	return clean
}

function meaningfulField(value?: string | null) {
	const clean = (value || "").trim()
	if (!clean || /^(unknown|unnamed)$/i.test(clean)) return null
	return fieldLabel(clean)
}

function titleCase(value: string) {
	return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function humanEventType(value: string) {
	return value.replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function dateLabel(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
}

function formatNumber(value: number) {
	return value.toLocaleString("en-US")
}
