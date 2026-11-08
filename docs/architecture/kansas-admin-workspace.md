# Kansas admin workspace

Kansas administration shares the regional app design: navy navigation, a white
account bar, warm page background, gold accents, and responsive export cards.

- `/app/admin` is the overview with the latest snapshot counts and delivery.
- `/app/admin/exports` contains the existing create/upload and refresh actions.
- `/app` and `/app/admin/login` keep their existing redirect to `/app/admin`.
- Signed-out visitors see the branded regional login and existing Turnstile.

`AdminConsole` continues to own session checking, login, sign-out, five-second
status polling and the export POST. `AdminWorkspace` presents that state and
provides the desktop sidebar / mobile menu. CSS is scoped to these components.
The existing credential file, cookie, API authorization and native exporter are
unchanged. Public product features are not added by this admin layout.

Snapshot counts describe the latest export, not live statewide coverage. Upload
completion is labelled "Ready to import"; central platform import is a separate
action. The UI shows no invented completion percentage or historical inventory.

QA: typecheck, production build, existing Turnstile tests, desktop and 393-pixel
mobile screenshots, and interactive checks for page navigation, refresh, busy
export controls, poll-to-completion, mobile menu and sign-out. Interaction checks
use a loopback-only API fixture with the real latest export metadata; they do
not create production sessions or launch exports. Live deployment checks cover
both admin routes, login verification config, unauthenticated API rejection and
public-site indexing.
