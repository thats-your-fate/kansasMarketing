// KS-19: Kansas source and document explainers, using the same schema
// shape as coloradoMarketing's app/lib/explainers.ts (type + builder
// factory + a flat array of entries), simplified to drop the document
// auto-matching machinery Colorado's version also carries (regex/alias
// rules for linking an imported document to a guide) — nothing in this
// repo indexes documents against these guides yet, so that layer would be
// dead code here.
//
// Content below reflects Kansas's real, two-agency source split (KCC
// regulates operators/drilling/transfers/plugging; KGS maintains the
// statewide well/lease/production record) and facts already verified
// against live KGS data and KCC's documented forms in kansasBackend this
// session (API number structure, KID identity, lease-level production,
// well status derivation, the horizontal/directional status caveat) —
// not Colorado's ECMC/DMR text with names swapped.

export type OfficialSource = {
	label: string
	url: string
}

export type ExplainerSection = {
	heading: string
	body?: string
	bullets?: string[]
}

export type ExplainerFaq = {
	question: string
	answer: string
}

export type ExplainerContent = {
	slug: string
	label: string
	href: string
	state: "KS"
	stateName: "Kansas"
	stateSlug: "kansas"
	agency: string
	title: string
	shortTitle: string
	formCode: string
	officialName: string
	commonNames: string[]
	category: string
	lifecycleStage: string
	summary: string
	howItsUsed: string
	lastReviewed: string
	lastReviewedLabel: string
	keyFields: string[]
	importantFields: string[]
	commonAttachments: string[]
	whatItProves: string[]
	whatItDoesNotProve: string[]
	relatedFutureWellsRecords: string[]
	officialSources: OfficialSource[]
	relatedGuideSlugs: string[]
	metaTitle: string
	metaDescription: string
	published: boolean
	sections: ExplainerSection[]
	faqs: ExplainerFaq[]
}

type KansasExplainerInput = {
	slug: string
	title: string
	shortTitle: string
	formCode: string
	officialName?: string
	commonNames?: string[]
	agency: string
	category: string
	lifecycleStage?: string
	summary: string
	howItsUsed: string
	lastReviewed: string
	keyFields: string[]
	importantFields?: string[]
	commonAttachments?: string[]
	whatItProves: string[]
	whatItDoesNotProve: string[]
	relatedFutureWellsRecords?: string[]
	officialSources: OfficialSource[]
	relatedGuideSlugs: string[]
	metaTitle: string
	metaDescription: string
	sections: ExplainerSection[]
	faqs?: ExplainerFaq[]
}

const guidePath = (slug: string) => `/guides/${slug}`

const kcc = "Kansas Corporation Commission"
const kgs = "Kansas Geological Survey"
const bothAgencies = `${kcc} and ${kgs}`

const kccFormsUrl = "https://www.kcc.ks.gov/oil-gas/oil-gas-forms"
const kccDataSearchUrl = "https://www.kcc.ks.gov/oil-gas/data-search"
const kccIntentsUrl = "https://www.kcc.ks.gov/notices-of-intents-search"
const kccTransfersUrl = "https://www.kcc.ks.gov/notices-of-transfers-approved-search"
const kgsWellCatalogUrl = "https://www.kgs.ku.edu/PRS/petroDB.html"
const kgsWellFormatUrl = "https://www.kgs.ku.edu/PRS/file_format.html"
const kgsLeaseCatalogUrl = "https://www.kgs.ku.edu/Magellan/Field/lease.html"
const kgsLeaseFormatUrl = "https://www.kgs.ku.edu/Magellan/Field/lease_file_format.html"
const kgsHorizontalWellsUrl = "https://chasm.kgs.ku.edu/ords/qualified.ogw5.HorizWells"

function lastReviewedLabel(value: string) {
	const [year, month] = value.split("-")
	const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
	const monthIndex = Number(month) - 1
	return monthNames[monthIndex] ? `${monthNames[monthIndex]} ${year}` : value
}

