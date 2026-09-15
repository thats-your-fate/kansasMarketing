# Kansas Non-Map Route SEO Baseline

Generated: 2026-09-15

Scope: public Future Wells Kansas website, non-map routes only. The map route was identified from source as `/map`, and the backend map endpoint was identified from source as `/api/ks/wells/map`. They are excluded from the inventory crawl and from any recommendations below. Existing sitemap membership for `/map` was observed but not modified.

Baseline artifact: `reports/seo/non-map-baseline.json`

## Method

- Inspected the actual Next App Router tree, metadata helper, robots route, sitemap route, guide content collection, marketing layout navigation, and backend Axum route table before writing this document.
- Rendered the current checkout locally with a clean Next dev server on `http://127.0.0.1:3010`, using the existing local backend API on `http://127.0.0.1:4008`.
- Crawled only source-discovered non-map URLs and API-derived non-map samples. The final crawl made 36 inspected requests: 28 finite editorial/support URLs, 6 dynamic samples, `robots.txt`, and `sitemap.xml`.
- Browser DOM comparison was not run because `playwright` / `@playwright/test` are not installed in this repo. The artifact records raw HTML observations only; it does not infer client/server rendering from text extraction.
- Deviation: one accidental local `HEAD` request to `/map` occurred before the final crawl. Its body was not inspected, no map behavior was tested, and no map code or indexing policy was modified.

## Route Inventory

| Family | Actual path pattern | Source/template files | Indexability intent | Canonical rule | Data dependency | Sitemap membership | Internal discovery path | Baseline classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage | `/` | `app/page.tsx`, `app/seo.ts` | Index only when production `NEXT_PUBLIC_INDEXING_ENABLED=true` and production HTTPS host passes `app/config.ts` guard. Local baseline is `noindex,nofollow`. | `canonicalUrl("/")` from `app/seo.ts`. | Static source-approved marketing copy. | Yes. | Header brand, root URL, sitemap. | Verified pass locally. |
| Browse/search entry | `/browse` | `app/browse/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/browse` | Same site-wide indexing gate. | `/browse`. | Public API summary: recent activity, top counties, top operators, top fields. Falls back to empty sections on API failure. | Yes. | Header/footer, homepage CTA, entity pages. | Verified pass locally. |
| Activity | `/activity` | `app/activity/page.tsx`, `site-config.mjs` | Same site-wide indexing gate. | `/activity`. | Static event taxonomy. | Yes. | Header/footer, homepage. | Verified pass locally. |
| Guide library | `/guides` | `app/guides/page.tsx`, `app/lib/explainers.ts` | Same site-wide indexing gate. | `/guides`. | Published guide array from `allExplainers()`. | Yes. | Header/footer, homepage, browse. | Verified pass locally. |
| Guide articles | `/guides/[slug]` | `app/guides/[slug]/page.tsx`, `app/lib/explainers.ts` | Same site-wide indexing gate for found articles; unknown slugs are not found. | `/guides/{published-slug}`. | Published guide object. | Yes, each published guide. | Guide library, related guide links, well pages. | Verified pass locally for all 12 finite guide URLs. |
| Data sources | `/data` | `app/data/page.tsx` | Same site-wide indexing gate. | `/data`. | Static approved source notes. | Yes. | Header/footer, homepage. | Verified pass locally. |
| Data coverage | `/data-coverage` | `app/data-coverage/page.tsx` | Same site-wide indexing gate. | `/data-coverage`. | Static coverage notes. | Yes. | Footer, homepage. | Verified pass locally. |
| Methodology | `/methodology` | `app/methodology/page.tsx` | Same site-wide indexing gate. | `/methodology`. | Static methodology copy. | Yes. | Header/footer, homepage. | Verified pass locally. |
| Contact | `/contact` | `app/contact/page.tsx` | Same site-wide indexing gate. | `/contact`. | Static company/contact copy. | Yes. | Footer. | Verified pass locally. |
| Legal/support | `/disclaimer`, `/privacy`, `/terms` | `app/disclaimer/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` | Same site-wide indexing gate. | Matching path. | Static legal/support copy. | Yes. | Footer and cross-links. | Verified pass locally. |
| Future Wells regional sites | `/future-wells-sites` | `app/future-wells-sites/page.tsx` | Same site-wide indexing gate. | `/future-wells-sites`. | Static public regional-site list and public image assets. | Yes. | Footer. | Verified pass locally. |
| Legacy Kansas redirect | `/kansas` | `app/kansas/page.tsx` | Redirect only. Local response includes noindex shell metadata. | Redirects to `/`. | None. | No. | Legacy only; not a primary internal route. | Verified pass locally: `307` to `/`. |
| County index | `/counties` | `app/counties/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/browse` | Same site-wide indexing gate. | `/counties`. | Public top county summary from API. | Yes. | Browse and footer. | Verified pass locally. |
| County detail | `/counties/[slug]` | `app/counties/[slug]/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/counties/:slug` | Same site-wide indexing gate for found records; unavailable pages use noindex metadata or 404. | `entityPath("counties", display_name)`, normalized by slug redirect. | Public KGS-backed entity aggregates and representative well cards. | Not enumerated in sitemap. | Browse top-counties, related entity links. | Verified pass on sample `/counties/montgomery-county`; broader enumeration unverified. |
| Operator index | `/operators` | `app/operators/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/browse` | Same site-wide indexing gate. | `/operators`. | Public top operator summary from API. | Yes. | Browse and footer. | Verified pass locally. |
| Operator detail | `/operators/[slug]` | `app/operators/[slug]/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/operators/:slug` | Same site-wide indexing gate for found records; unavailable pages use noindex metadata or 404. | `entityPath("operators", display_name)`, normalized by slug redirect. | Public KGS-backed entity aggregates and representative well cards. | Not enumerated in sitemap. | Browse top-operators, related entity links. | Verified pass on sample `/operators/eiger-operating-company-llc`; broader enumeration unverified. |
| Field index | `/fields` | `app/fields/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/browse` | Same site-wide indexing gate. | `/fields`. | Public top field summary from API. | Yes. | Browse and footer. | Verified pass locally. |
| Field detail | `/fields/[slug]` | `app/fields/[slug]/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/fields/:slug` | Same site-wide indexing gate for found records; unavailable pages use noindex metadata or 404. | `entityPath("fields", display_name)`, normalized by slug redirect. | Public KGS-backed entity aggregates and representative well cards. | Not enumerated in sitemap. | Browse top-fields, related entity links. | Verified pass on sample `/fields/wildcat`; broader enumeration unverified. |
| Well detail | `/wells/[api]`, `/wells/[api]/[...slug]` | `app/wells/[api]/page.tsx`, `app/wells/[api]/[...slug]/page.tsx`, `app/kansas-entity-pages.tsx`, backend `/api/ks/wells/:api` | Same site-wide indexing gate for found records; unavailable pages noindex/404. | `wellPath(well)`, normalized by API/KGS identifier and slug redirect. | Public KGS-backed well record and related county wells. | Not enumerated in sitemap. | Browse recent activity, entity representative well cards, related links. | Verified pass on two API-derived samples; stale identifier returned `404`/`noindex`. |

