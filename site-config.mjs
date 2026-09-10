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
	activityPath: "/activity",
}

// This site is a regional SEO/lead-gen content site, not a full data-product
// application. It may expose lightweight Browse and entity landing-card
// pages, but public search, maps, saved workflows, and paginated product
// directories live in the shared futurewells.co/user-area. Every flag below
// stays false as an explicit off-switch for those deeper workflows.
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
