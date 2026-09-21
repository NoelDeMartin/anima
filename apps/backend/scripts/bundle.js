import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '..');
const repoRoot = resolve(backendDir, '../..');
const distDir = join(backendDir, 'dist');
const tmpDir = mkdtempSync(join(tmpdir(), 'anima-backend-bundle-'));

if (!process.env.VP_RUN) {
  console.error("❌ Error: bundle.js must be invoked via 'vp run'");
  process.exit(1);
}

try {
  // 1. Build backend
  execSync('vp build', { cwd: backendDir, stdio: 'inherit' });

  // 2. Deploy production dependencies
  execSync(`pnpm --filter=@anima/backend deploy "${tmpDir}" --prod --legacy --config.node-linker=hoisted`, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  // 3. Copy compiled backend dist into deployed directory
  cpSync(distDir, tmpDir, { recursive: true });

  // 4. Copy built frontend into public directory
  const publicDir = join(tmpDir, 'public');
  const frontendDistDir = join(repoRoot, 'apps/frontend/dist');
  mkdirSync(publicDir, { recursive: true });
  cpSync(frontendDistDir, publicDir, { recursive: true });

  // 5. Remove unneeded source files left by deploy
  for (const name of ['src', 'apps', 'scripts', 'vite.config.ts', 'tsconfig.json']) {
    rmSync(join(tmpDir, name), { recursive: true, force: true });
  }

  // 6. Replace dist with complete bundle
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  cpSync(tmpDir, distDir, { recursive: true });
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
