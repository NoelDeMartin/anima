import { execSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_VERSION = '22.14.0';
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const repoRoot = resolve(rootDir, '../..');
const binariesDir = join(rootDir, 'src-tauri/binaries');
const iconsDir = join(rootDir, 'src-tauri/icons');
const resourceBackendDir = join(rootDir, 'src-tauri/resources/backend');

// 1. Detect target triple
const hostTriple =
  process.env.TAURI_TARGET_TRIPLE || execSync('rustc -vV', { encoding: 'utf8' }).match(/host:\s*(\S+)/)?.[1];

if (!hostTriple) {
  console.error('❌ Error: Failed to determine host target triple');
  process.exit(1);
}

const isWindows = hostTriple.includes('windows');
const sidecarPath = join(binariesDir, `node-${hostTriple}${isWindows ? '.exe' : ''}`);
mkdirSync(binariesDir, { recursive: true });

// 2. Download standalone Node.js if missing
if (!existsSync(sidecarPath)) {
  console.log(`📥 Downloading Node.js (${NODE_VERSION}) for ${hostTriple}...`);

  let arch;
  let nodeArchive;
  let binarySubpath;

  if (hostTriple.includes('linux')) {
    arch = hostTriple.includes('aarch64') ? 'arm64' : 'x64';
    nodeArchive = `node-v${NODE_VERSION}-linux-${arch}.tar.gz`;
    binarySubpath = `node-v${NODE_VERSION}-linux-${arch}/bin/node`;
  } else if (hostTriple.includes('darwin')) {
    arch = hostTriple.includes('aarch64') ? 'arm64' : 'x64';
    nodeArchive = `node-v${NODE_VERSION}-darwin-${arch}.tar.gz`;
    binarySubpath = `node-v${NODE_VERSION}-darwin-${arch}/bin/node`;
  } else if (hostTriple.includes('windows')) {
    arch = hostTriple.includes('aarch64') ? 'arm64' : 'x64';
    nodeArchive = `node-v${NODE_VERSION}-win-${arch}.zip`;
    binarySubpath = `node-v${NODE_VERSION}-win-${arch}/node.exe`;
  } else {
    console.error(`❌ Unsupported target triple: ${hostTriple}`);
    process.exit(1);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'anima-node-'));
  try {
    const url = `https://nodejs.org/dist/v${NODE_VERSION}/${nodeArchive}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download Node.js from ${url}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const archivePath = join(tmpDir, nodeArchive);
    writeFileSync(archivePath, Buffer.from(arrayBuffer));

    if (nodeArchive.endsWith('.zip')) {
      execSync(`tar -xf "${archivePath}" -C "${tmpDir}"`, { stdio: 'inherit' });
    } else {
      execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: 'inherit' });
    }

    cpSync(join(tmpDir, binarySubpath), sidecarPath);
    chmodSync(sidecarPath, 0o755);
    console.log(`✅ Sidecar binary saved: ${sidecarPath}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 3. Generate icons if missing
const bundleIcons = ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.icns', 'icon.ico'];
const needsIcons = bundleIcons.some((icon) => !existsSync(join(iconsDir, icon)));

if (needsIcons && existsSync(join(iconsDir, 'icon.png'))) {
  console.log('🎨 Generating icons...');
  const tmpIcon = join(tmpdir(), `icon-${Date.now()}.png`);
  cpSync(join(iconsDir, 'icon.png'), tmpIcon);
  execSync(`pnpm --filter=@anima/native exec tauri icon "${join(iconsDir, 'icon.png')}"`, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  cpSync(tmpIcon, join(iconsDir, 'icon.png'));
  rmSync(tmpIcon, { force: true });
  rmSync(join(iconsDir, 'android'), { recursive: true, force: true });
  rmSync(join(iconsDir, 'ios'), { recursive: true, force: true });
}

// 4. Build backend
console.log('📦 Building backend...');
execSync('vp run --cache --filter @anima/backend build:native', {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_MANAGED_POD: 'true',
  },
});

// 5. Copy backend bundle to native resources
console.log('📂 Copying backend resources to native app...');
rmSync(resourceBackendDir, { recursive: true, force: true });
mkdirSync(resourceBackendDir, { recursive: true });
cpSync(join(repoRoot, 'apps/backend/dist'), resourceBackendDir, { recursive: true });

// Ensure native dist directory exists (configured as frontendDist in tauri.conf.json)
mkdirSync(join(rootDir, 'dist'), { recursive: true });

console.log('✅ Preparations complete.');
