import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import { BreadcrumbTrail } from "@/components/future/BreadcrumbTrail"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { RecordConversionCta } from "@/components/future/RecordConversionCta"
import { apiBaseUrl, siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"

type EntityKind = "counties" | "operators" | "fields"
type RecordKind = "county" | "operator" | "field"

type Envelope<T> = {
	data: T
	meta: { state: string }
}

export type SummaryEntry = {
	key: string
	display_name: string
	well_count: number
}

export type KansasWellCard = {
	id: string
	api14: string | null
	api_raw: string | null
	kgs_kid: string | null
	kcc_permit: string | null
	well_name: string | null
	county: string | null
	operator: string | null
	field_name: string | null
	lease_name: string | null
	lifecycle_status: string | null
	well_class_raw: string | null
	status_raw: string | null
	status2_raw: string | null
	township: number | null
	township_direction: string | null
	range: number | null
	range_direction: string | null
	section: number | null
	subdivision_1_largest: string | null
	subdivision_2: string | null
	subdivision_3: string | null
	subdivision_4_smallest: string | null
	spot: string | null
	feet_north_from_reference: number | null
	feet_east_from_reference: number | null
	reference_corner: string | null
	permit_date: string | null
	spud_date: string | null
	completion_date: string | null
	plug_date: string | null
	total_depth: number | null
	producing_formation: string | null
	formation_at_total_depth: string | null
	ip_oil: number | null
	ip_gas: number | null
	ip_water: number | null
	comments: string | null
	source_latitude: number | null
	source_longitude: number | null
	horizontal_or_directional: boolean
	trajectory_available: boolean
	source_format: string | null
	source_object_id: number | null
	first_seen_at: string | null
	last_seen_at: string | null
}

type KansasEntityDetail = {
	kind: EntityKind
	key: string
	display_name: string
	well_count: number
	producing_count: number
	permit_count: number
	located_well_count: number
	data_as_of: string | null
	top_counties: SummaryEntry[]
	top_operators: SummaryEntry[]
	top_fields: SummaryEntry[]
	status_counts: SummaryEntry[]
	wells: KansasWellCard[]
	permitted_wells: KansasWellCard[]
	producing_wells: KansasWellCard[]
	completed_wells: KansasWellCard[]
}

type KansasWellDetail = {
	well: KansasWellCard
	related_wells: KansasWellCard[]
}

type DetailGridRow = [string, ReactNode]

const configs: Record<EntityKind, {
	singular: string
	plural: string
	path: string
	recordKind: RecordKind
}> = {
	counties: {
		singular: "County",
		plural: "Counties",
		path: "/counties",
		recordKind: "county",
	},
	operators: {
		singular: "Operator",
		plural: "Operators",
		path: "/operators",
		recordKind: "operator",
	},
	fields: {
		singular: "Field",
		plural: "Fields",
		path: "/fields",
		recordKind: "field",
	},
}

export async function generateEntityMetadata(kind: EntityKind, slug: string): Promise<Metadata> {
	const config = configs[kind]
	const result = await loadEntity(kind, slug)
	if (!result) {
		return seoMetadata({
			title: `Kansas ${config.singular} Unavailable | ${siteConfig.brandName}`,
			description: `No Kansas ${config.singular.toLowerCase()} page is available for this public-record path right now.`,
			path: `${config.path}/${encodeURIComponent(slug)}`,
			noIndex: true,
		})
	}
	const name = entityTitle(kind, result.display_name)
	return seoMetadata({
		title: `${name} Oil & Gas Wells | ${siteConfig.brandName}`,
		description: `${name} Kansas oil and gas well records, including producing, permitted, located, operator, field, and representative well context from public KGS data.`,
		path: entityPath(kind, result.display_name),
	})
}

export async function EntityDetailPage({ kind, slug }: { kind: EntityKind; slug: string }) {
	const routeSlug = decodeRouteSegment(slug)
	const normalizedPath = entityPath(kind, routeSlug)
	if (requestedEntityPath(kind, slug) !== normalizedPath) {
		permanentRedirect(normalizedPath)
	}

	const detail = await loadEntity(kind, routeSlug)
	if (!detail || detail.well_count <= 0) notFound()
	const canonicalPath = entityPath(kind, detail.display_name)
	if (normalizedPath !== canonicalPath) {
		permanentRedirect(canonicalPath)
	}

	const name = entityTitle(kind, detail.display_name)
	const relatedGroups = relatedGroupsFor(kind, detail).filter((group) => group.items.length > 0)
	const wellGroups = entityWellGroups(detail)
	const displayedWellCount = wellGroups.reduce((total, group) => total + group.wells.length, 0)
	const breadcrumbs = [
		{ name: "Home", path: "/" },
		{ name: configs[kind].plural, path: configs[kind].path },
		{ name, path: canonicalPath },
	]

	return (
		<MarketingLayout>
			<BreadcrumbTrail items={breadcrumbs} />
			<section className="fwt-county-hero">
				<div className="fwt-container fwt-county-hero-grid">
					<div>
						<span className="fwt-eyebrow">Kansas {configs[kind].singular}</span>
						<h1>{name} oil and gas wells</h1>
						<p>{entitySummary(kind, detail)}</p>
					</div>
					<div className="fwt-county-kpis">
						<Metric label="Total entity records" value={detail.well_count} />
						<Metric label="Permit-status" value={detail.permit_count} />
						<Metric label="Producing" value={detail.producing_count} />
						<Metric label="Located records" value={detail.located_well_count} />
					</div>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-county-layout">
					<main className="fwt-county-main">
						<Panel eyebrow="Full-scope metrics" title={`${configs[kind].singular} key metrics`}>
							<DetailGrid rows={[
								["Total entity records", `${detail.well_count.toLocaleString()} wells`],
								["Displayed-card sample", `${displayedWellCount.toLocaleString()} records`],
								["Producing records", `${detail.producing_count.toLocaleString()} records`],
								["Permit-status records", `${detail.permit_count.toLocaleString()} records`],
								["Located records", `${detail.located_well_count.toLocaleString()} records`],
								["Data as of", dateLabel(detail.data_as_of)],
							]} />
							<div className="fwt-county-card-meta">
								<span>{displayedWellCount.toLocaleString()} records represented in displayed sample</span>
								<span>Full entity aggregate counts remain separate from displayed cards</span>
							</div>
						</Panel>
						<RecordConversionCta
							kind={configs[kind].recordKind}
							pageType={configs[kind].recordKind}
							label={name}
							entityId={detail.key}
							entityName={name}
							returnTo={canonicalPath}
							placement="content"
						/>
						<EntityStatusCounts detail={detail} />
						{relatedGroups.length ? (
							<Panel eyebrow="Top related entities" title="Entity relationships">
								<div className="fwt-entry-grid">
									{relatedGroups.map((group) => (
										<section className="fwt-entry-block fwt-related-rank-list" key={group.title}>
											<span className="fwt-eyebrow">Full entity aggregate</span>
											<h3>{group.title}</h3>
											<SummaryList items={group.items} hrefFor={group.hrefFor} labelFor={group.labelFor} />
										</section>
									))}
								</div>
							</Panel>
						) : null}
						<Panel eyebrow="Production-ranking subset" title="Lease-level production context">
							<p>
								Kansas production is generally reported at the lease level. This landing card keeps those production workflows in the Future Wells workspace and uses KGS well-master records for the entity counts shown here.
							</p>
							<DetailGrid rows={[
								["Producing records", `${detail.producing_count.toLocaleString()} wells`],
								["Displayed basis", "KGS well inventory snapshot"],
								["Monthly production level", "Lease-level in Kansas"],
								["Current page scope", `${configs[kind].singular} landing card`],
							]} />
						</Panel>
						<GroupedWellSections groups={wellGroups} />
						<Panel eyebrow="Source and methodology" title="Independent public-record research">
							<p>
								Future Wells Kansas is an independent research site. These pages summarize KGS public well inventory records and related KCC/KGS concepts where available.
							</p>
							<DetailGrid rows={[
								["Entity slug", detail.key],
								["Dataset", "ks_well"],
								["Location coverage", percentLabel(detail.located_well_count, detail.well_count)],
								["Current snapshot", "Yes"],
							]} />
						</Panel>
					</main>
					<aside className="fwt-county-aside">
						<Panel eyebrow="Browse" title="Full collection links">
							<div className="fwt-activity-date-links">
								<Link href={`${canonicalPath}#representative-wells`}>{name} well collection</Link>
								<Link href={configs[kind].path}>All {configs[kind].plural.toLowerCase()}</Link>
								<a href={workspaceHref(kind, name, detail.key)}>Open map collection</a>
								<a href={workspaceHref(kind, name, detail.key)}>Latest production ranking</a>
								<Link href="/browse">Kansas browse</Link>
							</div>
						</Panel>
						<Panel eyebrow="Source and methodology" title="Independent public-record research">
							<p>
								Future Wells Kansas is an independent research site. These pages summarize Kansas public well inventory records where available.
							</p>
							<p>Verify operational, ownership, production, and compliance decisions with official KCC and KGS records before relying on them.</p>
						</Panel>
						<Panel eyebrow="Source attribution" title="Snapshot facts">
							<DetailGrid single rows={[
								["Dataset", "ks_well"],
								["Page type", configs[kind].recordKind],
								["Canonical slug", detail.key],
								["Data as of", dateLabel(detail.data_as_of)],
								["Current snapshot", "Yes"],
							]} />
						</Panel>
					</aside>
				</div>
			</section>
		</MarketingLayout>
	)
}

export async function generateWellMetadata(api: string): Promise<Metadata> {
	const result = await loadWell(api)
	if (!result) {
		return seoMetadata({
			title: `Kansas Well Unavailable | ${siteConfig.brandName}`,
			description: "No Kansas well page is available for this public-record path right now.",
			path: `/wells/${encodeURIComponent(api)}`,
			noIndex: true,
		})
	}
	const title = wellTitle(result.well)
	const apiLabel = wellApiLabel(result.well)
	return seoMetadata({
		title: `${title} | Kansas Well Record | ${siteConfig.brandName}`,
		description: `Kansas public well record${apiLabel ? ` for ${apiLabel}` : ""}, including lifecycle status, operator, county, field, dates, depth, location, and source context where available.`,
		path: wellPath(result.well),
	})
}

export async function WellDetailPage({ api, slug }: { api: string; slug?: string[] }) {
	const detail = await loadWell(api)
	if (!detail) notFound()
	const well = detail.well
	const canonicalPath = wellPath(well)
	if (requestedWellPath(api, slug) !== canonicalPath) {
		permanentRedirect(canonicalPath)
	}
	const title = wellTitle(well)
	const breadcrumbs = [
		{ name: "Home", path: "/" },
		{ name: "Wells", path: "/browse" },
		{ name: wellBreadcrumb(well), path: canonicalPath },
	]
	return (
		<MarketingLayout>
			<BreadcrumbTrail items={breadcrumbs} />
			<section className="fwt-well-hero">
				<div className="fwt-container fwt-well-hero-grid">
					<div>
						<span className="fwt-eyebrow">Kansas well record</span>
						<h1>{title}</h1>
						<p>{wellSummary(well)}</p>
						<div className="fwt-well-badges">
							{well.lifecycle_status ? <span>{statusLabel(well.lifecycle_status)}</span> : null}
							{wellApiLabel(well) ? <span>{wellApiLabel(well)}</span> : null}
							{well.kgs_kid ? <span>KGS KID {well.kgs_kid}</span> : null}
							{well.kcc_permit ? <span>KCC permit {well.kcc_permit}</span> : null}
						</div>
					</div>
					<div className="fwt-well-summary">
						<Metric label="Status" value={well.lifecycle_status ? statusLabel(well.lifecycle_status) : null} />
						<Metric label="County" value={well.county ? countyLabel(well.county) : null} />
						<Metric label="Field" value={meaningfulField(well.field_name)} />
						<Metric label="Data as of" value={well.last_seen_at ? dateLabel(well.last_seen_at) : null} />
					</div>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-well-layout">
					<main className="fwt-well-main">
						<Panel eyebrow="Public-record evidence" title="Well status and linked data" variant="well">
							<p>Inventory status: <em>{well.lifecycle_status ? statusLabel(well.lifecycle_status) : "Not reported"}.</em></p>
							<p>Production evidence: <em>{productionEvidence(well)}</em></p>
							<DetailGrid rows={[
								["KGS KID", well.kgs_kid],
								["Formatted API", wellApiLabel(well)],
								["Permit/activity summary", primaryActivityLabel(well)],
								["Location summary", locationSummary(well)],
								["Formation/depth", formationDepthSummary(well)],
								["Horizontal/directional", horizontalSummary(well)],
								["Data as of", dateLabel(well.last_seen_at)],
							]} />
						</Panel>
						<RecordConversionCta
							kind="well"
							pageType="well"
							label={wellBreadcrumb(well)}
							entityId={well.api14 || well.api_raw || well.kgs_kid || well.id}
							entityName={title}
							returnTo={canonicalPath}
							placement="content"
						/>
						<SurfaceMapPanel well={well} />
						<ProductionContextPanel well={well} />
						<ActivityTimelinePanel well={well} />
						<LifecyclePanel well={well} />
						<Panel eyebrow="Geometry" title="Trajectory summary" variant="well">
							<DetailGrid rows={[
								["Horizontal/directional flag", well.horizontal_or_directional ? "Reported by KGS" : "Not reported"],
								["Trajectory geometry", well.trajectory_available ? "Source trajectory flag available" : "No source trajectory line available"],
								["Surface point", coordinateLabel(well)],
								["Location confidence", coordinateLabel(well) ? "Source latitude/longitude present" : "No coordinate pair in this snapshot"],
							]} />
						</Panel>
						<Panel eyebrow="Location" title="PLSS and surface location" variant="well">
							<DetailGrid rows={[
								["County", well.county ? countyLabel(well.county) : null],
								["Section-township-range", plssLabel(well)],
								["Subdivisions", subdivisionLabel(well)],
								["Spot", well.spot],
								["Footage", footageLabel(well)],
								["Coordinate pair", coordinateLabel(well)],
							]} />
						</Panel>
						<Panel eyebrow="Dates and depth" title="Activity dates" variant="well">
							<DetailGrid rows={[
								["Permit date", dateLabel(well.permit_date)],
								["Spud date", dateLabel(well.spud_date)],
								["Completion date", dateLabel(well.completion_date)],
								["Plug date", dateLabel(well.plug_date)],
								["Total depth", feetLabel(well.total_depth)],
								["Initial test date", dateLabel(well.completion_date)],
							]} />
						</Panel>
						<Panel eyebrow="Well context" title="Kansas source record details" variant="well">
							<DetailGrid rows={[
								["Well name", title],
								["Lease", well.lease_name ? titleCase(well.lease_name) : null],
								["Operator", meaningfulOperator(well.operator)],
								["County", well.county ? countyLabel(well.county) : null],
								["Field", meaningfulField(well.field_name)],
								["API", wellApiLabel(well)],
								["KGS KID", well.kgs_kid],
								["KCC permit", well.kcc_permit],
							]} />
						</Panel>
						<Panel eyebrow="Source codes" title="Status and formation" variant="well">
							<DetailGrid rows={[
								["Lifecycle status", well.lifecycle_status ? statusLabel(well.lifecycle_status) : null],
								["Well class", well.well_class_raw],
								["Raw status", well.status_raw],
								["Secondary status", well.status2_raw],
								["Producing formation", well.producing_formation],
								["Formation at total depth", well.formation_at_total_depth],
							]} />
							{clean(well.comments) ? <p>{well.comments}</p> : null}
						</Panel>
						<Panel eyebrow="Completion snapshot" title="Initial production test" variant="well">
							<DetailGrid rows={[
								["Initial oil", rateLabel(well.ip_oil, "bbl")],
								["Initial gas", rateLabel(well.ip_gas, "mcf")],
								["Initial water", rateLabel(well.ip_water, "bbl")],
								["Reporting basis", "Source completion snapshot"],
							]} />
						</Panel>
						<Panel eyebrow="Nearby context" title="Related county wells" variant="well">
							<WellList wells={detail.related_wells} emptyText="No related well cards were returned for this county yet." />
						</Panel>
					</main>
					<aside className="fwt-well-aside">
						<Panel eyebrow="Related entities" title="Browse related records" variant="well">
							<div className="fwt-activity-date-links">
								{well.county ? <Link href={entityPath("counties", well.county)}>{countyLabel(well.county)}</Link> : null}
								{meaningfulOperator(well.operator) ? <Link href={entityPath("operators", meaningfulOperator(well.operator) || "")}>{meaningfulOperator(well.operator)}</Link> : null}
								{meaningfulField(well.field_name) ? <Link href={entityPath("fields", well.field_name || "")}>{meaningfulField(well.field_name)}</Link> : null}
								<Link href="/browse">Kansas browse</Link>
							</div>
						</Panel>
						<Panel eyebrow="Kansas explainers" title="Guide links" variant="well">
							<div className="fwt-activity-date-links">
								<Link href="/guides/api-number-and-kgs-kid-explainer">API number and KGS KID</Link>
								<Link href="/guides/c1-notice-of-intent-explainer">C-1 notice of intent</Link>
								<Link href="/guides/aco1-completion-form-explainer">ACO-1 completion form</Link>
								<Link href="/guides/cp1-cp4-plugging-explainer">CP-1 / CP-4 plugging records</Link>
								<Link href="/guides/well-status-explainer">Well status</Link>
								<Link href="/guides/plss-location-explainer">PLSS location</Link>
							</div>
						</Panel>
						<Panel eyebrow="Permit snapshot" title={permitPanelTitle(well)} variant="well">
							<p>Source snapshot only. This does not replace official KCC review.</p>
							<DetailGrid single rows={[
								["Permit date", dateLabel(well.permit_date)],
								["Spud date", dateLabel(well.spud_date)],
								["Status", well.lifecycle_status ? statusLabel(well.lifecycle_status) : null],
							]} />
						</Panel>
						<Panel eyebrow="Map point" title="Surface map point" variant="well">
							<div className="fwt-map-point">
								<p>{coordinateLabel(well) || "No source coordinate pair is available."}</p>
								{coordinateLabel(well) ? <a href={mapHref(well)}>Open in Future Wells map</a> : null}
							</div>
						</Panel>
						<Panel eyebrow="Source note" title="Public-record source" variant="well">
							<p>
								Well pages combine Kansas public well inventory records and completion-style source fields where available. Verify operator, status, location, and lifecycle facts against official records before relying on them.
							</p>
						</Panel>
						<Panel eyebrow="Source" title="Source attribution" variant="well">
							<DetailGrid single rows={[
								["Source ID", well.source_object_id ? String(well.source_object_id) : null],
								["Source format", well.source_format ? well.source_format.toUpperCase() : null],
								["Dataset", "ks_well"],
								["First seen", dateLabel(well.first_seen_at)],
								["Last seen", dateLabel(well.last_seen_at)],
								["Current snapshot", "Yes"],
							]} />
						</Panel>
					</aside>
				</div>
			</section>
		</MarketingLayout>
	)
}

export async function EntityIndexPage({ kind }: { kind: EntityKind }) {
	const page = await loadBrowse()
	const config = configs[kind]
	if (!page) {
		throw new Error(`Kansas browse API unavailable for ${kind} index`)
	}
	const items = kind === "counties" ? page.top_counties : kind === "operators" ? page.top_operators : page.top_fields
	return (
		<MarketingLayout>
			<section className="fwt-county-hero">
				<div className="fwt-container fwt-county-hero-grid">
					<div>
						<span className="fwt-eyebrow">Kansas {config.plural}</span>
						<h1>Kansas oil and gas {config.plural.toLowerCase()}</h1>
						<p>Browse source-backed Kansas {config.plural.toLowerCase()} with representative public well counts and local landing cards.</p>
					</div>
					<div className="fwt-county-kpis">
						<Metric label="Displayed pages" value={items.length} />
						<Metric label="Returned wells" value={items.reduce((total, item) => total + item.well_count, 0)} />
					</div>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container">
					<div className="fwt-entry-grid">
						{items.map((item) => (
							<section className="fwt-copy fwt-entry-block" key={item.key}>
								<span className="fwt-eyebrow">{item.well_count.toLocaleString()} wells</span>
								<h2><a href={entityPath(kind, item.display_name)}>{kind === "counties" ? countyLabel(item.display_name) : kind === "fields" ? fieldLabel(item.display_name) : item.display_name}</a></h2>
							</section>
						))}
					</div>
				</div>
			</section>
		</MarketingLayout>
	)
}

async function loadEntity(kind: EntityKind, slug: string) {
	return loadJson<KansasEntityDetail>(`/api/ks/${kind}/${encodeURIComponent(slug)}`)
}

async function loadWell(api: string) {
	return loadJson<KansasWellDetail>(`/api/ks/wells/${encodeURIComponent(api)}`)
}

async function loadBrowse() {
	return loadJson<{
		top_counties: SummaryEntry[]
		top_operators: SummaryEntry[]
		top_fields: SummaryEntry[]
	}>(`/api/ks/browse`)
}

async function loadJson<T>(path: string): Promise<T | null> {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		cache: "no-store",
		signal: AbortSignal.timeout(25000),
	})
	if (response.status === 404) {
		return null
	}
	if (!response.ok) {
		throw new Error(`Kansas API unavailable for ${path}: ${response.status}`)
	}
	const envelope = (await response.json()) as Envelope<T>
	return envelope.data
}

