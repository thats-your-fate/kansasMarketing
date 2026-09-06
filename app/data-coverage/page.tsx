import type { Metadata } from "next"
import { Fragment } from "react"
import { MarketingLayout } from "@/components/future/MarketingLayout"
import { siteConfig } from "@/app/config"
import { seoMetadata } from "@/app/seo"
import { BreadcrumbJsonLd } from "@/app/structured-data"

export const metadata: Metadata = seoMetadata({
	title: `Kansas Data Coverage | ${siteConfig.brandName}`,
	description: "Which Kansas KCC and KGS sources Future Wells Kansas monitors, and how often each is intended to refresh.",
	path: "/data-coverage",
})

// This is the "simplified public coverage page" the kansasBackend KS-17
// task's own handoff doc (docs/ops/ks-17-monitoring-handoff.md) left as a
// deferred cross-repo item, built here. It is deliberately editorial and
// static, not a live query against a backend endpoint: publishing a
// "last refreshed N hours ago" figure would need a public monitoring API
// that does not exist yet, and the internal QA detail behind that endpoint
// (row counts, schema fingerprints, link-confidence breakdowns) is
// intentionally not public-facing. The cadence values below are the real
// per-source `expected_cadence` values kansasBackend tracks internally,
// not invented for this page.

type CoverageRow = { source: string; agency: "KCC" | "KGS"; cadence: string }

const coverage: CoverageRow[] = [
	{ source: "Statewide well master", agency: "KGS", cadence: "Nightly" },
	{ source: "Field data and field geometry", agency: "KGS", cadence: "As KGS publishes updates" },
	{ source: "Lease dimension data", agency: "KGS", cadence: "Monthly" },
	{ source: "Monthly oil production", agency: "KGS", cadence: "Monthly" },
	{ source: "Monthly gas production", agency: "KGS", cadence: "Monthly" },
	{ source: "Well-document metadata", agency: "KGS", cadence: "As KGS publishes updates" },
	{ source: "Operator licenses", agency: "KCC", cadence: "Continuously" },
	{ source: "Drilling intents (rolling 365-day window)", agency: "KCC", cadence: "Daily" },
	{ source: "Approved transfers (rolling 90-day window)", agency: "KCC", cadence: "Daily" },
	{ source: "Conservation dockets", agency: "KCC", cadence: "Daily" },
]

export default function DataCoveragePage() {
	return (
		<MarketingLayout>
			<BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Data Coverage", path: "/data-coverage" }]} />
			<section className="nm-section">
				<div className="nm-container">
					<span className="nm-eyebrow">Data coverage</span>
					<h1>What Future Wells Kansas monitors, and how often</h1>
					<p>
						{siteConfig.brandName} monitors these {siteConfig.officialAgencyName} (KCC) and {siteConfig.secondaryAgencyName}{" "}
						(KGS) sources at the target cadence below. These are refresh targets, not a guarantee that every source has
						been refreshed within that window — see <a href="/methodology">methodology</a> for how coverage limits are
						handled.
					</p>
				</div>
			</section>
			<section className="nm-section">
				<div className="nm-container fwt-copy">
					<h2>Source coverage and target cadence</h2>
					<dl className="nm-meta-list">
						{coverage.map((row) => (
							<Fragment key={row.source}>
								<dt>{row.source}</dt>
								<dd>
									{row.agency} &middot; {row.cadence}
								</dd>
							</Fragment>
						))}
					</dl>
				</div>
			</section>
		</MarketingLayout>
	)
}
