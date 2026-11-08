#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
exec 8>"${XDG_RUNTIME_DIR:?}/future-wells-native-build.lock"
flock 8
test "$(hostname -s)" = futurewells
test "$(git branch --show-current)" = main
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
git diff --quiet -- . ':!next-env.d.ts'
git diff --cached --quiet
exec 9>"${XDG_RUNTIME_DIR:?}/future-wells-ks-production-view.lock"
flock -n 9 || exit 75
# Build an unused directory while the current web service keeps its old assets.
test ! -e .next-production-v2/BUILD_ID
if [ -r .env ]; then set -a; source .env; set +a; fi
export NEXT_DIST_DIR=.next-production-v2 NODE_OPTIONS=--max-old-space-size=768 NEXT_TELEMETRY_DISABLED=1
export BACKEND_API_URL=http://127.0.0.1:4008
export NEXT_PUBLIC_SITE_URL=https://futurewellskansas.com
npm run build
npm run typecheck
install -m 644 deploy/systemd/user/future-wells-ks-web.service "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user restart future-wells-ks-web.service
curl --fail --silent --retry 10 --retry-connrefused --retry-delay 1 --max-time 30 --output /dev/null http://127.0.0.1:3009/production
printf '%s\n' 'kansas monthly production view deployed.'
