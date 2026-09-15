import type { Metadata } from "next"
import Link from "next/link"
import { BreadcrumbTrail } from "@/components/future/BreadcrumbTrail"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { apiBaseUrl } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"
import { entityPath, wellPath, wellTitle } from "@/app/kansas-entity-pages"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const runtime = "nodejs"

export const metadata: Metadata = seoMetadata({
	title: "Browse Kansas Well Record Entry Points | Future Wells",
	description: "Start from recent Kansas well activity, top counties, reported operators, fields, and source guides before opening deeper Future Wells Co workflows.",
	path: "/browse",
})

type BrowsePageEnvelope = {
	data: KansasBrowsePage
	meta: { state: string }
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
	observed_at: string
	api14: string | null
	api_raw: string | null
	kgs_kid: string | null
	well_name: string | null
	county: string | null
	operator: string | null
	field_name: string | null
	lease_name: string | null
}

export default async function BrowsePage() {
	const page = await loadBrowsePage()
	const breadcrumbs = [{ name: "Home", path: "/" }, { name: "Browse", path: "/browse" }]

	return (
		<MarketingLayout>
			<BreadcrumbTrail items={breadcrumbs} />
			<BreadcrumbJsonLd items={breadcrumbs} />
			<StartBrowseSections page={page} />
		</MarketingLayout>
	)
}

async function loadBrowsePage(): Promise<KansasBrowsePage> {
	const response = await fetch(`${apiBaseUrl}/api/ks/browse`, {
		cache: "no-store",
		signal: AbortSignal.timeout(15000),
	})
	if (!response.ok) {
		throw new Error(`Kansas browse API unavailable: ${response.status}`)
	}
	const envelope = (await response.json()) as BrowsePageEnvelope
	return {
		recent_activity: Array.isArray(envelope.data?.recent_activity) ? envelope.data.recent_activity : [],
		top_counties: Array.isArray(envelope.data?.top_counties) ? envelope.data.top_counties : [],
		top_operators: Array.isArray(envelope.data?.top_operators) ? envelope.data.top_operators : [],
		top_fields: Array.isArray(envelope.data?.top_fields) ? envelope.data.top_fields : [],
	}
}

function StartBrowseSections({ page }: { page: KansasBrowsePage }) {
	const recentActivity = page.recent_activity.slice(0, 5)
	const featuredCounties = page.top_counties.slice(0, 5)
	const featuredOperators = page.top_operators.slice(0, 5)
	const featuredFields = page.top_fields.slice(0, 5)

	return (
		<section className="fwt-section fwt-entry-section">
			<div className="fwt-container">
				<div className="fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Featured entry points</span>
						<h1>Explore wells, counties, operators, and fields</h1>
					</div>
					<p>Use these Kansas public-record paths as starting points for deeper review.</p>
				</div>
				<div className="fwt-entry-grid">
					<section className="fwt-copy fwt-entry-block fwt-entry-block-wide">
						<span className="fwt-eyebrow">Recent well activity</span>
						<h3>Kansas public well records</h3>
						<RecentActivityCards events={recentActivity} />
					</section>
					<EntityBlock
						eyebrow={`${featuredCounties.length} counties`}
						title="Top counties by well count"
						items={featuredCounties}
						hrefFor={(item) => entityPath("counties", item.display_name)}
						labelFor={(item) => countyLabel(item.display_name)}
						directoryHref="/counties"
						directoryLabel="Open Kansas county pages"
					/>
					<EntityBlock
						eyebrow={`${featuredOperators.length} operators`}
						title="Top reported operators by well count"
						items={featuredOperators}
						hrefFor={(item) => entityPath("operators", item.display_name)}
						directoryHref="/operators"
						directoryLabel="Open Kansas operator pages"
					/>
					<EntityBlock
						eyebrow={`${featuredFields.length} fields`}
						title="Top fields by well count"
						items={featuredFields}
						hrefFor={(item) => entityPath("fields", item.display_name)}
						directoryHref="/fields"
						directoryLabel="Open Kansas field pages"
					/>
					<section className="fwt-copy fwt-entry-block">
						<span className="fwt-eyebrow">Guides</span>
						<h3>Kansas source explainers</h3>
						<p>Read Kansas guides for KCC and KGS agencies, API numbers, KGS KIDs, C-1 intents, ACO-1 completions, T-1 transfers, lease production, PLSS locations, and verification workflows.</p>
						<Link className="fwt-gold-link" href="/guides">Kansas Oil &amp; Gas Guides</Link>
					</section>
				</div>
			</div>
		</section>
	)
}

