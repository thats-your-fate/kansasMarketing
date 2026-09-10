# Kansas Marketing Boundary and Module Architecture

**Task:** KS-M001, KS-18, KS-19
**Status:** Design system cloned, top-level content pages built, 12 source guides published, a lightweight Browse entry page added, and lightweight well/operator/county/field landing cards added. See "This site is not a full data-product application" below.

## Fixed decisions

1. All real content lives under top-level routes (`/`, `/browse`, `/data`, `/data-coverage`, `/methodology`, `/activity`, `/guides`, `/guides/[slug]`, `/disclaimer`, `/privacy`, `/terms`, `/contact`) — **changed at KS-18** from KS-M001's original `/kansas`-prefixed convention. `coloradoMarketing`'s own marketing pages are top-level (only its full data-app pages sit under `/colorado/*`), and KS-18's own route list is written top-level; matching that precedent was judged more important than keeping the original per-state-prefix convention. `/kansas` now redirects to `/`.
2. All backend access is server-side, through `apiBaseUrl` (`BACKEND_API_URL`) — never exposed to the browser.
3. Indexing is opt-in and gated by `app/config.ts`'s `isIndexablePublicBaseUrl` check — a production build with `NEXT_PUBLIC_INDEXING_ENABLED=true` refuses to build unless `NEXT_PUBLIC_SITE_URL` is a real `futurewellskansas.com` hostname.
4. Kansas has two source agencies (KCC regulatory, KGS well/production) — `site-config.mjs` carries both (`officialAgencyName`, `secondaryAgencyName`); no page should credit only one when both contributed to the data shown. Every KS-18/KS-19 page follows this.
5. Any production fact quoted in content must carry the KGS coverage-caveat text from the task plan §2 — never imply production is current through the present month.
6. Sitemap generation is a static build-time step (`app/sitemap.xml/route.ts`, built at KS-18) — lists exactly the approved static pages, the lightweight entity-directory entry pages, and every published guide slug (read directly from `app/lib/explainers.ts`, so a new guide is picked up automatically without a second list to maintain). Dynamic wells/operators/counties/fields detail cards are served on demand rather than enumerated in the static sitemap.
7. Production is lease-level, not well-level (task plan §3.4) — any page quoting a production figure must carry the "Linked lease production. Production is reported for the lease and may include multiple wells." framing, and must never present `YearlyTotal`/`StartingCumulative` sentinel rows as monthly figures.
8. A well's "Horizontal/Directional" status (from `horizontal_or_directional`) is never accompanied by a drawn lateral line — that only exists once the backend reports `trajectory_available = true` for a specific well (task plan §3.6), and no page here renders wells individually enough for that to come up before it does. The KS-19 horizontal-well-records guide states this explicitly and cites `kansasBackend`'s own KS-16 research finding as a concrete example of why.
9. Every product CTA into Future Wells Co is built through `config/userArea.ts::futureWellsCtaHref(source)`, never a bare `futureWellsUserAreaRegisterUrl` link — it always appends `state=KS` (so the destination opens with Kansas already selected) and a `source` tag identifying which page/section the click came from. This is new work beyond what `coloradoMarketing` does (its identical constant carries no query params at all), added because KS-18's acceptance criteria require it.

## This site is not a full data-product application (updated 2026-09-06)

An explicit correction arrived after KS-M001 shipped: `kansasMarketing` must not become the full public data product. Public well search, public maps, saved watch areas, alerting, and broad paginated/filterable research workflows live in the shared Future Wells Co product. The `/browse` page and lightweight well/operator/county/field landing cards are the narrow public marketing surface requested on 2026-09-06: card pages summarize source-backed records and then hand deeper workflows to Future Wells Co.

Concretely:

- `kansasMarketing`'s public surface is editorial plus lightweight `/browse` and landing-card pages: state overview content, summary entry points, guides, coverage/methodology notes, contact, and source-backed card pages — never a live searchable table or map.
- Entity-detail pages end with the shared `RecordConversionCta` component (`components/future/RecordConversionCta.tsx`, ported verbatim from `coloradoMarketing`/`wyomingMarketing` at KS-M001) linking to `futurewells.co/user-area/register`; simpler non-entity CTAs still use `config/userArea.ts::futureWellsCtaHref(source)`. Both append `state=KS` to the destination URL.
- `site-config.mjs`'s `features.operators`/`counties`/`wellOverview`/`production`/`maps` are `false` and stay that way; they are off-switches for full local product workflows, not for lightweight landing cards.
- If this scope is ever revisited, it must be a deliberate decision against task plan §10, not a page added incrementally without noticing it re-introduces the pattern that was just removed.

## Cloned design system (KS-18, 2026-09-06)

`app/future.css` ports `coloradoMarketing`'s `app/future.css` design tokens and component classes (nav, mobile-nav disclosure, hero, cards, grids, sections, footer, guide/copy blocks) verbatim — same look and structure, Kansas content and links only, no new theme. Trimmed relative to Colorado's ~7,000-line original: Colorado's file also carries a Bootstrap-derived vendor theme (`public/assets/css/main.css`) and legacy `aos`/`gsap`/`swiper`/`isotope` template dependencies that only its full data-app pages use — none of that is ported here because Kansas only renders lightweight cards. `components/future/MarketingLayout.tsx` and `components/future/HeroMapPreview.tsx` are new, Kansas-specific implementations of Colorado's same-named components (the hero graphic is a hand-tuned Kansas outline, not Colorado's).

## Published guides (KS-19, 2026-09-06)

`app/lib/explainers.ts` holds all 12 required Kansas source/document guides, using the same type-plus-builder-factory shape as `coloradoMarketing`'s `app/lib/explainers.ts`, simplified to drop Colorado's document-auto-matching machinery (regex/alias rules linking an imported document to a guide) since nothing in this repo indexes documents against guides yet. Guide content is grounded in facts already verified live in `kansasBackend` (real API-number structure, the real lease-vs-well production distinction, the real multi-field well-status derivation, and KS-16's own real horizontal-well research finding), not Colorado's ECMC/DMR text with names substituted.

## Deferred (not this task)

- **Visual-regression testing** — KS-18's acceptance criteria call for automated visual-regression comparisons against Colorado at desktop/tablet/mobile widths. Neither this repo nor `coloradoMarketing` has any screenshot-diff tooling installed (no Playwright, no Percy); setting one up was scoped out of KS-18 as a separate infrastructure task. Verified instead by direct comparison of rendered structure/copy/CTA behavior against Colorado's live code and a local dev-server render of every route.
- **Campaign-parameter persistence through Future Wells Co's own authentication flow** — `futureWellsCtaHref` tags every outbound click with `state`/`source`, but whether those values survive Future Wells Co's actual login/registration redirect chain is entirely controlled by `futureBackend`'s account system, outside this repo.
- **The interactive contact form** — Colorado's `/contact` posts to a `/api/public/inquiries` backend endpoint with Turnstile captcha verification; no Kansas equivalent of that endpoint exists, so `/contact` here uses a plain `mailto:` link instead of a form that would silently fail to submit anywhere.
- No `lib/api/*` typed client yet — the small server-side fetch helpers live in `app/kansas-entity-pages.tsx` and `app/browse/page.tsx` until enough public API surface exists to justify a shared client. `/data-coverage`'s cadence table is static editorial content today, not a live query, since no public monitoring endpoint exists on the Kansas backend yet (see `kansasBackend`'s own `docs/ops/ks-17-monitoring-handoff.md`, which names this exact page as a deferred cross-repo item).
