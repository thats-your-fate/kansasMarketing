# Kansas Marketing Boundary and Module Architecture

**Task:** KS-M001
**Status:** Scaffold complete. Landing page + shared conversion CTA only, no entity content.

## Fixed decisions

1. All content lives under `app/kansas/...`; the root `app/page.tsx` redirects there, matching the `/<state>/...` convention every sibling marketing repo uses even on a state-specific domain.
2. All backend access is server-side, through `apiBaseUrl` (`BACKEND_API_URL`) — never exposed to the browser.
3. Indexing is opt-in and gated by `app/config.ts`'s `isIndexablePublicBaseUrl` check — a production build with `NEXT_PUBLIC_INDEXING_ENABLED=true` refuses to build unless `NEXT_PUBLIC_SITE_URL` is a real `futurewellskansas.com` hostname.
4. Kansas has two source agencies (KCC regulatory, KGS well/production) — `site-config.mjs` carries both (`officialAgencyName`, `secondaryAgencyName`); no page should credit only one when both contributed to the data shown.
5. Any production fact quoted in content must carry the KGS coverage-caveat text from the task plan §2 — never imply production is current through the present month.
6. Sitemap generation is a static build-time step (KS-M009), not request-time — `app/sitemap.xml/route.ts` is a placeholder until then.
7. Production is lease-level, not well-level (task plan §3.4) — any page quoting a production figure must carry the "Linked lease production. Production is reported for the lease and may include multiple wells." framing, and must never present `YearlyTotal`/`StartingCumulative` sentinel rows as monthly figures.
8. A well's "Horizontal/Directional" status (from `horizontal_or_directional`) is never accompanied by a drawn lateral line — that only exists once the backend reports `trajectory_available = true` for a specific well (task plan §3.6), and no page here renders wells individually enough for that to come up before it does.

## This site is not a data-product application (recorded 2026-09-05, task plan §10)

An explicit correction arrived after KS-M001 shipped: `kansasMarketing` must never build public well search, a public map, or browse-first (paginated/filterable) directories of wells, operators, counties, or fields. An investigation of `coloradoMarketing`/`wyomingMarketing`/`futureBackend` (recorded in the backend task doc §10) found that this exact surface already exists twice, independently, in Colorado and Wyoming's marketing sites — and that the one real, current cross-state product for search/map/save is `futurewells.co`'s `user-area`, backed by `futureBackend`'s shared account system. Building it a third time here would be the same duplication, not the reference pattern to follow.

Concretely:

- `kansasMarketing`'s public surface is editorial: state/county overview content, guides, coverage/methodology notes, contact — never a live searchable table or map.
- Every page that would otherwise tempt a "browse this state's wells" feature instead ends with the shared `RecordConversionCta` component (`components/future/RecordConversionCta.tsx`, ported verbatim from `coloradoMarketing`/`wyomingMarketing` at KS-M001) linking to `futurewells.co/user-area/register` via `config/userArea.ts::futureWellsUserAreaRegisterUrl`. `app/analytics.ts` carries only the two event names that component needs (`account_cta_view`, `account_cta_click`) — add more only when a page actually needs them.
- `site-config.mjs`'s `features.operators`/`counties`/`wellOverview`/`production`/`maps` are `false` and stay that way; they exist as an explicit off-switch documenting what was deliberately not built, not dead code to clean up.
- If this scope is ever revisited, it must be a deliberate decision against task plan §10, not a page added incrementally without noticing it re-introduces the pattern that was just removed.

## Deferred (not this task)

- No visual design/theme fork yet (KS-M010) — deliberately plain CSS so the scaffold isn't blocked on a design decision.
- No `lib/api/*` typed client yet — only added if a guide/coverage page needs one live fact from the backend (KS-M002); there is no data-backed browse surface to build a full client for.
- No county/guide content pages yet — KS-M002/KS-M003, editorial content only.
