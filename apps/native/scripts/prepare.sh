#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="22.14.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${ROOT_DIR}/../.." && pwd)"
BINARIES_DIR="${ROOT_DIR}/src-tauri/binaries"
ICONS_DIR="${ROOT_DIR}/src-tauri/icons"
RESOURCE_BACKEND_DIR="${ROOT_DIR}/src-tauri/resources/backend"

# 1. Detect target triple
if [ -z "${TAURI_TARGET_TRIPLE:-}" ]; then
	HOST_TRIPLE="$(rustc -vV | awk '/host:/ {print $2}')"
else
	HOST_TRIPLE="${TAURI_TARGET_TRIPLE}"
fi

if [[ "${HOST_TRIPLE}" == *"windows"* ]]; then
	SIDECAR_PATH="${BINARIES_DIR}/node-${HOST_TRIPLE}.exe"
else
	SIDECAR_PATH="${BINARIES_DIR}/node-${HOST_TRIPLE}"
fi
mkdir -p "${BINARIES_DIR}"

# 2. Download standalone Node.js if missing
if [ ! -f "${SIDECAR_PATH}" ]; then
	echo "📥 Downloading Node.js (${NODE_VERSION}) for ${HOST_TRIPLE}..."

	if [[ "${HOST_TRIPLE}" == *"linux"* ]]; then
		if [[ "${HOST_TRIPLE}" == *"aarch64"* ]]; then
			ARCH="arm64"
		else
			ARCH="x64"
		fi
		NODE_ARCHIVE="node-v${NODE_VERSION}-linux-${ARCH}.tar.gz"
		BINARY_SUBPATH="node-v${NODE_VERSION}-linux-${ARCH}/bin/node"
	elif [[ "${HOST_TRIPLE}" == *"darwin"* ]]; then
		if [[ "${HOST_TRIPLE}" == *"aarch64"* ]]; then
			ARCH="arm64"
		else
			ARCH="x64"
		fi
		NODE_ARCHIVE="node-v${NODE_VERSION}-darwin-${ARCH}.tar.gz"
		BINARY_SUBPATH="node-v${NODE_VERSION}-darwin-${ARCH}/bin/node"
	elif [[ "${HOST_TRIPLE}" == *"windows"* ]]; then
		if [[ "${HOST_TRIPLE}" == *"aarch64"* ]]; then
			ARCH="arm64"
		else
			ARCH="x64"
		fi
		NODE_ARCHIVE="node-v${NODE_VERSION}-win-${ARCH}.zip"
		BINARY_SUBPATH="node-v${NODE_VERSION}-win-${ARCH}/node.exe"
	else
		echo "Unsupported target triple: ${HOST_TRIPLE}" >&2
		exit 1
	fi

	TMP_DIR="$(mktemp -d)"
	if [[ "${NODE_ARCHIVE}" == *.zip ]]; then
		curl -sSL "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}" -o "${TMP_DIR}/${NODE_ARCHIVE}"
		unzip -q "${TMP_DIR}/${NODE_ARCHIVE}" -d "${TMP_DIR}"
	else
		curl -sSL "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}" | tar -xz -C "${TMP_DIR}"
	fi
	cp "${TMP_DIR}/${BINARY_SUBPATH}" "${SIDECAR_PATH}"
	rm -rf "${TMP_DIR}"
	chmod 755 "${SIDECAR_PATH}"
	echo "✅ Sidecar binary saved: ${SIDECAR_PATH}"
fi

# 3. Generate icons if missing
BUNDLE_ICONS=("32x32.png" "128x128.png" "128x128@2x.png" "icon.icns" "icon.ico")
NEEDS_ICONS=false
for icon in "${BUNDLE_ICONS[@]}"; do
	if [ ! -f "${ICONS_DIR}/${icon}" ]; then
		NEEDS_ICONS=true
		break
	fi
done

if [ "${NEEDS_ICONS}" = true ] && [ -f "${ICONS_DIR}/icon.png" ]; then
	echo "🎨 Generating icons..."
	TMP_ICON="$(mktemp)"
	cp "${ICONS_DIR}/icon.png" "${TMP_ICON}"
	(cd "${REPO_ROOT}" && pnpm --filter=@anima/native exec tauri icon "${ICONS_DIR}/icon.png")
	cp "${TMP_ICON}" "${ICONS_DIR}/icon.png"
	rm -f "${TMP_ICON}"
	rm -rf "${ICONS_DIR}/android" "${ICONS_DIR}/ios"
fi

# 4. Build backend
echo "📦 Building backend..."
(cd "${REPO_ROOT}" && VITE_MANAGED_POD=true vp run --cache --filter @anima/backend build:native)

# 5. Copy backend bundle to native resources
echo "📂 Copying backend resources to native app..."
rm -rf "${RESOURCE_BACKEND_DIR}"
mkdir -p "${RESOURCE_BACKEND_DIR}"
cp -a "${REPO_ROOT}/apps/backend/dist/." "${RESOURCE_BACKEND_DIR}/"

# Ensure native dist directory exists (configured as frontendDist in tauri.conf.json)
mkdir -p "${ROOT_DIR}/dist"

echo "✅ Preparations complete."
