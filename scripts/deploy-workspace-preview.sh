#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
exec 9>"${XDG_RUNTIME_DIR:?}/future-wells-native-build.lock"
flock 9
exec /usr/bin/node scripts/deploy-workspace-preview.mjs
