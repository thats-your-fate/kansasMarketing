# Kansas Sitemap and Crawler Policy

Generated: 2026-09-15

Scope: public Kansas sitemap and robots output. Map sitemap inclusion is preserved from the existing policy; map routes and map query parameters were not fetched or changed.

## Sitemap Eligibility

Included:

- Homepage, browse, finite editorial/support pages, guide index, every published guide article.
- `/future-wells-sites`, which appears in the non-map route inventory.
- `/map`, preserving the existing sitemap inclusion policy.
- County/operator/field index pages.

Excluded:

- Legacy redirects such as `/kansas`.
- Dynamic county/operator/field/well detail pages, because this repo does not enumerate eligible IDs for sitemap output and Task 01 classified broad enumeration as unverified.
- Missing records, errors, internal search results, and noncanonical query variants.
- Paginated pages, because no current public non-map route implements stable paginated HTML. The URL policy helper preserves meaningful page/sort/filter identity for future routes that deliberately pass those params.

No `lastmod` is emitted. The current site has no trusted per-page content-change timestamp for these URLs, and request/build time is not evidence of content modification.

## Limits and XML

Current sitemap size is far below the 50,000 URL / 50 MB single-sitemap limits, so no sitemap index or sharding is needed yet.

`app/sitemap-policy.mjs` enforces:

- absolute HTTPS URLs outside local development,
- no query strings in sitemap loc entries,
- duplicate detection,
- 50,000 URL maximum,
- XML escaping.

## Robots

Production robots output should be:

```txt
User-agent: *
Allow: /
Sitemap: https://futurewellskansas.com/sitemap.xml
```

Local/staging indexing remains controlled by `app/config.ts`. This task does not broaden disallow patterns, does not block public rendering assets, and does not change map-specific behavior.

Sitemap submission URL for an authorized operator:

`https://futurewellskansas.com/sitemap.xml`