function Panel({ eyebrow, title, children, variant, id }: { eyebrow: string; title: string; children: ReactNode; variant?: "well"; id?: string }) {
	const className = variant === "well" ? "fwt-copy fwt-county-panel fwt-well-panel" : "fwt-copy fwt-county-panel"
	return (
		<section className={className} id={id}>
			<span className="fwt-eyebrow">{eyebrow}</span>
			<h2>{title}</h2>
			{children}
		</section>
	)
}

function EntityStatusCounts({ detail }: { detail: KansasEntityDetail }) {
	const counts = detail.status_counts.length
		? detail.status_counts
		: [
			{ key: "producing", display_name: "producing", well_count: detail.producing_count },
			{ key: "planned", display_name: "planned", well_count: detail.permit_count },
		].filter((item) => item.well_count > 0)
	if (!counts.length) return null
	return (
		<Panel eyebrow="Status mix" title="Counts by KGS status">
			<p>Scope: full entity aggregate. These labels are normalized from Kansas well inventory status values. Use the official source record for legal or operational decisions.</p>
			<div className="fwt-detail-grid">
				{counts.map((item) => (
					<div key={item.key}>
						<span>{statusLabel(item.display_name)}</span>
						<p className="fwt-status-code-note">Inventory status label from the public well record.</p>
						<strong>{item.well_count.toLocaleString()}</strong>
					</div>
				))}
			</div>
		</Panel>
	)
}

