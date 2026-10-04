import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { DisclaimerStrip, MarketingLayout } from "@/components/future/MarketingLayout"
import { futureWellsCtaHref } from "@/config/userArea"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"
import PublicMapClient from "./PublicMapClient"
import "./styles.css"

export const dynamic = "force-dynamic"

export const metadata: Metadata = seoMetadata({
	title: "Kansas Oil & Gas Well Map | Future Wells Kansas",
	description: "Explore a public preview map of representative Kansas oil and gas well records with KGS-backed source coordinates, status context, counties, operators, fields, and links into Kansas record pages.",
	path: "/map",
})

const relatedResources = [
	["Browse", "Kansas record entry points", "Start with top counties, operators, fields, and recent activity from the current Kansas source snapshot.", "/browse", "Open browse"],
	["Activity", "Kansas oil and gas signals", "Read how drilling intents, completions, plugging records, transfers, status changes, and lease production updates are classified.", "/activity", "Open activity guide"],
	["Guides", "KCC and KGS explainers", "Understand Kansas forms, API numbers, KGS KIDs, PLSS locations, well statuses, and production limitations.", "/guides", "Open guides"],
]

const guideLinks = [
	["Kansas API number and KGS KID explainer", "/guides/api-number-and-kgs-kid-explainer"],
	["Kansas C-1 notice of intent explainer", "/guides/c1-notice-of-intent-explainer"],
	["Kansas lease vs well production explainer", "/guides/lease-vs-well-production-explainer"],
	["Kansas PLSS location explainer", "/guides/plss-location-explainer"],
]

export default async function PublicMapPage() {
	return (
		<MarketingLayout pageClassName="fwt-map-page">
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Map", path: "/map" }]} />
			<section className="fwt-hero">
				<div className="fwt-container fwt-hero-grid">
					<div>
						<span className="fwt-eyebrow">Map preview</span>
						<h1>Kansas Oil &amp; Gas Well Map</h1>
						<p>Use this public preview to understand how Kansas well records connect across source locations, API numbers, KGS KIDs, operators, leases, counties, fields, drilling intents, completions, plugging records, transfers, and lease-level production context.</p>
						<div className="fwt-hero-actions">
							<Link className="fwt-btn gold" href="#kansas-map">Explore Public Map</Link>
							<Link className="fwt-btn ghost" href="/browse">Browse Records</Link>
						</div>
					</div>
				</div>
			</section>

			<section className="fwt-section fwt-public-map-section" id="kansas-map">
				<div className="fwt-container">
					<div className="fwt-section-header">
						<div>
							<span className="fwt-eyebrow">Public demo map</span>
							<h2>Explore representative Kansas well locations</h2>
						</div>
						<p>Pan, zoom, filter by status, search loaded well cards, and open Kansas record pages. Clusters load from the Kansas map API after the page renders, so the route appears immediately while the well layer fills in.</p>
					</div>
					<aside className="fwt-public-map-demo-cta" aria-label="Future Wells Co workspace">
						<div>
							<span className="fwt-eyebrow">Demo map</span>
							<h3>You are currently working with a public preview map with limited functionality.</h3>
							<p>Create an account on Future Wells Co to use deeper Kansas search, saved map areas, monitoring, and full workspace workflows.</p>
						</div>
						<a className="fwt-btn gold" href={futureWellsCtaHref("map_page_demo_cta")}>
							Open Kansas in Future Wells Co
						</a>
					</aside>
					<div className="fwt-public-map-frame">
						<Suspense fallback={<p className="fwt-map-status">Loading public Kansas map...</p>}>
							<PublicMapClient />
						</Suspense>
					</div>
					<p className="fwt-map-disclaimer">Data is derived from public Kansas Corporation Commission and Kansas Geological Survey records and may be incomplete, delayed, corrected, duplicated, approximate, transformed, or interpreted incorrectly. Map points are discovery aids, not official boundaries or legal, engineering, title, tax, mineral, regulatory, operational, or investment advice.</p>
					<nav className="fwt-public-map-links" aria-label="Public map resources">
						<Link href="/browse">Browse Kansas</Link>
						<Link href="/activity">Kansas oil and gas activity</Link>
						<Link href="/methodology">Methodology</Link>
						<Link href="/guides">Guides</Link>
					</nav>
				</div>
			</section>

			<section className="fwt-section">
				<div className="fwt-container fwt-copy">
					<span className="fwt-eyebrow">Kansas well map workflow</span>
					<h2>Search Kansas wells by the clues people actually have.</h2>
					<p>A useful Kansas oil and gas well map has to support more than one search path. Sometimes you have an API number, a KGS KID, a lease or well name, an operator from a filing, or a county and field reference from a public source record. Other times you only have a township, range, section, or other PLSS location clue.</p>
					<p>This public map is intentionally lightweight. It helps visitors orient around source-backed Kansas locations and record cards, then points account-based workflows toward Future Wells Co when deeper review is needed.</p>

					<h2>Surface locations, PLSS clues, and horizontal wells.</h2>
					<p>Coordinates can be approximate, transformed from older records, or missing. Many Kansas records also use PLSS descriptions rather than a simple address or parcel boundary. A surface map point can help you find nearby wells and related records, but it should not be treated as a legal boundary, mineral ownership conclusion, or subsurface interpretation.</p>
					<p>Horizontal or directional flags are status/context fields unless a specific source record supplies geometry. This page does not estimate wellbore trajectories from a surface point.</p>

					<h2>Production context belongs at the right level.</h2>
					<p>Kansas production is generally reported at the lease level, not as a clean current monthly well-level volume for every well. Use map points for discovery, then review the source guide and official KGS/KCC records before relying on production, ownership, operating, or compliance facts.</p>
				</div>
			</section>

			<section className="fwt-section dark">
				<div className="fwt-container">
					<div className="fwt-section-header">
						<div>
							<span className="fwt-eyebrow">Explore public records</span>
							<h2>Related Kansas oil and gas map resources</h2>
						</div>
						<p>Use these public pages to move from the map preview into activity, source, county, and guide workflows.</p>
					</div>
					<div className="fwt-grid">
						{relatedResources.map(([eyebrow, title, body, href, label]) => (
							<article className="fwt-card" key={title}>
								<b>{eyebrow}</b>
								<h3>{title}</h3>
								<p>{body}</p>
								<Link href={href}>{label}</Link>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="fwt-section">
				<div className="fwt-container fwt-entry-grid">
					<section className="fwt-copy fwt-entry-block">
						<span className="fwt-eyebrow">Top pages</span>
						<h2>Start with browse context</h2>
						<div className="fwt-entry-link-list">
							<Link href="/counties"><span>Kansas counties</span><strong>Open</strong></Link>
							<Link href="/operators"><span>Kansas operators</span><strong>Open</strong></Link>
							<Link href="/fields"><span>Kansas fields</span><strong>Open</strong></Link>
						</div>
					</section>
					<section className="fwt-copy fwt-entry-block fwt-entry-block-wide">
						<span className="fwt-eyebrow">Guides</span>
						<h2>Map research guides</h2>
						<div className="fwt-entry-link-list">
							{guideLinks.map(([label, href]) => (
								<Link href={href} key={href}>
									<span>{label}</span>
									<strong>Read</strong>
								</Link>
							))}
						</div>
					</section>
				</div>
			</section>

			<DisclaimerStrip />
		</MarketingLayout>
	)
}
