# Kansas Non-Map Editorial Audit - Task 09

Date: 2026-09-15
Scope: finite public non-map editorial/support pages and every guide article. Dynamic record directories and detail pages were covered by prior tasks; map routes were not fetched or modified.

## Static And Support Pages

| URL | Purpose | Review result | Notes |
| --- | --- | --- | --- |
| / | Homepage | Reviewed | Public entry points, browse preview, guide/product handoff. |
| /activity | Activity explainer | Reviewed | Explains event types; live feed remains in Future Wells Co. |
| /browse | Browse hub | Reviewed | Existing server-rendered public record entry points. |
| /guides | Guide library | Reviewed | Finite published guide index grouped by category. |
| /data | Source directory | Reviewed | Source origins and agency split; not a freshness dashboard. |
| /data-coverage | Coverage page | Reviewed | Target cadence and coverage notes; not live freshness. |
| /methodology | Methodology | Reviewed | Transformations, inference limits, and source caveats. |
| /contact | Support/contact | Reviewed | Company identity, contact email, product-access CTA. |
| /future-wells-sites | Site-network page | Reviewed | Regional site network page present locally; untracked before this audit. |
| /disclaimer | Legal/support | Reviewed | Public data and professional-advice disclaimers. |
| /privacy | Legal/support | Reviewed | Privacy policy summary and contact route. |
| /terms | Legal/support | Reviewed | Terms summary and disclaimer/contact links. |

## Guide Articles

| URL | User question | Clear answer source | Internal discovery link | Review result |
| --- | --- | --- | --- | --- |
| /guides/kcc-and-kgs-explainer | Which Kansas agency publishes this oil and gas record? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/api-number-and-kgs-kid-explainer | How do I identify the same Kansas well across API numbers and KGS KIDs? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/c1-notice-of-intent-explainer | Does a Kansas C-1 notice mean a well has actually been drilled? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/aco1-completion-form-explainer | What does a Kansas ACO-1 completion form prove about a well? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/t1-operator-transfer-explainer | Does a Kansas T-1 transfer show who drilled or owns a well? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/cp1-cp4-plugging-explainer | Does a Kansas plugging filing prove a well was plugged? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/lease-vs-well-production-explainer | Can Kansas lease production be treated as individual well production? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/well-status-explainer | How should I read a Kansas well status label? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/plss-location-explainer | How do I read a Kansas township-range-section location? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/horizontal-well-records-explainer | Does a Kansas horizontal-well flag mean a mapped lateral exists? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/production-freshness-and-revisions-explainer | Why can Kansas production values change after a month is already reported? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |
| /guides/data-limitations-and-verification-explainer | How should I verify a Kansas oil and gas record before relying on it? | Summary plus new at-a-glance question/short-answer block | Related guides plus /browse, /counties, /operators, /fields | Reviewed |

## Findings

- Verified pass: guide library and all 12 guide articles are finite, intended-indexable pages with official-source links and related guide links.
- Verified improvement applied: guide article template now displays a specific user question and short answer near the top.
- Verified improvement applied: every guide now has internal public discovery links to /browse and implemented county/operator/field directories.
- Verified pass: /data identifies source origins; /data-coverage describes target cadence rather than demonstrated freshness; /methodology explains transformations and inference limits.
- Verified pass: /contact exposes a working mailto route and Future Wells Co CTA; legal/support pages retain company identity and do not invent compliance claims.
- Unverified external availability: official KCC/KGS links were kept as source references. Any external outage should be documented separately because those URLs are outside this repository.
- Out of scope: no map routes, map functionality, or map indexing policy were fetched or changed.

## Commands

- `node --test tests/*.test.mjs`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