function Metric({ label, value }: { label: string; value?: string | number | null }) {
	const text = typeof value === "number" ? value.toLocaleString("en-US") : value || "Not reported"
	return (
		<div>
			<span>{label}</span>
			<strong>{text}</strong>
		</div>
	)
}

function DetailGrid({ rows, single }: { rows: DetailGridRow[]; single?: boolean }) {
	const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined && value !== "")
	if (!visibleRows.length) return <p className="fwt-map-status">No source fields are available for this panel yet.</p>
	return (
		<div className={`fwt-detail-grid${single ? " single" : ""}`}>
			{visibleRows.map(([label, value]) => (
				<div key={label}>
					<span>{label}</span>
					<strong>{value}</strong>
				</div>
			))}
		</div>
	)
}

function GroupedWellSections({
	groups,
}: {
	groups: Array<{ eyebrow: string; title: string; intro: string; wells: KansasWellCard[] }>
}) {
	const visibleGroups = groups.filter((group) => group.wells.length > 0)
	if (!visibleGroups.length) {
		return (
			<Panel eyebrow="Well records" title="Representative well records" id="representative-wells">
				<p className="fwt-map-status">No representative well cards were returned yet.</p>
			</Panel>
		)
	}
	return (
		<>
			{visibleGroups.map((group, index) => (
				<Panel eyebrow={group.eyebrow} title={group.title} id={index === 0 ? "representative-wells" : undefined} key={group.title}>
					<p>{group.intro}</p>
					<WellList wells={group.wells} />
				</Panel>
			))}
		</>
	)
}

