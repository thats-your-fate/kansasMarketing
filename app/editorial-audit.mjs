const GUIDE_QUESTIONS = {
	"kcc-and-kgs-explainer": "Which Kansas agency publishes this oil and gas record?",
	"api-number-and-kgs-kid-explainer": "How do I identify the same Kansas well across API numbers and KGS KIDs?",
	"c1-notice-of-intent-explainer": "Does a Kansas C-1 notice mean a well has actually been drilled?",
	"aco1-completion-form-explainer": "What does a Kansas ACO-1 completion form prove about a well?",
	"t1-operator-transfer-explainer": "Does a Kansas T-1 transfer show who drilled or owns a well?",
	"cp1-cp4-plugging-explainer": "Does a Kansas plugging filing prove a well was plugged?",
	"lease-vs-well-production-explainer": "Can Kansas lease production be treated as individual well production?",
	"well-status-explainer": "How should I read a Kansas well status label?",
	"plss-location-explainer": "How do I read a Kansas township-range-section location?",
	"horizontal-well-records-explainer": "Does a Kansas horizontal-well flag mean a mapped lateral exists?",
	"production-freshness-and-revisions-explainer": "Why can Kansas production values change after a month is already reported?",
	"data-limitations-and-verification-explainer": "How should I verify a Kansas oil and gas record before relying on it?",
}

export const STATIC_EDITORIAL_URLS = [
	"/",
	"/activity",
	"/browse",
	"/guides",
	"/data",
	"/data-coverage",
	"/methodology",
	"/contact",
	"/future-wells-sites",
	"/disclaimer",
	"/privacy",
	"/terms",
]

export function guideQuestion(slug) {
	return GUIDE_QUESTIONS[slug] || "What does this Kansas public record mean?"
}

export function editorialAuditRows(guides = []) {
	return [
		...STATIC_EDITORIAL_URLS.map((path) => ({
			path,
			type: "static",
			status: "reviewed",
		})),
		...guides.map((guide) => ({
			path: guide.href,
			type: "guide",
			status: "reviewed",
			question: guideQuestion(guide.slug),
		})),
	]
}
