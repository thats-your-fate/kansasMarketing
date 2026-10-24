# Kansas admin login verification

Admin authentication lives in this Next.js server. Supply TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to the web service at runtime (the deployment can read the existing kansasBackend/.env through a systemd EnvironmentFile). Never prefix the secret with NEXT_PUBLIC or commit its value.

GET /api/admin/auth/turnstile exposes only the public key with no-store caching. POST /api/admin/auth/login requires turnstile_token plus the existing credentials. Cloudflare verification runs before password hashing/session creation and requires success, action admin_login, and futurewellskansas.com or www.futurewellskansas.com. Origin and login rate limits remain enforced. Missing/invalid/expired/replayed tokens return 403; missing keys or provider failures return 503.

The login widget is loaded dynamically, submission remains disabled until verified, and every attempt refreshes the single-use challenge. A verification outage never permits password-only login.

Run npm run typecheck and node --experimental-strip-types --test scripts/test-admin-turnstile.mjs. Browser validation must confirm widget loading on the production hostname. A real successful login requires the human challenge and existing administrator credentials.