function WellList({ wells, emptyText = "No representative well cards were returned yet." }: { wells: KansasWellCard[]; emptyText?: string }) {
	if (!wells.length) return <p className="fwt-map-status">{emptyText}</p>
	return (
		<div className="fwt-county-well-list">
			{wells.map((well) => (
				<article key={well.id}>
					<strong><a href={wellPath(well)}>{wellTitle(well)}</a></strong>
					<p>{[meaningfulOperator(well.operator), well.county ? countyLabel(well.county) : null, meaningfulField(well.field_name)].filter(Boolean).join(" - ") || "Kansas public well record"}</p>
					<div className="fwt-county-card-meta">
						{wellApiLabel(well) ? <span>{wellApiLabel(well)}</span> : null}
						{well.lifecycle_status ? <span>{statusLabel(well.lifecycle_status)}</span> : null}
						{dateLabel(primaryActivityDate(well)) ? <span>Activity date {dateLabel(primaryActivityDate(well))}</span> : null}
					</div>
					<a href={wellPath(well)}>View record</a>
				</article>
			))}
		</div>
	)
}

function SummaryList({
	items,
	hrefFor,
	labelFor,
}: {
	items: SummaryEntry[]
	hrefFor: (item: SummaryEntry) => string
	labelFor: (item: SummaryEntry) => string
}) {
	return (
		<div className="fwt-entry-link-list">
			{items.slice(0, 5).map((item) => (
				<a href={hrefFor(item)} key={item.key}>
					<span>{labelFor(item)}</span>
					<strong>{item.well_count.toLocaleString()} wells</strong>
				</a>
			))}
		</div>
	)
}

