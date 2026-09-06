# Future Wells Kansas — Marketing

Next.js 14 App Router SEO site for Kansas oil & gas well data, following the same architecture as the sibling Future Wells state marketing sites (Wyoming, Oklahoma, Colorado). Paired with [`kansasBackend`](https://github.com/thats-your-fate/kansasBackend).

See `future_wells_kansas_backend_marketing_codex_tasks.md` (in the backend repo) for the full plan, and `docs/architecture/kansas-marketing-boundary.md` for fixed module boundaries.

## Local development

```bash
cp .env.example .env   # BACKEND_API_URL defaults to http://127.0.0.1:4008
npm install
npm run dev             # serves on :3009
```

Requires `kansasBackend`'s API running locally (or `BACKEND_API_URL` pointed at a reachable instance) for the landing page's backend-status card to show "ok".

## Changelog

- **KS-M001** (2026-09-04): Scaffolded the project — Next.js 14 App Router project, `site-config.mjs` (stateCode `KS`, both KCC and KGS credited as separate agencies), `app/config.ts` with the indexing-safety guard, root layout, a `/kansas` landing page that server-fetches the backend `/health` endpoint, placeholder `robots.txt`/`sitemap.xml` routes, deploy script + systemd unit.
- **KS-M001 addendum** (2026-09-05): Following an architecture correction (backend task doc §10: this site must never build public well search, a map, or browse-first directories — that belongs to the shared `futurewells.co/user-area` product), replaced the landing page's "under construction" framing with a real conversion path. Ported `components/future/RecordConversionCta.tsx` and `config/userArea.ts` verbatim from `coloradoMarketing`/`wyomingMarketing` (the same shared pattern both sibling sites already use to funnel visitors to `futurewells.co/user-area/register`), added a minimal `app/analytics.ts` (just the two event names the CTA needs), and added a CTA card on `/kansas` linking to account registration instead of promising a self-hosted search/map. No entity pages (wells/operators/production/etc.) are planned — see the updated marketing task queue (task doc §9) and `docs/architecture/kansas-marketing-boundary.md`.