function buildKansasExplainer(input: KansasExplainerInput): ExplainerContent {
	return {
		slug: input.slug,
		label: input.shortTitle,
		href: guidePath(input.slug),
		state: "KS",
		stateName: "Kansas",
		stateSlug: "kansas",
		agency: input.agency,
		title: input.title,
		shortTitle: input.shortTitle,
		formCode: input.formCode,
		officialName: input.officialName || input.shortTitle,
		commonNames: input.commonNames || [],
		category: input.category,
		lifecycleStage: input.lifecycleStage || input.category,
		summary: input.summary,
		howItsUsed: input.howItsUsed,
		lastReviewed: input.lastReviewed,
		lastReviewedLabel: lastReviewedLabel(input.lastReviewed),
		keyFields: input.keyFields,
		importantFields: input.importantFields?.length ? input.importantFields : input.keyFields,
		commonAttachments: input.commonAttachments?.length
			? input.commonAttachments
			: ["Public source record only — this guide does not assume attachments beyond what the official KCC or KGS page publishes."],
		whatItProves: input.whatItProves,
		whatItDoesNotProve: input.whatItDoesNotProve,
		relatedFutureWellsRecords: input.relatedFutureWellsRecords?.length
			? input.relatedFutureWellsRecords
			: [
				"Kansas activity signals (see the Kansas activity guide) when this record type generates an event.",
				"Interactive search, maps, and saved watch areas inside Future Wells Co, once you know what to look for from this guide.",
			],
		officialSources: input.officialSources,
		relatedGuideSlugs: input.relatedGuideSlugs,
		metaTitle: input.metaTitle,
		metaDescription: input.metaDescription,
		published: true,
		sections: input.sections,
		faqs: input.faqs?.length
			? input.faqs
			: [
				{
					question: `Is this guide a current filing instruction for ${input.formCode}?`,
					answer: `No. This is public-record research context. Use current ${input.agency} instructions before preparing or relying on an actual filing.`,
				},
				{
					question: "Does Future Wells Kansas replace the official source record?",
					answer: `No. Future Wells Kansas organizes public Kansas source data and links related records where available, but the official ${input.agency} record remains the source of truth.`,
				},
			],
	}
}