function SurfaceMapPanel({ well }: { well: KansasWellCard }) {
	const hasPoint = well.source_latitude != null && well.source_longitude != null
	const trajectoryStatus = well.trajectory_available
		? "Trajectory source flag available"
		: well.horizontal_or_directional
			? "Horizontal/directional status only"
			: "No trajectory geometry"
	return (
		<Panel eyebrow="One-well map" title="Surface and horizontal trajectory" variant="well">
			<div className="fwt-well-map-panel">
				<div className="fwt-well-map-head">
					<p>
						{hasPoint
							? `Surface point is reported at ${coordinateLabel(well)}.`
							: "No source surface point is available for this Kansas well snapshot."} {trajectorySourceSentence(well)}
					</p>
					<span className="fwt-status-badge">{trajectoryStatus}</span>
				</div>
				<div className={hasPoint ? "fwt-detail-map-shell" : "fwt-detail-map-empty"} aria-label="Kansas well surface map">
					{hasPoint ? (
						<>
							<span className="fwt-map-section-line vertical" />
							<span className="fwt-map-section-line horizontal" />
							<span className="fwt-map-well-dot" />
							<span className="fwt-map-label county">{well.county ? countyLabel(well.county) : "Kansas"}</span>
							<span className="fwt-map-label coords">{coordinateLabel(well)}</span>
							<span className="fwt-map-label trajectory">{trajectoryStatus}</span>
						</>
					) : (
						<p>No source coordinate pair was returned for this KGS well record.</p>
					)}
				</div>
				<p className="fwt-map-status">
					Kansas currently exposes a surface coordinate and a horizontal/directional classification flag. It does not expose a Colorado-style wellbore line for this well, so this page does not draw or estimate a trajectory.
				</p>
			</div>
		</Panel>
	)
}