## Finite URLs Covered

Finite editorial/support URLs enumerated and inspected:

- `/`
- `/browse`
- `/future-wells-sites`
- `/counties`
- `/operators`
- `/fields`
- `/data`
- `/data-coverage`
- `/methodology`
- `/activity`
- `/guides`
- `/disclaimer`
- `/privacy`
- `/terms`
- `/contact`
- `/kansas` redirect
- `/guides/kcc-and-kgs-explainer`
- `/guides/api-number-and-kgs-kid-explainer`
- `/guides/c1-notice-of-intent-explainer`
- `/guides/aco1-completion-form-explainer`
- `/guides/t1-operator-transfer-explainer`
- `/guides/cp1-cp4-plugging-explainer`
- `/guides/lease-vs-well-production-explainer`
- `/guides/well-status-explainer`
- `/guides/plss-location-explainer`
- `/guides/horizontal-well-records-explainer`
- `/guides/production-freshness-and-revisions-explainer`
- `/guides/data-limitations-and-verification-explainer`

## Dynamic Samples

API-derived samples inspected from the local browse payload:

- Complete/large county sample: `/counties/montgomery-county`, `200`, canonical present, H1 present.
- Complete/large operator sample with punctuation: `/operators/eiger-operating-company-llc`, `200`, canonical present, H1 present.
- Complete/large field sample: `/fields/wildcat`, `200`, canonical present, H1 present.
- Recent well sample: `/wells/15163245390000/allan-1`, `200`, canonical present, H1 present.
- Recent well sample with special characters in display source: `/wells/15015242530000/gb-4-new-martin-1`, `200`, canonical present, H1 present.
- Stale identifier sample: `/wells/00000000000000`, `404`, `noindex`, no canonical.

