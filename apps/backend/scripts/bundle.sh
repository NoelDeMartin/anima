#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/../.." && pwd)"
DIST_DIR="${BACKEND_DIR}/dist"
TMP_DIR="$(mktemp -d)"

if [ -z "${VP_RUN:-}" ]; then
	echo "❌ Error: bundle.sh must be invoked via 'vp run bundle'" >&2
	exit 1
fi

# 1. Build backend
(cd "${BACKEND_DIR}" && vp build)

# 2. Deploy production dependencies
(cd "${REPO_ROOT}" && pnpm --filter=@anima/backend deploy "${TMP_DIR}" --prod --legacy --config.node-linker=hoisted)

# 3. Copy compiled backend dist into deployed directory
cp -a "${DIST_DIR}/." "${TMP_DIR}/"

# 4. Copy built frontend into public directory
mkdir -p "${TMP_DIR}/public"
cp -a "${REPO_ROOT}/apps/frontend/dist/." "${TMP_DIR}/public/"

# 5. Remove unneeded source files left by deploy
rm -rf "${TMP_DIR}/src" "${TMP_DIR}/apps" "${TMP_DIR}/scripts"
rm -f "${TMP_DIR}/vite.config.ts" "${TMP_DIR}/tsconfig.json"

# 6. Replace dist with complete bundle
rm -rf "${DIST_DIR}"
mv "${TMP_DIR}" "${DIST_DIR}"