function ProductionContextPanel({ well }: { well: KansasWellCard }) {
	return (
		<Panel eyebrow="Lease-level production context" title="Production context" variant="well">
			<p>Kansas production is generally reported at the lease level, so this public well card does not present current well-level monthly production volumes.</p>
			<DetailGrid rows={[
				["Displayed basis", "Well inventory snapshot"],
				["Well-level monthly volumes", "Not reported on this page"],
				["Initial oil test", rateLabel(well.ip_oil, "bbl")],
				["Initial gas test", rateLabel(well.ip_gas, "mcf")],
				["Producing formation", well.producing_formation],
				["Completion date", dateLabel(well.completion_date)],
			]} />
		</Panel>
	)
}

function ActivityTimelinePanel({ well }: { well: KansasWellCard }) {
	const events = sourceActivityEvents(well)
	return (
		<Panel eyebrow="Daily reports" title="Daily report activity timeline" variant="well">
			<p>These source dates come from the current KGS well snapshot and linked activity-style fields. They do not replace official filing review.</p>
			<div className="fwt-source-timeline">
				{events.map((event) => (
					<article key={event.title}>
						<span>{event.date ? dateLabel(event.date) : "No source date"}</span>
						<h3>{event.title}</h3>
						<p>{event.body}</p>
						<div className="fwt-county-card-meta">
							<span>{event.found ? "Source signal found" : "No source-specific signal returned"}</span>
							{event.tag ? <span>{event.tag}</span> : null}
						</div>
					</article>
				))}
			</div>
		</Panel>
	)
}

function LifecyclePanel({ well }: { well: KansasWellCard }) {
	const steps = [
		{
			title: "Permit or location record",
			date: well.permit_date,
			found: Boolean(well.permit_date || well.lifecycle_status === "planned"),
			body: "KCC or KGS permit/location context can indicate requested drilling, planned status, or an inventory record before spud.",
			href: "/guides/c1-notice-of-intent-explainer",
			cta: "What is a C-1 intent?",
		},
		{
			title: "Spud and drilling activity",
			date: well.spud_date,
			found: Boolean(well.spud_date),
			body: "A spud date indicates drilling activity was reported in the source well record.",
			href: "/guides/well-status-explainer",
			cta: "How Kansas status is read",
		},
		{
			title: "Completion or production evidence",
			date: well.completion_date,
			found: Boolean(well.completion_date || well.lifecycle_status === "producing"),
			body: "Completion and production-style fields can indicate a completed or producing record, depending on the source status combination.",
			href: "/guides/aco1-completion-form-explainer",
			cta: "What is an ACO-1?",
		},
		{
			title: "Plugging or inactive status",
			date: well.plug_date,
			found: Boolean(well.plug_date || well.lifecycle_status === "plugged"),
			body: "Plug dates and plugging status fields are separate source signals and should be confirmed against official filings.",
			href: "/guides/cp1-cp4-plugging-explainer",
			cta: "Read plugging guide",
		},
	]
	return (
		<Panel eyebrow="Lifecycle" title="Well lifecycle timeline" variant="well">
			<div className="fwt-lifecycle-stack">
				{steps.map((step) => (
					<article key={step.title}>
						<h3>{step.title}</h3>
						<span className={step.found ? "fwt-status-badge success" : "fwt-status-badge"}>{step.found ? "Source signal found" : "No source-specific signal returned"}</span>
						<p>{step.date ? `${dateLabel(step.date)}. ` : ""}{step.body}</p>
						<a href={step.href}>{step.cta}</a>
					</article>
				))}
			</div>
		</Panel>
	)
}

function relatedGroupsFor(kind: EntityKind, detail: KansasEntityDetail) {
	return [
		{
			title: "Top counties",
			items: detail.top_counties,
			hrefFor: (item: SummaryEntry) => entityPath("counties", item.display_name),
			labelFor: (item: SummaryEntry) => countyLabel(item.display_name),
		},
		{
			title: "Top operators",
			items: detail.top_operators,
			hrefFor: (item: SummaryEntry) => entityPath("operators", item.display_name),
			labelFor: (item: SummaryEntry) => item.display_name,
		},
		{
			title: "Top fields",
			items: detail.top_fields,
			hrefFor: (item: SummaryEntry) => entityPath("fields", item.display_name),
			labelFor: (item: SummaryEntry) => fieldLabel(item.display_name),
		},
	].filter((group) => groupNameToKind(group.title) !== kind)
}

function entityWellGroups(detail: KansasEntityDetail) {
	const permittedWells = detail.permitted_wells || detail.wells.filter((well) => well.lifecycle_status === "planned" || well.lifecycle_status === "intent_expired").slice(0, 10)
	const producingWells = detail.producing_wells || detail.wells.filter((well) => well.lifecycle_status === "producing").slice(0, 10)
	const completedWells = detail.completed_wells || detail.wells.filter((well) => well.lifecycle_status === "completed").slice(0, 10)
	return [
		{
			eyebrow: `${permittedWells.length.toLocaleString()} wells`,
			title: "Recent permitted wells",
			intro: "Recent Kansas permit-status records in this public well collection, sorted with fresher source dates first.",
			wells: permittedWells,
		},
		{
			eyebrow: `${producingWells.length.toLocaleString()} wells`,
			title: "Producing wells",
			intro: "Producing well records in this public well collection, ordered by the freshest source activity date available.",
			wells: producingWells,
		},
		{
			eyebrow: `${completedWells.length.toLocaleString()} wells`,
			title: "Recently completed wells",
			intro: "Completed well records in this public well collection, sorted by the latest completion-style source dates available.",
			wells: completedWells,
		},
	]
}

