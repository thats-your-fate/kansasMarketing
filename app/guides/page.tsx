import type { Metadata } from "next"
import Link from "next/link"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { allExplainers, allGuideCategories } from "@/app/lib/explainers"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: "Kansas Oil and Gas Source and Document Guides | Future Wells Kansas",
	description: "Plain-English explanations of Kansas KCC and KGS forms, identifiers, well statuses, lease production, and PLSS locations.",
	path: "/guides",
})

export default function GuidesIndexPage() {
	const explainers = allExplainers()
	const categories = allGuideCategories()
		.map((category) => ({
			category,
			guides: explainers.filter((explainer) => explainer.category === category),
		}))
		.filter((group) => group.guides.length > 0)
	const breadcrumbs = [{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]

	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={breadcrumbs} />
			<section className="fwt-section dark">
				<div className="fwt-container fwt-section-header">
					<div>
						<span className="fwt-eyebrow">Kansas guides</span>
						<h1>Kansas oil and gas source and document guides</h1>
						<p>Plain-English explanations of the KCC and KGS forms, identifiers, and record types that appear in Kansas well and lease records. Learn what each record documents, which fields matter, and what it does and does not prove.</p>
					</div>
				</div>
			</section>
			<section className="fwt-section">
				<div className="fwt-container fwt-guide-index">
					<div className="fwt-section-header compact">
						<div>
							<span className="fwt-eyebrow">Browse guides</span>
							<h2>Start with the record or system you need.</h2>
						</div>
						<p>These guides explain public records and data fields. They are not legal, engineering, or regulatory filing advice. Always use current Kansas Corporation Commission and Kansas Geological Survey instructions for an actual filing.</p>
					</div>
					{categories.map((group) => (
						<section className="fwt-guide-category" key={group.category}>
							<div className="fwt-section-header compact">
								<div>
									<span className="fwt-eyebrow">Category</span>
									<h2>{group.category}</h2>
								</div>
							</div>
							<div className="fwt-guide-grid">
								{group.guides.map((explainer) => (
									<article className="fwt-card fwt-guide-card" key={explainer.slug}>
										<span className="fwt-eyebrow">{explainer.category}</span>
										<h2>{explainer.shortTitle}</h2>
										<h3>{explainer.title}</h3>
										<p>{explainer.summary}</p>
										<p className="fwt-guide-source">Last reviewed: {explainer.lastReviewedLabel}</p>
										<p className="fwt-guide-source">
											Source:{" "}
											<a href={explainer.officialSources[0]?.url} rel="nofollow noopener noreferrer">
												{explainer.officialSources[0]?.label}
											</a>
										</p>
										<Link className="fwt-card-cta" href={explainer.href}>
											Read guide
										</Link>
									</article>
								))}
							</div>
						</section>
					))}
				</div>
			</section>
		</MarketingLayout>
	)
}