The API returned 8 recent activity records, 8 top counties, 8 top operators, and 8 top fields. Full database counts, duplicate display-name searches, empty relationship-set searches, complete entity enumeration, and pagination boundaries could not be verified from this shell because no direct database connection string was available and the public API does not expose enumeration or pagination endpoints for those cases.

## Raw HTML Baseline Summary

- All implemented non-map finite editorial/support pages returned `200` on the clean local server, except `/kansas`, which returned `307` to `/`.
- All 12 guide articles returned `200`.
- All sampled found county/operator/field/well detail pages returned `200`.
- The synthetic stale well identifier returned `404` with `robots: noindex`.
- Every `200` page inspected had a title, meta description, canonical link, robots directive, H1, and meaningful visible body text in raw HTML.
- Local robots returned `User-agent: *` and `Disallow: /`, matching the local indexing safety gate.
- Local sitemap returned `200` and includes finite marketing/guide URLs plus `/map`. This audit does not remove that map sitemap entry because map routes are excluded from scope.
- JSON-LD appeared on homepage, editorial/support pages, guide index, guide articles, and breadcrumb-bearing static pages. Entity and well sample pages did not emit JSON-LD in raw HTML.

## Classification

Verified pass:

- Source-discovered non-map route families are represented in this inventory.
- Finite editorial/support and guide pages are enumerated.
- Clean local crawl showed zero `5xx` responses for the final non-map URL set.
- Site-wide local indexing guard produced `noindex,nofollow` on inspected pages.
- Canonicals match the active local origin and normalized path for inspected `200` pages.
- Product CTAs remain outbound to Future Wells Co and do not expose account-only records in page generation.

Improvement opportunity:

- Entity and well pages are data-backed but not sitemap-enumerated. That may be intentional; if future SEO strategy wants selected entity/well indexing, define eligibility, freshness, duplication, and access-control rules first.
- Browser-rendered DOM comparison is not covered until a browser automation dependency is available.
- Full dynamic edge-case sampling needs either direct read-only DB access or API endpoints that expose eligible IDs and counts without exposing proprietary/account-only data.

Unverified:

- Production host indexing behavior was not tested. Local `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_INDEXING_ENABLED=false` intentionally keep indexing disabled.
- Full county/operator/field/well eligible ID counts, duplicate-display-name cases, empty relationship-set cases, and stale slug redirect variants.
- Production response headers, CDN behavior, and deployed sitemap/robots were not fetched.

Verified defect:

- None found in the final clean local non-map crawl.

## Absent / Not Implemented Public Route Families

These families were requested for inclusion only where implemented. Source inspection found no public non-map templates for them:

- Lease detail pages: not implemented.
- Production detail pages: not implemented.
- Document detail pages: not implemented.
- County/operator/field pagination pages beyond the current top-summary index pages: not implemented.
- Public browse query parameter pages: not implemented.

## Counts

- Enumerated finite editorial/support URLs: 28.
- Dynamic sampled URLs: 6.
- Inspected local URLs including sitemap and robots: 36.
- Final clean crawl failed fetches: 0.
- Redirects observed: 1 (`/kansas` to `/`).
- Map URLs intentionally skipped in final crawl: 1 (`/map`).

## Commands Run

- `rg --files ...` in `kansasMarketing` and `kansasBackend`.
- `git status --short --branch` in both repos.
- `sed`/`rg` inspections of route, SEO, sitemap, robots, layout, guide, entity page, and backend route files.
- `cargo test --no-run` in `kansasBackend`.
- `npm run typecheck` in `kansasMarketing`.
- `curl -sS -i http://127.0.0.1:4008/health`
- `curl -sS -i http://127.0.0.1:4008/api/ks/browse`
- `curl -sS http://127.0.0.1:3009/sitemap.xml`
- `curl -sS http://127.0.0.1:3009/robots.txt`
- `PORT=3010 NEXT_PUBLIC_SITE_URL=http://localhost:3010 BACKEND_API_URL=http://127.0.0.1:4008 npm run dev -- -p 3010 -H 127.0.0.1`
- Local Node crawl against `http://127.0.0.1:3010` and `http://127.0.0.1:4008`, writing `reports/seo/non-map-baseline.json`.
- `npm run lint` in `kansasMarketing`.

