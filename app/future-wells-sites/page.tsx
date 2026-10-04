import Image from "next/image"
import type { Metadata } from "next"
import { BreadcrumbTrail } from "@/components/future/BreadcrumbTrail"
import { DisclaimerStrip, MarketingLayout } from "@/components/future/MarketingLayout"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

type FutureWellsSite = {
	name: string
	state: string
	status: string
	url: string
	imageSrc: string
	description: string
}

const futureWellsSites: FutureWellsSite[] = [
	{
		name: "Future Wells Colorado",
		state: "Colorado",
		status: "Live regional site",
		url: "https://futurewellscolorado.com",
		imageSrc: "/brand-book/colorado-og.png",
		description: "Colorado oil and gas records organized around wells, operators, counties, public filings, production history, documents, and regional activity signals.",
	},
	{
		name: "Future Wells Texas",
		state: "Texas",
		status: "Live regional site",
		url: "https://futurewellstexas.com",
		imageSrc: "/brand-book/texas.jpg",
		description: "Texas public oil and gas records organized around wells, operators, counties, permits, completions, documents, and activity signals.",
	},
	{
		name: "Future Wells New Mexico",
		state: "New Mexico",
		status: "Live regional site",
		url: "https://futurewellsnewmexico.com",
		imageSrc: "/brand-book/new_mexico.jpg",
		description: "New Mexico oil and gas data coverage focused on wells, operators, counties, public records, documents, and regional activity.",
	},
	{
		name: "Future Wells Oklahoma",
		state: "Oklahoma",
		status: "Live regional site",
		url: "https://futurewellsoklahoma.com",
		imageSrc: "/brand-book/oklahoma.jpg",
		description: "Oklahoma oil and gas records organized around OCC-linked wells, operators, counties, filings, permits, completions, and documents.",
	},
	{
		name: "Future Wells North Dakota",
		state: "North Dakota",
		status: "Live regional site",
		url: "https://futurewellsnorthdakota.com",
		imageSrc: "/brand-book/north_dakota.jpg",
		description: "Live North Dakota regional site for Bakken-focused wells, operators, counties, public records, and regional activity signals.",
	},
	{
		name: "Future Wells Wyoming",
		state: "Wyoming",
		status: "Live regional site",
		url: "https://futurewellswyoming.com",
		imageSrc: "/brand-book/wy.png",
		description: "Wyoming oil and gas records organized around wells, operators, counties, public records, production context, and regional activity signals.",
	},
]

export const metadata: Metadata = seoMetadata({
	title: "Future Wells Sites | Regional Oil & Gas Record Entry Points",
	description: "Explore the Future Wells regional site network for public oil and gas records across Colorado, Texas, New Mexico, Oklahoma, North Dakota, Wyoming, and Kansas.",
	path: "/future-wells-sites",
})

export default function FutureWellsSitesPage() {
	const breadcrumbs = [
		{ name: "Home", path: "/" },
		{ name: "Future Wells Sites", path: "/future-wells-sites" },
	]

	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={breadcrumbs} />
			<BreadcrumbTrail items={breadcrumbs} />
			<section className="fwt-section dark fwt-sites-page">
				<div className="fwt-container">
					<div className="fwt-section-header">
						<div>
							<span className="fwt-eyebrow">Regional sites</span>
							<h1>State-level entry points for public oil &amp; gas records.</h1>
						</div>
						<p>Each Future Wells regional site is built around the source systems, terminology, counties, operators, and activity patterns of one state.</p>
					</div>
					<div className="fwt-sites-grid">
						{futureWellsSites.map((site) => (
							<a className="fwt-site-card" href={site.url} key={site.name}>
								<b>{site.status}</b>
								<div className="fwt-site-card-image">
									<Image src={site.imageSrc} alt={`${site.state} Future Wells brand visual`} fill sizes="(max-width: 900px) 100vw, 33vw" />
								</div>
								<h2>{site.name}</h2>
								<p>{site.description}</p>
								<span>View regional site</span>
							</a>
						))}
					</div>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-copy">
					<span className="fwt-eyebrow">Current site</span>
					<h2>Future Wells Kansas is part of the regional network.</h2>
					<p>
						Future Wells Kansas focuses on Kansas public oil and gas source records from KCC and KGS, with Kansas-specific guides, browse entry points, activity context, and a public map preview.
					</p>
				</div>
			</section>
			<DisclaimerStrip />
		</MarketingLayout>
	)
}
