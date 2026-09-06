export const siteConfig = {
	brandName: "Future Wells Kansas",
	companyName: "Future Wells Holdings LLC",
	stateCode: "KS",
	stateName: "Kansas",
	stateSlug: "kansas",
	defaultLocale: "en-US",
	defaultSiteUrl: "https://futurewellskansas.com",
	// KCC is the regulatory authority (operators, drilling intents, transfers,
	// dockets); KGS is the separate, statewide well/production data steward.
	// Both are legally distinct data owners — credit each explicitly rather
	// than inventing one combined "official agency" label.
	officialAgencyName: "Kansas Corporation Commission",
	secondaryAgencyName: "Kansas Geological Survey",
}

// This site is a regional SEO/lead-gen content site, not a data-product
// application (task plan §10, recorded 2026-09-05) — it never builds public
// well search, a map, or browse-first directories; that experience lives
// only in the shared futurewells.co/user-area. Every flag below stays false
// as an explicit off-switch, not a TODO — flipping one back on means
// revisiting task plan §10 first, not just building the page.
export const features = {
	documents: false,
	events: false,
	wellOverview: false,
	production: false,
	maps: false,
	geometry: false,
	landGrid: false,
	operators: false,
	counties: false,
}
