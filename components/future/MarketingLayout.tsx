import { siteConfig } from "@/app/config"
import { SocialLinks } from "@/components/future/SocialLinks"
import { futureWellsCtaHref } from "@/config/userArea"

/* eslint-disable @next/next/no-html-link-for-pages */

// Ported from coloradoMarketing/components/future/MarketingLayout.tsx for
// KS-18 — same header/nav/mobile-nav/footer/ProductCta/DisclaimerStrip
// structure, Kansas content and links only. The public Browse page is a
// lightweight entry-point page; entity search/map/detail workflows still
// live inside Future Wells Co — see docs/architecture/kansas-marketing-boundary.md.

export const platformDisclaimer =
	`${siteConfig.brandName} organizes public Kansas oil and gas source information from the ${siteConfig.officialAgencyName} (KCC) and the ${siteConfig.secondaryAgencyName} (KGS). Source records may be incomplete, delayed, corrected, duplicated, transformed, or interpreted incorrectly. This platform does not provide legal, financial, investment, mineral ownership, title, engineering, drilling, tax, regulatory, or operational advice.`

const footerDisclaimer =
	`${siteConfig.brandName} is an independent data organization project and is not an official government website. It is not affiliated with, endorsed by, or sponsored by the ${siteConfig.officialAgencyName} or the ${siteConfig.secondaryAgencyName}. Always verify critical records with official sources.`

export function MarketingLayout({ children, pageClassName }: { children: React.ReactNode; pageClassName?: string }) {
	const copyrightYear = new Date().getFullYear()

	return (
		<div className={pageClassName ? `fwt-page ${pageClassName}` : "fwt-page"}>
			<nav className="fwt-nav">
				<div className="fwt-container fwt-nav-inner">
					<a className="fwt-brand" href="/">
						<span className="fwt-mark">{siteConfig.stateCode}</span>
						<span>{siteConfig.brandName}</span>
					</a>
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
						<a href="/browse">Browse Kansas</a>
						<a href="/map">Kansas Well Map</a>
						<a href="/data">Kansas Data Sources</a>
						<a href="/data-coverage">Data Coverage</a>
						<a href={siteConfig.activityPath}>Activity</a>
						<a href="/guides">Kansas Oil &amp; Gas Guides</a>
						<a href="/methodology">Methodology</a>
					</div>
					<div>
						<strong className="fwt-footer-heading">Resources</strong>
						<a href="/disclaimer">Disclaimer</a>
						<a href="/privacy">Privacy</a>
						<a href="/terms">Terms</a>
						<a href="/future-wells-sites">Future Wells Sites</a>
						<a href={futureWellsCtaHref("footer_user_area")}>User Area</a>
						<a href="/contact">Contact</a>
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
			<a href="/browse">Browse</a>
			<a href="/map">Map</a>
			<a href="/data">Data</a>
			<a href={siteConfig.activityPath}>Activity</a>
			<a href="/guides">Guides</a>
			<a href="/methodology">Methodology</a>
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