function groupNameToKind(title: string): EntityKind {
	if (title.includes("counties")) return "counties"
	if (title.includes("operators")) return "operators"
	return "fields"
}

function entitySummary(kind: EntityKind, detail: KansasEntityDetail) {
	const name = entityTitle(kind, detail.display_name)
	const parts = [
		`${detail.well_count.toLocaleString()} Kansas well records`,
		`${detail.producing_count.toLocaleString()} producing`,
		`${detail.permit_count.toLocaleString()} permitted or planned`,
		detail.located_well_count ? `${detail.located_well_count.toLocaleString()} with source coordinates` : null,
	].filter(Boolean)
	return `${name} has ${parts.join(", ")} in the current KGS-backed snapshot.`
}

function wellSummary(well: KansasWellCard) {
	return [
		meaningfulOperator(well.operator),
		well.county ? countyLabel(well.county) : null,
		meaningfulField(well.field_name),
		well.lifecycle_status ? statusLabel(well.lifecycle_status) : null,
	].filter(Boolean).join(" - ") || "Kansas public well record from KGS source data."
}

function productionEvidence(well: KansasWellCard) {
	if (well.lifecycle_status === "producing") return "KGS lifecycle status reports producing."
	if (well.ip_oil || well.ip_gas || well.ip_water) return "Initial completion test values are present."
	return "No current well-level production volume is reported on this Kansas well card."
}

function primaryActivityLabel(well: KansasWellCard) {
	if (well.permit_date) return `Permit date ${dateLabel(well.permit_date)}`
	if (well.completion_date) return `Completion date ${dateLabel(well.completion_date)}`
	if (well.spud_date) return `Spud date ${dateLabel(well.spud_date)}`
	if (well.plug_date) return `Plug date ${dateLabel(well.plug_date)}`
	return dateLabel(well.last_seen_at) ? `Snapshot observed ${dateLabel(well.last_seen_at)}` : null
}

function locationSummary(well: KansasWellCard) {
	return [
		well.county ? countyLabel(well.county) : null,
		plssLabel(well),
		meaningfulField(well.field_name),
	].filter(Boolean).join(" | ") || null
}

function formationDepthSummary(well: KansasWellCard) {
	return [
		well.producing_formation,
		well.formation_at_total_depth ? `TD formation ${well.formation_at_total_depth}` : null,
		feetLabel(well.total_depth),
	].filter(Boolean).join(" | ") || null
}

function horizontalSummary(well: KansasWellCard) {
	if (well.trajectory_available) return "KGS trajectory flag available"
	if (well.horizontal_or_directional) return "KGS horizontal/directional flag reported"
	return "No horizontal/directional source flag reported"
}

function trajectorySourceSentence(well: KansasWellCard) {
	if (well.trajectory_available) return "A trajectory source flag is present, but no drawn coordinate line is exposed on this public page yet."
	if (well.horizontal_or_directional) return "KGS flags this well as horizontal or directional, but that is a classification rather than a drawn lateral."
	return "No horizontal/directional source flag or drawn trajectory geometry is present."
}

function sourceActivityEvents(well: KansasWellCard) {
	const events = [
		{
			title: "Permit or intent signal",
			date: well.permit_date,
			found: Boolean(well.permit_date),
			tag: well.kcc_permit ? `KCC permit ${well.kcc_permit}` : null,
			body: "A permit date is present in the source well record.",
		},
		{
			title: "Spud recorded",
			date: well.spud_date,
			found: Boolean(well.spud_date),
			tag: "KGS well master",
			body: "KGS reports a spud date for this well.",
		},
		{
			title: "Completion recorded",
			date: well.completion_date,
			found: Boolean(well.completion_date),
			tag: well.producing_formation || "Completion source field",
			body: "Completion, depth, formation, or initial test values may be present for this well.",
		},
		{
			title: "Plugging recorded",
			date: well.plug_date,
			found: Boolean(well.plug_date),
			tag: "Plugging source field",
			body: "A plug date is present in the source well record.",
		},
	]
	const foundEvents = events.filter((event) => event.found)
	if (foundEvents.length) return foundEvents.sort((left, right) => dateSortValue(right.date) - dateSortValue(left.date))
	return [{
		title: "Current inventory snapshot",
		date: well.last_seen_at,
		found: Boolean(well.last_seen_at),
		tag: well.source_format ? well.source_format.toUpperCase() : "KGS source",
		body: "The well appears in the current KGS-backed inventory snapshot, but no linked activity date was returned.",
	}]
}

function permitPanelTitle(well: KansasWellCard) {
	if (well.lifecycle_status === "planned") return "Permit status before spud"
	if (well.permit_date && !well.spud_date) return "Permit status before spud"
	return "Permit status"
}

function mapHref(well: KansasWellCard) {
	const url = new URL("https://futurewells.co/user-area/register")
	url.searchParams.set("state", "KS")
	url.searchParams.set("source", "kansas_marketing_map_link")
	if (well.api14 || well.api_raw || well.kgs_kid) url.searchParams.set("source_entity_id", well.api14 || well.api_raw || well.kgs_kid || "")
	return url.toString()
}

function workspaceHref(kind: EntityKind, name: string, key: string) {
	const url = new URL("https://futurewells.co/user-area/register")
	url.searchParams.set("state", "KS")
	url.searchParams.set("source", "kansas_entity_collection_link")
	url.searchParams.set("source_page_type", configs[kind].recordKind)
	url.searchParams.set("source_entity_id", key)
	url.searchParams.set("source_entity_name", name)
	return url.toString()
}

function entityTitle(kind: EntityKind, value: string) {
	if (kind === "counties") return countyLabel(value)
	if (kind === "fields") return fieldLabel(value)
	return value
}

