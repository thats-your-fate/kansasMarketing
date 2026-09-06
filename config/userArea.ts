import { siteConfig } from "@/app/config"

// The account-registration product this site's CTAs point into. Unlike
// coloradoMarketing's identical constant (no query params at all), every
// Kansas link built with `futureWellsCtaHref` always carries `state=KS` —
// KS-18's acceptance criteria requires every product CTA to open Future
// Wells Co with Kansas already selected, which nothing in the shared
// pattern did before this.
export const futureWellsUserAreaRegisterUrl = "https://futurewells.co/user-area/register"

/**
 * Build a Future Wells Co registration link that always selects Kansas and
 * tags where the click came from, so account-side attribution can tell a
 * homepage click from a guide-article click. `source` is a short slug
 * (e.g. "nav_cta", "guide:kcc-file-number-explainer", "homepage_hero").
 */
export function futureWellsCtaHref(source: string): string {
	const url = new URL(futureWellsUserAreaRegisterUrl)
	url.searchParams.set("state", siteConfig.stateCode)
	url.searchParams.set("source", source)
	return url.toString()
}