const explainers: ExplainerContent[] = [
	buildKansasExplainer({
		slug: "kcc-and-kgs-explainer",
		title: "Kansas KCC and KGS: Which Agency Publishes What?",
		shortTitle: "KCC and KGS Roles",
		formCode: "Agency roles",
		agency: bothAgencies,
		category: "Agencies and systems",
		summary: "Kansas oil and gas records are split across two legally separate agencies with different jobs: the Kansas Corporation Commission (KCC) regulates operators and drilling activity, while the Kansas Geological Survey (KGS) maintains the statewide well, lease, and production record. There is no single combined \"Kansas oil and gas database.\"",
		howItsUsed: "Referenced whenever a record's source agency needs to be identified correctly.",
		lastReviewed: "2026-09",
		keyFields: ["Agency name", "Record or form type", "Publishing system or search page", "Whether the record is regulatory or geological/production data"],
		whatItProves: [
			"Which agency is the authoritative source for a specific Kansas record type.",
			"KCC and KGS are separate systems that can be updated on different schedules and may not always agree with each other at a given moment.",
		],
		whatItDoesNotProve: [
			"It does not mean KCC and KGS share one combined database — a record confirmed at one agency is not automatically confirmed at the other.",
			"It does not mean every Kansas oil and gas record type has a public digital source at all; some conservation-related filings are limited or newly digitized.",
		],
		officialSources: [
			{ label: "KCC oil and gas forms", url: kccFormsUrl },
			{ label: "KCC oil and gas data search", url: kccDataSearchUrl },
			{ label: "KGS oil and gas database", url: kgsWellCatalogUrl },
		],
		relatedGuideSlugs: ["api-number-and-kgs-kid-explainer", "data-limitations-and-verification-explainer"],
		metaTitle: "Kansas KCC and KGS: Which Agency Publishes What? | Future Wells Kansas",
		metaDescription: "Plain-English guide to the difference between the Kansas Corporation Commission (KCC) and the Kansas Geological Survey (KGS), and which agency publishes which oil and gas record.",
		sections: [
			{
				heading: "What KCC publishes",
				body: "The Kansas Corporation Commission regulates oil and gas operators and drilling activity. It publishes operator license status, Notices of Intent to Drill (C-1), Notices of Transfer of Ownership (T-1), plugging applications and reports (CP-1/CP-4), and conservation docket filings.",
			},
			{
				heading: "What KGS publishes",
				body: "The Kansas Geological Survey is a research and data-stewardship agency, not a regulator. It maintains the statewide well master (API numbers, KGS KIDs, location, lifecycle status), the lease dimension and monthly lease production archives, well-document metadata (including ACO-1 completion forms), field data, and a horizontal-wells query.",
			},
			{
				heading: "Why the split matters",
				bullets: [
					"A well can have a current KCC operator on file and a separate, independently maintained KGS well status — checking one does not confirm the other.",
					"Treating \"the Kansas oil and gas database\" as one system is a common misinterpretation; it is really two separately run systems with different update cadences.",
					"KCC's forms are regulatory filings tied to a specific event (drilling, transfer, plugging). KGS's records are a standing geological and production dataset, not event filings.",
				],
			},
			{
				heading: "How Future Wells Kansas uses it",
				body: "Every Future Wells Kansas guide and coverage note credits the specific agency that publishes the record being discussed, rather than an invented combined \"official agency\" label.",
			},
		],
	}),
	buildKansasExplainer({
		slug: "api-number-and-kgs-kid-explainer",
		title: "How Kansas API Numbers and KGS KIDs Work",
		shortTitle: "API Numbers and KGS KIDs",
		formCode: "API number / KID",
		agency: kgs,
		category: "Systems and identifiers",
		summary: "The API number is the standardized, 14-digit national well identifier (Kansas's state code is 15). The KGS KID is a separate, KGS-internal well identifier used as a fallback when an API number is missing or malformed. The two identifiers are related but not interchangeable.",
		howItsUsed: "The join key Future Wells Kansas uses to connect a well's record across KGS well, lease, and document data.",
		lastReviewed: "2026-09",
		keyFields: ["14-digit API number (state-county-well sequence-sidetrack/completion suffix)", "10-digit short-form API number", "KGS KID", "County code"],
		whatItProves: [
			"A valid, correctly formatted API number identifies a specific well under the national standard, with 15 as Kansas's state prefix.",
			"A KGS KID identifies a well within KGS's own internal system, including wells whose API number is missing or malformed in the source record.",
		],
		whatItDoesNotProve: [
			"A KGS KID is not guaranteed to be permanent — KGS's own documentation does not treat it as a stable, unchanging identifier the way the API number standard is intended to be.",
			"A short-form (10-digit) API number is not a different well from its full 14-digit form; it is the same identifier missing its sidetrack/completion suffix and should be zero-padded, not treated as invalid.",
		],
		officialSources: [{ label: "KGS well data file format reference", url: kgsWellFormatUrl }, { label: "KGS oil and gas database", url: kgsWellCatalogUrl }],
		relatedGuideSlugs: ["plss-location-explainer", "well-status-explainer"],
		metaTitle: "How Kansas API Numbers and KGS KIDs Work | Future Wells Kansas",
		metaDescription: "Plain-English guide to Kansas API well numbers and KGS KIDs: what each identifier means, how they differ, and common formatting mistakes.",
		sections: [
			{
				heading: "Reading an API number",
				body: "A full API number is 14 digits: a 2-digit state code (15 for Kansas), a 3-digit county code, a 5-digit well sequence number, and a 4-digit sidetrack/completion suffix (usually 0000 for an original wellbore).",
			},
			{
				heading: "Short-form vs. full API numbers",
				body: "Older or historical Kansas records sometimes report only a 10-digit API number, omitting the sidetrack/completion suffix. Future Wells Kansas treats this as the same well identity, zero-padded to 14 digits, rather than a separate or invalid identifier.",
			},
			{
				heading: "Why the KGS KID exists as a fallback",
				body: "When a source record has no valid API number at all (missing, or malformed with letters or the wrong digit count), Future Wells Kansas uses the KGS KID as the well's identity instead, so the record is still tracked rather than silently dropped.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Dropping leading zeros from an API or county code when copying it between systems.",
					"Treating a KGS KID as a permanent, unchanging well identifier.",
					"Assuming a well with a missing or malformed API number is not a real well, rather than a real well tracked by KID instead.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "c1-notice-of-intent-explainer",
		title: "How to Read a Kansas C-1 Notice of Intent to Drill",
		shortTitle: "C-1 Notice of Intent to Drill",
		formCode: "C-1",
		officialName: "Notice of Intent to Drill",
		agency: kcc,
		category: "Drilling and permitting",
		lifecycleStage: "Pre-drilling",
		summary: "The C-1 is the Kansas Corporation Commission's Notice of Intent to Drill, filed by an operator before drilling a new well. It is a real, useful early signal of possible future well activity — it does not guarantee that drilling actually happens.",
		howItsUsed: "Generates a Future Wells Kansas \"drilling intent posted\" activity signal when a new C-1 filing is observed.",
		lastReviewed: "2026-09",
		keyFields: ["Operator", "Lease name", "Legal location (section-township-range)", "County", "Proposed total depth", "Target formation", "Filing date"],
		whatItProves: [
			"An operator has notified the KCC of intent to drill a well at a specific legal location.",
			"The county, proposed formation, and proposed depth the operator reported at filing time.",
		],
		whatItDoesNotProve: [
			"It does not prove the well was actually drilled — an intent can be filed and never followed by a spud.",
			"It does not prove the well's final depth or completed formation will match what was proposed.",
			"It does not, by itself, prove anything about the well's eventual production.",
		],
		officialSources: [{ label: "KCC notices of intent search", url: kccIntentsUrl }, { label: "KCC oil and gas forms", url: kccFormsUrl }],
		relatedGuideSlugs: ["kcc-and-kgs-explainer", "well-status-explainer"],
		metaTitle: "How to Read a Kansas C-1 Notice of Intent to Drill | Future Wells Kansas",
		metaDescription: "Plain-English guide to the Kansas KCC C-1 Notice of Intent to Drill: what it records, what it signals, and what it does not prove.",
		sections: [
			{
				heading: "What triggers a C-1 filing",
				body: "An operator files a C-1 with the KCC before drilling a new well, notifying the agency of the planned location, target formation, and proposed depth.",
			},
			{
				heading: "Reading the legal location",
				body: "The legal location on a C-1 uses the Public Land Survey System (section, township, range) rather than a street address — see the Kansas PLSS guide for how to read it.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Assuming every posted intent results in a drilled well.",
					"Treating the proposed depth or target formation as the final, as-drilled result.",
					"Confusing an intent's filing date with a spud date.",
				],
			},
			{
				heading: "How Future Wells Kansas tracks it",
				body: "KCC's intent search reflects a rolling window. Future Wells Kansas treats an intent that drops out of that window with no matching spud on the well as expired, rather than assuming it silently became a well.",
			},
		],
	}),
	buildKansasExplainer({
		slug: "aco1-completion-form-explainer",
		title: "How to Read a Kansas ACO-1 Well Completion Form",
		shortTitle: "ACO-1 Completion Form",
		formCode: "ACO-1",
		officialName: "Well Completion Form",
		agency: kgs,
		category: "Drilling and permitting",
		lifecycleStage: "Completion",
		summary: "The ACO-1 records how a Kansas well was completed after drilling: total depth, the producing formation, initial test data, and casing/cementing details. It is indexed by KGS as part of a well's document history.",
		howItsUsed: "Source for a Future Wells Kansas \"completion recorded\" activity signal and part of the well-document metadata index.",
		lastReviewed: "2026-09",
		keyFields: ["Completion date", "Total depth", "Producing formation", "Initial production test results", "Casing and cementing record"],
		whatItProves: ["A well was drilled to a reported total depth and completed in a specific formation.", "The operator's reported initial test results at the time of completion."],
		whatItDoesNotProve: [
			"Initial test rates are not the same as ongoing or current production — see the lease production guide for how Kansas production is actually reported.",
			"An ACO-1 filing does not, by itself, establish a well's current lifecycle status.",
			"The presence of an ACO-1 does not mean the well has directional-survey documentation, or that it is horizontal — see the horizontal-well-records guide.",
		],
		officialSources: [{ label: "KCC oil and gas forms", url: kccFormsUrl }, { label: "KGS oil and gas database", url: kgsWellCatalogUrl }],
		relatedGuideSlugs: ["horizontal-well-records-explainer", "well-status-explainer"],
		metaTitle: "How to Read a Kansas ACO-1 Well Completion Form | Future Wells Kansas",
		metaDescription: "Plain-English guide to the Kansas ACO-1 Well Completion Form: what fields it records and what it does and does not prove about a well.",
		sections: [
			{
				heading: "What the ACO-1 records",
				body: "Filed after a well is completed, the ACO-1 reports the well's total depth, the formation it was completed in, initial production test data, and casing/cementing details.",
			},
			{
				heading: "Initial test data versus ongoing production",
				body: "The initial test figures on an ACO-1 are a single point-in-time measurement at completion. They are not the same as the lease-level monthly production KGS reports afterward, and should not be treated as a current production rate.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Treating an initial test rate as the well's ongoing output.",
					"Assuming every well with an ACO-1 on file has a horizontal or directional wellbore.",
					"Assuming a completion record means the well is still actively producing today.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "t1-operator-transfer-explainer",
		title: "How T-1 Operator Transfers Work",
		shortTitle: "T-1 Operator Transfers",
		formCode: "T-1",
		officialName: "Notice of Transfer of Ownership",
		agency: kcc,
		category: "Operators and transfers",
		summary: "The T-1 is the Kansas Corporation Commission's Notice of Transfer of Ownership, filed when operating responsibility for one or more wells moves from one KCC-licensed operator to another.",
		howItsUsed: "Generates a Future Wells Kansas \"operator transfer approved\" activity signal and links to every well the transfer names when source records support it.",
		lastReviewed: "2026-09",
		keyFields: ["Transferring (prior) operator", "Receiving (new) operator", "Wells or leases named on the transfer", "Approval date"],
		whatItProves: ["A change in operating responsibility for the named wells was filed with and approved by the KCC."],
		whatItDoesNotProve: [
			"It does not establish mineral ownership, lease terms, or royalty interests.",
			"A well's \"current operator\" reflects its most recent approved transfer, which is not necessarily the operator that drilled or completed the well — historical operator history should be preserved, not overwritten.",
			"A single transfer filing can name multiple wells; it does not mean those wells share any other relationship beyond being part of the same transfer.",
		],
		officialSources: [{ label: "KCC notices of transfers approved search", url: kccTransfersUrl }],
		relatedGuideSlugs: ["kcc-and-kgs-explainer", "data-limitations-and-verification-explainer"],
		metaTitle: "How Kansas T-1 Operator Transfers Work | Future Wells Kansas",
		metaDescription: "Plain-English guide to the Kansas KCC T-1 Notice of Transfer of Ownership: what it records and what it does not prove about well history.",
		sections: [
			{
				heading: "What a T-1 filing changes",
				body: "A T-1 filing moves KCC-recorded operating responsibility for one or more wells from one licensed operator to another once approved.",
			},
			{
				heading: "Current operator versus historical operator",
				body: "Future Wells Kansas preserves the operator that drilled or completed a well as historical context, separate from the current operator shown after a later transfer — the two should never overwrite each other.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Assuming the current operator on file drilled the well.",
					"Treating a multi-well transfer as evidence those wells are otherwise related (same lease, same field, or same operator history beyond the transfer itself).",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "cp1-cp4-plugging-explainer",
		title: "How CP-1 and CP-4 Plugging Records Work",
		shortTitle: "CP-1 and CP-4 Plugging Records",
		formCode: "CP-1 / CP-4",
		officialName: "Plugging Application and Plugging Record",
		agency: kcc,
		category: "Plugging and abandonment",
		lifecycleStage: "Plugging",
		summary: "The CP-1 is the application to plug a well; the CP-4 is the report filed after plugging work is actually completed. The two are different stages of the same process, not the same record.",
		howItsUsed: "Source for a Future Wells Kansas \"plugging recorded\" activity signal.",
		lastReviewed: "2026-09",
		keyFields: ["Well identity (API or KID)", "Plugging method", "Plugging date", "Filing type (application vs. completed record)"],
		whatItProves: ["A plugging application was filed (CP-1), or plugging work was completed and reported (CP-4)."],
		whatItDoesNotProve: [
			"A CP-1 alone does not prove the well was actually plugged — it is an application, not a completion record.",
			"The absence of a matched CP-4 does not necessarily mean a well remains active; plugging may have occurred without a digitally matched record.",
		],
		officialSources: [{ label: "KCC oil and gas forms", url: kccFormsUrl }],
		relatedGuideSlugs: ["well-status-explainer"],
		metaTitle: "How Kansas CP-1 and CP-4 Plugging Records Work | Future Wells Kansas",
		metaDescription: "Plain-English guide to Kansas CP-1 plugging applications and CP-4 plugging records: the difference between the two and what each does and does not prove.",
		sections: [
			{
				heading: "CP-1: the plugging application",
				body: "Filed by an operator proposing to plug a well, describing the intended plugging method before the work happens.",
			},
			{
				heading: "CP-4: the plugging record",
				body: "Filed after the plugging work is actually performed, documenting what was done. A CP-1 without a matching CP-4 should not be read as proof the well was plugged.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Treating a filed CP-1 as confirmation that plugging happened.",
					"Assuming a well with no plugging record on file is still active, when the record may simply be missing or not yet digitized.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "lease-vs-well-production-explainer",
		title: "How Kansas Lease Production Differs From Well Production",
		shortTitle: "Lease vs. Well Production",
		formCode: "Lease production",
		agency: kgs,
		category: "Production",
		summary: "The Kansas Geological Survey reports monthly oil and gas production at the lease level, not per individual well. A lease can include more than one well, so a lease's total volume cannot be divided evenly among the wells on it.",
		howItsUsed: "The basis for Future Wells Kansas's \"first lease production reported\" and \"lease production updated\" activity signals.",
		lastReviewed: "2026-09",
		keyFields: ["Lease KID", "DOR code", "Product (oil or gas)", "Month-year", "Reported volume", "Number of wells on the lease"],
		whatItProves: ["The total oil or gas volume KGS attributes to a specific lease for a given month."],
		whatItDoesNotProve: [
			"It does not show which specific well within a multi-well lease produced how much.",
			"Some rows in the source archive are sentinel values (a yearly total, or a starting cumulative figure) rather than a real monthly volume, and must never be charted as a monthly figure.",
		],
		officialSources: [{ label: "KGS lease production file format reference", url: kgsLeaseFormatUrl }, { label: "KGS lease and production catalog", url: kgsLeaseCatalogUrl }],
		relatedGuideSlugs: ["production-freshness-and-revisions-explainer", "api-number-and-kgs-kid-explainer"],
		metaTitle: "How Kansas Lease Production Differs From Well Production | Future Wells Kansas",
		metaDescription: "Plain-English guide to why Kansas oil and gas production is reported by lease, not by individual well, and how to read sentinel rows correctly.",
		sections: [
			{
				heading: "Why lease-level, not well-level",
				body: "KGS's production archive has always reported by lease. A lease groups one or more wells under a shared identifier, and the reported monthly volume is the lease's combined total.",
			},
			{
				heading: "Reading sentinel rows",
				body: "The source archive includes special rows beyond ordinary monthly production: a yearly-total row and a starting-cumulative row. Future Wells Kansas classifies these separately from monthly rows and never presents them on a monthly production chart.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Dividing a lease's total production evenly across every well on the lease.",
					"Charting a yearly-total or starting-cumulative sentinel row as if it were an ordinary month's production.",
					"Assuming a lease with zero wells reporting individually has zero production — production is real and reported at the lease level regardless.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "well-status-explainer",
		title: "How Kansas Oil and Gas Well Statuses Work",
		shortTitle: "Kansas Well Statuses",
		formCode: "Well status",
		agency: kgs,
		category: "Well lifecycle",
		summary: "KGS's well lifecycle status is derived from a combination of raw fields (well class, status, and a secondary status field), and some combinations are genuinely ambiguous. Future Wells Kansas surfaces an unmapped combination as \"unknown\" rather than guessing.",
		howItsUsed: "Drives the \"well status changed\" activity signal and every well-lifecycle label Future Wells Kansas displays.",
		lastReviewed: "2026-09",
		keyFields: ["Well class", "Status", "Secondary status field", "Spud date", "Completion date"],
		whatItProves: ["KGS's own reported classification as of its last published snapshot."],
		whatItDoesNotProve: [
			"It does not prove a well's real-time physical state at this exact moment — KGS's snapshot has its own refresh cadence.",
			"An \"unknown\" status does not mean the record is broken or missing; it means that specific combination of raw fields has not been mapped to a confident status, and Future Wells Kansas would rather show that plainly than guess.",
		],
		officialSources: [{ label: "KGS well data file format reference", url: kgsWellFormatUrl }],
		relatedGuideSlugs: ["aco1-completion-form-explainer", "cp1-cp4-plugging-explainer"],
		metaTitle: "How Kansas Oil and Gas Well Statuses Work | Future Wells Kansas",
		metaDescription: "Plain-English guide to how KGS derives a Kansas well's lifecycle status from multiple raw fields, and why some wells show as \"unknown.\"",
		sections: [
			{
				heading: "Why status comes from three fields, not one",
				body: "KGS's source data spreads well-type and status concepts across a well-class field and two separate status fields. A generic value in one field can be less specific than a more precise value sitting in another, so Future Wells Kansas combines all three and ranks the most specific pattern, rather than trusting one field in isolation.",
			},
			{
				heading: "Reading dry-and-abandoned versus plugged",
				body: "\"Dry and abandoned\" and \"plugged\" describe related but distinct outcomes in the source data and should not be treated as synonyms.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Assuming a generic value in one status field always outranks a more specific value reported in a different field.",
					"Treating \"unknown\" as a data error rather than a real, surfaced classification gap.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "plss-location-explainer",
		title: "How to Search Kansas PLSS Locations",
		shortTitle: "Kansas PLSS Locations",
		formCode: "PLSS location",
		agency: kgs,
		category: "Systems and identifiers",
		summary: "Kansas well and lease records describe legal location using the Public Land Survey System — township, range, and section, plus a quarter-call \"spot\" description — rather than a street address, and separately from any reported latitude/longitude.",
		howItsUsed: "The legal-location fields Future Wells Kansas reads alongside a well or lease's reported coordinates.",
		lastReviewed: "2026-09",
		keyFields: ["Township", "Township direction (N/S)", "Range", "Range direction (E/W)", "Section", "Spot/quarter-call description", "County"],
		whatItProves: ["The surveyed legal-description location reported for a well or lease in the source record."],
		whatItDoesNotProve: [
			"A PLSS legal description is not a parcel, mineral, or title boundary.",
			"Reported latitude/longitude alongside a PLSS description can come from a different source or era and may not agree with the PLSS description exactly.",
		],
		officialSources: [{ label: "KGS lease catalog", url: kgsLeaseCatalogUrl }, { label: "KGS well data file format reference", url: kgsWellFormatUrl }],
		relatedGuideSlugs: ["api-number-and-kgs-kid-explainer"],
		metaTitle: "How to Search Kansas PLSS Locations | Future Wells Kansas",
		metaDescription: "Plain-English guide to reading township-range-section (PLSS) legal locations in Kansas oil and gas records.",
		sections: [
			{
				heading: "Reading township, range, and section",
				body: "A PLSS legal description names a township and range (each with a direction, north/south or east/west) and a section number within that township-range grid, sometimes narrowed further by a quarter-call \"spot\" description.",
			},
			{
				heading: "PLSS versus coordinates",
				body: "A well or lease record can carry both a PLSS legal description and a reported latitude/longitude. The two are recorded separately and are not guaranteed to describe the exact same point with equal precision.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Treating a PLSS legal description as a precise GPS coordinate.",
					"Assuming a PLSS location doubles as a parcel or mineral-ownership boundary.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "horizontal-well-records-explainer",
		title: "What Kansas Horizontal-Well Records Do and Do Not Show",
		shortTitle: "Horizontal-Well Records",
		formCode: "Horizontal/directional status",
		agency: kgs,
		category: "Well lifecycle",
		summary: "A well flagged horizontal or directional in KGS's own horizontal-wells query is a status classification, not a drawn wellbore trajectory. Future Wells Kansas shows the status flag independently and does not draw or estimate a lateral line for any Kansas well.",
		howItsUsed: "The badge shown on a well record when KGS's own source classifies it as horizontal or directional.",
		lastReviewed: "2026-09",
		keyFields: ["Horizontal/directional status flag", "KGS horizontal-wells query result"],
		whatItProves: ["KGS has classified the well as horizontal or directional in its own published query."],
		whatItDoesNotProve: [
			"It does not mean a trajectory or lateral line has been drawn, verified, or is available for that well.",
			"It does not mean every well in that classification has usable directional-survey documentation — a real Future Wells Kansas research review of sampled wells found that not every well KGS's own query returns actually has extractable directional data; one sampled record turned out to be a 1928 scan with no directional content at all, from before directional drilling existed.",
		],
		officialSources: [{ label: "KGS horizontal wells query", url: kgsHorizontalWellsUrl }],
		relatedGuideSlugs: ["well-status-explainer", "aco1-completion-form-explainer"],
		metaTitle: "What Kansas Horizontal-Well Records Do and Do Not Show | Future Wells Kansas",
		metaDescription: "Plain-English guide to what a Kansas horizontal or directional well status flag means, and why Future Wells Kansas does not draw a trajectory line from it.",
		sections: [
			{
				heading: "What the horizontal/directional flag means",
				body: "KGS maintains a query that returns wells it classifies as horizontal or directional. Future Wells Kansas surfaces that classification as a status badge.",
			},
			{
				heading: "Why no trajectory line is drawn today",
				body: "Showing an actual wellbore path requires real directional-survey source documents, which are not consistently structured, digitally available, or complete across Kansas well filings. Guessing a straight-line lateral from a status flag alone would be a fabrication, not a record.",
			},
			{
				heading: "A real example of why this matters",
				body: "A research review of three wells KGS's own query flagged as horizontal sampled real completion-report attachments for each. One had a clean, structured directional-survey table; one had only a two-point narrative summary with no coordinates; and one was a scanned 1928 document with no directional content at all, because the well predated directional drilling — evidence that a \"horizontal\" flag in the source query is not by itself a reliable signal of usable trajectory data.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Assuming the horizontal/directional badge means a mapped lateral line exists.",
					"Assuming every well in KGS's horizontal-wells query result actually has directional-survey documentation.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "production-freshness-and-revisions-explainer",
		title: "How Kansas Production Freshness and Revisions Work",
		shortTitle: "Production Freshness and Revisions",
		formCode: "Production revisions",
		agency: kgs,
		category: "Production",
		summary: "KGS republishes its production archives periodically, and a later snapshot can correct a volume already reported for an earlier month. Future Wells Kansas treats a changed value for an already-reported lease-month as a revision, not a new duplicate record.",
		howItsUsed: "How Future Wells Kansas decides whether a re-observed production row is a correction, an unchanged re-observation, or genuinely new.",
		lastReviewed: "2026-09",
		keyFields: ["Lease KID", "Product", "Month-year", "Reported volume", "Snapshot/observation date"],
		whatItProves: ["The most recently observed reported volume for a given lease and month."],
		whatItDoesNotProve: [
			"It does not mean the first reported figure for that month was inaccurate at the time — production reporting has a real lag and correction cycle.",
			"A changed volume for a month already on file is not the same thing as a new, distinct production record; both are handled differently in how Future Wells Kansas reports on activity.",
		],
		officialSources: [{ label: "KGS lease production file format reference", url: kgsLeaseFormatUrl }],
		relatedGuideSlugs: ["lease-vs-well-production-explainer"],
		metaTitle: "How Kansas Production Freshness and Revisions Work | Future Wells Kansas",
		metaDescription: "Plain-English guide to why Kansas production figures change over time and how Future Wells Kansas tells a revision from a duplicate.",
		sections: [
			{
				heading: "Why revisions happen",
				body: "Production reporting is not instantaneous. A lease's reported monthly volume can be corrected in a later KGS archive update after the original figure was published.",
			},
			{
				heading: "How Future Wells Kansas tells a revision from a duplicate",
				body: "When a lease-month that already has a reported volume shows a different volume in a newer snapshot, Future Wells Kansas treats it as a revision to the existing record rather than filing a second, separate production record for the same month.",
			},
			{
				heading: "Common reading mistakes",
				bullets: [
					"Assuming the most recently scraped data always reflects the most recent production month — a later snapshot often still reports on an earlier month, corrected.",
					"Treating a revised figure as evidence the source data is unreliable, rather than a normal part of how production reporting works.",
				],
			},
		],
	}),
	buildKansasExplainer({
		slug: "data-limitations-and-verification-explainer",
		title: "Kansas Data Limitations and Verification Workflow",
		shortTitle: "Data Limitations and Verification",
		formCode: "Verification checklist",
		agency: bothAgencies,
		category: "Data limitations",
		summary: "A practical checklist for verifying any Kansas oil and gas record found through Future Wells Kansas against the original KCC or KGS source before relying on it for a decision.",
		howItsUsed: "The closing reference guide every other Kansas guide links back to.",
		lastReviewed: "2026-09",
		keyFields: ["Source agency", "Source URL", "Filing or report date", "This guide's last-reviewed date"],
		whatItProves: ["Following this checklist increases confidence that a record is being read correctly and checked against its original source."],
		whatItDoesNotProve: ["It does not substitute for legal, financial, engineering, or other professional verification of an important decision."],
		officialSources: [{ label: "KCC oil and gas data search", url: kccDataSearchUrl }, { label: "KGS oil and gas database", url: kgsWellCatalogUrl }],
		relatedGuideSlugs: ["kcc-and-kgs-explainer"],
		metaTitle: "Kansas Data Limitations and Verification Workflow | Future Wells Kansas",
		metaDescription: "A practical checklist for verifying Kansas oil and gas records against official KCC and KGS sources before relying on them.",
		sections: [
			{
				heading: "Step 1: Identify the source agency",
				body: "Confirm whether the record in question is a KCC regulatory filing or a KGS well/lease/production record — see the KCC and KGS roles guide.",
			},
			{
				heading: "Step 2: Confirm identifiers match",
				body: "Check the API number, KGS KID, or lease KID against the original source page, not just against Future Wells Kansas's own display of it.",
			},
			{
				heading: "Step 3: Check the record date against the coverage caveat",
				body: "Production figures, well statuses, and activity signals are all snapshot-based. Confirm the reporting month or observation date rather than assuming a figure is current through today.",
			},
			{
				heading: "Step 4: Cross-check KCC and KGS when both apply",
				body: "When a well has both a KCC regulatory history (intents, transfers, plugging) and a KGS well/production record, check both rather than assuming one confirms the other.",
			},
			{
				heading: "Common reading mistakes across every Kansas guide",
				bullets: [
					"Assuming KCC and KGS share one combined database.",
					"Treating a drilling intent as a guarantee of an actual well.",
					"Dividing lease-level production evenly across every well on a lease.",
					"Treating a horizontal/directional status flag as a drawn wellbore trajectory.",
				],
			},
		],
	}),
]

export function allExplainers(): ExplainerContent[] {
	return explainers.filter((explainer) => explainer.published)
}

export function explainerContent(slug: string): ExplainerContent | undefined {
	return explainers.find((explainer) => explainer.slug === slug && explainer.published)
}

export function allGuideCategories(): string[] {
	const seen = new Set<string>()
	const categories: string[] = []
	for (const explainer of allExplainers()) {
		if (seen.has(explainer.category)) continue
		seen.add(explainer.category)
		categories.push(explainer.category)
	}
	return categories
}
