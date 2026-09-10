import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BreadcrumbTrail } from "@/components/future/BreadcrumbTrail"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { futureWellsCtaHref } from "@/config/userArea"
import { allExplainers, explainerContent } from "@/app/lib/explainers"
import { seoMetadata } from "@/app/seo"
import { ArticleJsonLd, BreadcrumbJsonLd, FaqPageJsonLd } from "@/app/structured-data"

export function generateStaticParams() {
	return allExplainers().map((explainer) => ({ slug: explainer.slug }))
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const explainer = explainerContent(slug)
	if (!explainer) return {}
	return seoMetadata({
		title: explainer.metaTitle,
		description: explainer.metaDescription,
		path: explainer.href,
		type: "article",
	})
}

export default async function GuideDetailPage({ params }: PageProps) {
	const { slug } = await params
	const explainer = explainerContent(slug)
	if (!explainer) notFound()
	const relatedGuides = explainer.relatedGuideSlugs.map((slug) => explainerContent(slug)).filter((guide): guide is NonNullable<typeof guide> => Boolean(guide))
	const breadcrumbs = [
		{ name: "Home", path: "/" },
		{ name: "Guides", path: "/guides" },
		{ name: explainer.shortTitle, path: explainer.href },
	]
	const ctaSource = `guide:${explainer.slug}`

	return (
		<MarketingLayout>
			<BreadcrumbTrail items={breadcrumbs} />
			<BreadcrumbJsonLd items={breadcrumbs} />
			<ArticleJsonLd title={explainer.title} description={explainer.metaDescription} path={explainer.href} />
			<FaqPageJsonLd faqs={explainer.faqs} />

			<section className="fwt-county-hero">
				<div className="fwt-container fwt-county-hero-grid">
					<div>
						<span className="fwt-eyebrow">Kansas source guide</span>
						<h1>{explainer.title}</h1>
						<p>{explainer.summary}</p>
					</div>
					<div className="fwt-county-kpis">
						<div>
							<span>Category</span>
							<strong>{explainer.category}</strong>
						</div>
						<div>
							<span>Last reviewed</span>
							<strong>{explainer.lastReviewedLabel}</strong>
						</div>
						<div>
							<span>Agency</span>
							<strong>{explainer.agency}</strong>
						</div>
						<div>
							<span>Record type</span>
							<strong>{explainer.formCode}</strong>
						</div>
					</div>
				</div>
			</section>

			<section className="fwt-section">
				<div className="fwt-container fwt-county-layout">
					<main className="fwt-county-main">
						<GuideDisclaimer />

						<section className="fwt-copy fwt-county-panel">
							<span className="fwt-eyebrow">At a glance</span>
							<h2>{explainer.shortTitle}</h2>
							<dl className="nm-meta-list">
								<dt>Record type</dt>
								<dd>{explainer.formCode}</dd>
								<dt>Official or common name</dt>
								<dd>{explainer.officialName}</dd>
								<dt>Agency</dt>
								<dd>{explainer.agency}</dd>
								<dt>Category</dt>
								<dd>{explainer.category}</dd>
								<dt>How it's used</dt>
								<dd>{explainer.howItsUsed}</dd>
								<dt>Last reviewed</dt>
								<dd>{explainer.lastReviewedLabel}</dd>
							</dl>
						</section>

						<section className="fwt-copy fwt-county-panel">
							<h2>What is {explainer.formCode}?</h2>
							<p>{explainer.summary}</p>
							{explainer.commonNames.length ? (
								<ul>
									{explainer.commonNames.map((name) => (
										<li key={name}>{name}</li>
									))}
								</ul>
							) : null}
						</section>

						<section className="fwt-copy fwt-county-panel">
							<h2>Important fields to understand</h2>
							<ul>
								{explainer.importantFields.map((field) => (
									<li key={field}>{field}</li>
								))}
							</ul>
						</section>

						{explainer.sections.map((section) => (
							<section className="fwt-copy fwt-county-panel" key={section.heading}>
								<h2>{section.heading}</h2>
								{section.body ? <p>{section.body}</p> : null}
								{section.bullets ? (
									<ul>
										{section.bullets.map((item) => (
											<li key={item}>{item}</li>
										))}
									</ul>
								) : null}
							</section>
						))}

						<section className="fwt-copy fwt-county-panel">
							<h2>What this record can prove</h2>
							<ul>
								{explainer.whatItProves.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</section>

						<section className="fwt-copy fwt-county-panel">
							<h2>What this record does not prove</h2>
							<ul>
								{explainer.whatItDoesNotProve.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</section>

						{relatedGuides.length ? (
							<section className="fwt-copy fwt-county-panel">
								<h2>Related Kansas guides</h2>
								<ul>
									{relatedGuides.map((guide) => (
										<li key={guide.slug}>
											<Link href={guide.href}>{guide.shortTitle}</Link>
										</li>
									))}
								</ul>
							</section>
						) : null}

						<section className="fwt-copy fwt-county-panel">
							<h2>How Future Wells Kansas uses or links this record</h2>
							<ul>
								{explainer.relatedFutureWellsRecords.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</section>

						<section className="fwt-copy fwt-county-panel">
							<h2>FAQ</h2>
							{explainer.faqs.map((faq) => (
								<div key={faq.question}>
									<h3>{faq.question}</h3>
									<p>{faq.answer}</p>
								</div>
							))}
						</section>

						<section className="fwt-record-inline-cta" aria-label="Continue in Future Wells Co">
							<div>
								<span className="fwt-eyebrow">Research workspace</span>
								<h2>Continue in Future Wells Co</h2>
								<p>Use this guide's context to search, save, and monitor Kansas records in the Future Wells Co workspace.</p>
							</div>
							<div className="fwt-record-inline-actions">
								<a className="fwt-btn gold" href={futureWellsCtaHref(ctaSource)}>
									Open Kansas in Future Wells Co
								</a>
							</div>
						</section>
					</main>

					<aside className="fwt-county-aside">
						<section className="fwt-copy fwt-county-panel">
							<span className="fwt-eyebrow">Official sources</span>
							<h2>{explainer.agency}</h2>
							<div className="fwt-activity-date-links">
								{explainer.officialSources.map((source) => (
									<a href={source.url} key={source.url} rel="nofollow noopener noreferrer">
										{source.label}
									</a>
								))}
							</div>
						</section>
						{relatedGuides.length ? (
							<section className="fwt-copy fwt-county-panel">
								<span className="fwt-eyebrow">Related guides</span>
								<h2>Kansas explainers</h2>
								<div className="fwt-activity-date-links">
									{relatedGuides.map((guide) => (
										<Link href={guide.href} key={guide.slug}>
											{guide.shortTitle}
										</Link>
									))}
								</div>
							</section>
						) : null}
						<section className="fwt-copy fwt-county-panel">
							<span className="fwt-eyebrow">Source note</span>
							<p>Guides are public-record research context, not filing instructions or legal advice. Always verify operational, legal, engineering, mineral, investment, and compliance decisions against official KCC and KGS source records.</p>
						</section>
					</aside>
				</div>
			</section>
		</MarketingLayout>
	)
}

function GuideDisclaimer() {
	return (
		<section className="fwt-copy fwt-county-panel">
			<span className="fwt-eyebrow">Plain-English context</span>
			<p>This guide explains public records and data fields. It is not legal, engineering, or regulatory filing advice. Current filing channels can differ from historical samples, so use current Kansas Corporation Commission and Kansas Geological Survey instructions for an actual submission.</p>
		</section>
	)
}