function RecentActivityCards({ events }: { events: KansasActivityEvent[] }) {
	if (!events.length) {
		return (
			<p className="fwt-map-status">
				No linked recent Kansas well activity is available for the browse preview right now.
			</p>
		)
	}

	return (
		<div className="fwt-county-well-list">
			{events.map((event) => (
				<article key={event.id}>
					<strong>
						<a href={wellPath(event)}>
							{wellTitle(event)}
						</a>
					</strong>
					<p>{activitySummary(event)}</p>
					<div className="fwt-county-card-meta">
						{apiLabel(event) ? <span>{apiLabel(event)}</span> : null}
						<span>{event.title || humanEventType(event.event_type)}</span>
						{event.county ? <span>{countyLabel(event.county)}</span> : null}
						{event.event_date ? <span>Activity date <time dateTime={event.event_date}>{dateLabel(event.event_date)}</time></span> : null}
					</div>
				</article>
			))}
		</div>
	)
}

function EntityBlock({
	eyebrow,
	title,
	items,
	hrefFor,
	labelFor = (item) => item.display_name,
	directoryHref,
	directoryLabel,
}: {
	eyebrow: string
	title: string
	items: SummaryEntry[]
	hrefFor: (item: SummaryEntry) => string
	labelFor?: (item: SummaryEntry) => string
	directoryHref: string
	directoryLabel: string
}) {
	return (
		<section className="fwt-copy fwt-entry-block">
			<span className="fwt-eyebrow">{eyebrow}</span>
			<h3>{title}</h3>
			{items.length ? (
				<div className="fwt-entry-link-list">
					{items.map((item) => (
						<a href={hrefFor(item)} key={item.key}>
							<span>{labelFor(item)}</span>
							<strong>{item.well_count > 0 ? `${formatNumber(item.well_count)} wells` : "Public record path"}</strong>
						</a>
					))}
				</div>
			) : (
				<p className="fwt-map-status">No backend rows are available for this group right now.</p>
			)}
			<p><a className="fwt-gold-link" href={directoryHref}>{directoryLabel}</a></p>
		</section>
	)
}

function apiLabel(event: KansasActivityEvent) {
	if (event.api14) return `API ${event.api14}`
	if (event.api_raw) return `API ${event.api_raw}`
	if (event.kgs_kid) return `KGS KID ${event.kgs_kid}`
	return null
}

function activitySummary(event: KansasActivityEvent) {
	return [
		meaningfulOperator(event.operator),
		event.county ? countyLabel(event.county) : null,
		meaningfulField(event.field_name),
		event.lease_name ? `${titleCase(event.lease_name)} lease` : null,
	]
		.filter(Boolean)
		.join(" - ") || "Kansas public-record activity"
}

function countyLabel(value?: string | null) {
	const clean = (value || "").trim()
	if (!clean) return "Kansas County"
	return /\bCounty$/i.test(clean) ? titleCase(clean) : `${titleCase(clean)} County`
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
	return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function formatNumber(value: number) {
	return value.toLocaleString("en-US")
}

function meaningfulOperator(value?: string | null) {
	const clean = (value || "").trim()
	if (!clean || /^(unavailable|unknown|n\/a|na)$/i.test(clean)) return null
	return clean
}

function meaningfulField(value?: string | null) {
	const clean = (value || "").trim()
	if (!clean || /^(unknown|unnamed)$/i.test(clean)) return null
	return `${titleCase(clean)} Field`
}
