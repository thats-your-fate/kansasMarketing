# Kansas Non-Map URL Policy

Generated: 2026-09-15

Scope: public non-map routes only. Map route paths and map query parameters are excluded.

## Policy

- Production canonical origin: `https://futurewellskansas.com`.
- Local/preview origin: passed explicitly from `publicBaseUrl`; indexing remains controlled separately by `app/config.ts`.
- Canonical path format: leading slash, no trailing slash except `/`, path segments safely encoded.
- Tracking parameters are not canonical identity: `utm_*`, `fbclid`, `gclid`, `gbraid`, `mc_cid`, `mc_eid`, `msclkid`.
- Meaningful parameters are preserved by the shared helper when a route explicitly passes them: `page`, `sort`, `filter`, `q`.
- `page=1`, invalid page values, `page=0`, negative page values, and `page=last` are not preserved because no current non-map route implements a stable last-page identity.
- Current public non-map templates do not implement paginated HTML pages. Therefore current page metadata uses route paths only; the helper is ready for future paginated routes to pass search params deliberately.
- Stable record IDs remain part of well canonical paths, so duplicate display names do not merge.

## Confirmed Before / After

| Case | Before | After |
| --- | --- | --- |
| `/browse/` | `308` to `/browse` | unchanged: `308` to `/browse` |
| `/browse?utm_source=x&utm_medium=y` | canonical `https://futurewellskansas.com/browse` in production | unchanged locally as `http://localhost:3023/browse` |
| `/guides/kcc-and-kgs-explainer?fbclid=1` | canonical without tracking query | unchanged locally as `/guides/kcc-and-kgs-explainer` |
| `/wells/15-163-24539/not-current` | `308` to `/wells/15163245390000/allan-1` | unchanged: `308` to same canonical record |
| `/wells/15163245390000/allan-1` | canonical record path | unchanged locally as `/wells/15163245390000/allan-1` |

## Implementation

- `app/url-policy.mjs` is the shared non-map helper.
- `app/seo.ts` uses it for metadata canonical URLs; structured data consumes the same path through `canonicalUrl`.
- `app/sitemap.xml/route.ts` uses it for sitemap loc generation without changing map sitemap policy.
- `app/kansas-entity-pages.tsx` uses it for well record IDs and display slugs.
- `tests/url-policy.test.mjs` covers host/slash variants, encoding, stale slugs, duplicate names, tracking parameters, page 1/2/high/invalid values, and sort/filter combinations.
