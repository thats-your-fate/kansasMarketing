#!/bin/bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
export NODE_ENV=production HOST=127.0.0.1
if [[ -f app.js ]]; then exec /usr/bin/node app.js; fi
exec /usr/bin/node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "${PORT:?PORT is required}"
