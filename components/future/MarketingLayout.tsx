import Link from "next/link"
import { siteConfig } from "@/app/config"
import { SocialLinks } from "@/components/future/SocialLinks"
import { futureWellsCtaHref } from "@/config/userArea"

// Ported from coloradoMarketing/components/future/MarketingLayout.tsx for
// KS-18 — same header/nav/mobile-nav/footer/ProductCta/DisclaimerStrip
// structure, Kansas content and links only. The public Browse page is a
// lightweight entry-point page; entity search/map/detail workflows still
// live inside Future Wells Co — see docs/architecture/kansas-marketing-boundary.md.

export const platformDisclaimer =
	`${siteConfig.brandName} organizes public Kansas oil and gas source information from the ${siteConfig.officialAgencyName} (KCC) and the ${siteConfig.secondaryAgencyName} (KGS). Source records may be incomplete, delayed, corrected, duplicated, transformed, or interpreted incorrectly. This platform does not provide legal, financial, investment, mineral ownership, title, engineering, drilling, tax, regulatory, or operational advice.`

const footerDisclaimer =
	`${siteConfig.brandName} is an independent data organization project and is not an official government website. It is not affiliated with, endorsed by, or sponsored by the ${siteConfig.officialAgencyName} or the ${siteConfig.secondaryAgencyName}. Always verify critical records with official sources.`

export function MarketingLayout({ children }: { children: React.ReactNode }) {
	const copyrightYear = new Date().getFullYear()

	return (
		<div className="fwt-page">
			<nav className="fwt-nav">
				<div className="fwt-container fwt-nav-inner">
					<Link className="fwt-brand" href="/">
						<span className="fwt-mark">{siteConfig.stateCode}</span>
						<span>{siteConfig.brandName}</span>
					</Link>
					<div className="fwt-nav-desktop">
						<MarketingNavLinks />
						<MarketingNavActions />
					</div>
					<details className="fwt-mobile-nav">
						<summary aria-label="Open navigation">
							<span />
							<span />
							<span />
						</summary>
						<div className="fwt-mobile-nav-menu">
							<MarketingNavLinks />
							<MarketingNavActions />
						</div>
					</details>
				</div>
			</nav>
			{children}
			<ProductCta />
			<footer className="fwt-footer">
				<div className="fwt-container fwt-footer-grid">
					<div>
						<div className="fwt-brand">
							<span className="fwt-mark">{siteConfig.stateCode}</span>
							<span>{siteConfig.brandName}</span>
						</div>
						<p className="fwt-disclaimer fwt-footer-disclaimer">{footerDisclaimer}</p>
						<p className="fwt-copyright">
							Copyright {copyrightYear} {siteConfig.brandName}. All rights reserved.
						</p>
					</div>
					<div>
						<strong className="fwt-footer-heading">Data</strong>
						<Link href="/browse">Browse Kansas</Link>
						<Link href="/data">Kansas Data Sources</Link>
						<Link href="/data-coverage">Data Coverage</Link>
						<Link href={siteConfig.activityPath}>Activity</Link>
						<Link href="/guides">Kansas Oil &amp; Gas Guides</Link>
						<Link href="/methodology">Methodology</Link>
					</div>
					<div>
						<strong className="fwt-footer-heading">Resources</strong>
						<Link href="/disclaimer">Disclaimer</Link>
						<Link href="/privacy">Privacy</Link>
						<Link href="/terms">Terms</Link>
						<a href={futureWellsCtaHref("footer_user_area")}>User Area</a>
						<Link href="/contact">Contact</Link>
					</div>
					<div>
						<strong className="fwt-footer-heading">Company</strong>
						<a href="mailto:info@futurewells.co">info@futurewells.co</a>
						<SocialLinks />
						<p className="fwt-footer-detail">{siteConfig.companyName}</p>
						<p className="fwt-footer-detail">
							30 N Gould St Ste N
							<br />
							Sheridan, WY 82801
						</p>
					</div>
				</div>
			</footer>
		</div>
	)
}

function MarketingNavLinks() {
	return (
		<div className="fwt-nav-links">
			<Link href="/browse">Browse</Link>
			<Link href="/data">Data</Link>
			<Link href={siteConfig.activityPath}>Activity</Link>
			<Link href="/guides">Guides</Link>
			<Link href="/methodology">Methodology</Link>
		</div>
	)
}

function MarketingNavActions() {
	return (
		<div className="fwt-nav-actions">
			<a className="fwt-btn gold" href={futureWellsCtaHref("nav_cta")}>
				Open Kansas in Future Wells Co
			</a>
		</div>
	)
}

export function ProductCta() {
	return (
		<section className="fwt-section fwt-product-cta">
			<div className="fwt-container fwt-product-cta-inner">
				<div>
					<span className="fwt-eyebrow">Product access</span>
					<h2>Explore Kansas well activity in the Future Wells Co user area.</h2>
					<p>Create an account on Future Wells Co to use the product workspace for interactive search, maps, saved watch areas, monitoring, and deeper record workflows for Kansas.</p>
				</div>
				<a className="fwt-btn gold" href={futureWellsCtaHref("product_cta_band")}>
					Open Kansas in Future Wells Co
				</a>
			</div>
		</section>
	)
}

export function DisclaimerStrip() {
	return (
		<section className="fwt-section gold-strip">
			<div className="fwt-container">
				<p className="fwt-disclaimer">{platformDisclaimer}</p>
			</div>
		</section>
	)
}
