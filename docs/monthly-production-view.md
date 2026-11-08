# Monthly production view

Added November 8, 2026. Well profiles use the existing Colorado presentation: displayed-period summary, server-rendered oil/gas SVG charts and monthly metric cards. Unknowns remain gaps; reported zero is a dot. Totals refer only to displayed months, with partial totals labelled. No chart library or client-side fetching is added.

Kansas keeps each verified linked lease separate. Its volumes are explicitly lease-level, never allocated to the individual well. Only oil and gas are shown; absent water/days are not invented. Duplicate product reports are withheld. Up to 100 latest source rows and four leases are displayed, with a link to the complete paginated source view.

The display omits the oldest partially loaded month when a source response is truncated. The source import window and latest reporting period remain coverage limits. Native deployments build an unused directory before switching the web service.

Validation: display tests cover null versus zero, calendar gaps, ambiguous months and state reporting grain. Full frontend test suite, TypeScript and native production build are required before activation.