export function entityPath(kind: EntityKind, value: string) {
	return `${configs[kind].path}/${encodeURIComponent(slugify(value))}`
}

function requestedEntityPath(kind: EntityKind, slug: string) {
	return `${configs[kind].path}/${encodeURIComponent(decodeRouteSegment(slug))}`
}

export function wellPath(well: Pick<KansasWellCard, "api14" | "api_raw" | "kgs_kid" | "id" | "well_name" | "lease_name">) {
	const key = normalizeWellRouteIdentifier(well.api14 || well.api_raw || well.kgs_kid || well.id)
	const slug = canonicalWellSlug(well)
	return slug ? `/wells/${encodeURIComponent(key)}/${encodeURIComponent(slug)}` : `/wells/${encodeURIComponent(key)}`
}

export function wellTitle(well: Pick<KansasWellCard, "well_name" | "lease_name" | "api14" | "api_raw" | "kgs_kid">) {
	const lease = clean(well.lease_name)
	const name = clean(well.well_name)
	if (lease && name && !sameText(lease, name)) return `${titleCase(lease)} ${name}`
	if (name) return titleCase(name)
	if (lease) return titleCase(lease)
	return wellApiLabel(well) || (well.kgs_kid ? `KGS KID ${well.kgs_kid}` : "Kansas well")
}

function wellBreadcrumb(well: KansasWellCard) {
	return wellApiLabel(well) || wellTitle(well)
}

export function wellApiLabel(well: Pick<KansasWellCard, "api14" | "api_raw">) {
	if (well.api_raw) return `API ${well.api_raw}`
	if (well.api14) return `API ${well.api14}`
	return null
}

export function countyLabel(value?: string | null) {
	const cleanValue = clean(value)
	if (!cleanValue) return "Kansas County"
	return /\bCounty$/i.test(cleanValue) ? titleCase(cleanValue) : `${titleCase(cleanValue)} County`
}

export function fieldLabel(value?: string | null) {
	const cleanValue = clean(value)
	if (!cleanValue) return "Kansas field"
	return /\bField$/i.test(cleanValue) ? titleCase(cleanValue) : `${titleCase(cleanValue)} Field`
}

export function statusLabel(value: string) {
	return value.replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

export function dateLabel(value?: string | null) {
	if (!value) return null
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
}

function primaryActivityDate(well: KansasWellCard) {
	return [
		well.permit_date,
		well.completion_date,
		well.spud_date,
		well.plug_date,
		well.last_seen_at,
	].filter(Boolean).sort().at(-1) || null
}

function plssLabel(well: KansasWellCard) {
	const parts = [
		well.section ? `Sec ${well.section}` : null,
		well.township ? `T${well.township}${clean(well.township_direction)}` : null,
		well.range ? `R${well.range}${clean(well.range_direction)}` : null,
	].filter(Boolean)
	return parts.length ? parts.join(" ") : null
}

function subdivisionLabel(well: KansasWellCard) {
	return [
		well.subdivision_1_largest,
		well.subdivision_2,
		well.subdivision_3,
		well.subdivision_4_smallest,
	].map(clean).filter(Boolean).join(" | ") || null
}

function footageLabel(well: KansasWellCard) {
	const parts = [
		well.feet_north_from_reference ? `${well.feet_north_from_reference.toLocaleString()} ft north` : null,
		well.feet_east_from_reference ? `${well.feet_east_from_reference.toLocaleString()} ft east` : null,
		well.reference_corner ? `from ${well.reference_corner}` : null,
	].filter(Boolean)
	return parts.length ? parts.join(" ") : null
}

function coordinateLabel(well: KansasWellCard) {
	if (well.source_latitude == null || well.source_longitude == null) return null
	return `${well.source_latitude.toFixed(6)}, ${well.source_longitude.toFixed(6)}`
}

function feetLabel(value?: number | null) {
	return value ? `${value.toLocaleString()} ft` : null
}

function rateLabel(value: number | null | undefined, unit: string) {
	return value ? `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}` : null
}

function percentLabel(value: number, total: number) {
	if (!total) return "Not reported"
	return `${((value / total) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
}

function dateSortValue(value?: string | null) {
	if (!value) return 0
	const date = new Date(value).getTime()
	return Number.isNaN(date) ? 0 : date
}

function meaningfulOperator(value?: string | null) {
	const cleanValue = clean(value)
	if (!cleanValue || /^(unavailable|unknown|n\/a|na)$/i.test(cleanValue)) return null
	return cleanValue
}

function meaningfulField(value?: string | null) {
	const cleanValue = clean(value)
	if (!cleanValue || /^(unknown|unnamed)$/i.test(cleanValue)) return null
	return fieldLabel(cleanValue)
}

export function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

function canonicalWellSlug(well: Pick<KansasWellCard, "well_name" | "lease_name" | "api14" | "api_raw" | "kgs_kid">) {
	return slugify(wellTitle(well))
}

function requestedWellPath(api: string, slug?: string[]) {
	const segments = [normalizeWellRouteIdentifier(api), ...(slug || [])]
		.map((segment) => encodeURIComponent(decodeURIComponent(segment)))
		.join("/")
	return `/wells/${segments}`
}

function normalizeWellRouteIdentifier(value?: string | null) {
	const trimmed = String(value || "").trim()
	if (!trimmed) return ""
	const digits = trimmed.replace(/\D/g, "")
	if (trimmed.includes("-") && digits.length >= 10) return digits
	return trimmed
}

function decodeRouteSegment(value: string) {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

function titleCase(value: string) {
	return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

function clean(value?: string | null) {
	return (value || "").trim()
}

function sameText(left: string, right: string) {
	return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0
}
