import { existsSync, readdirSync, renameSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundleDir = process.env.TAURI_BUNDLE_DIR
  ? resolve(process.env.TAURI_BUNDLE_DIR)
  : resolve(__dirname, '../src-tauri/target/release/bundle');

const BUNDLE_EXTENSIONS = new Set(['.appimage', '.dmg', '.exe', '.deb', '.rpm']);

export function formatBundleName(filename) {
  const ext = extname(filename);
  let base = ext ? filename.slice(0, -ext.length) : filename;

  base = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const formattedExt = ext
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '-');

  return base + formattedExt;
}

export function formatBundles(targetBundleDir = bundleDir) {
  if (!existsSync(targetBundleDir)) {
    console.log(`ℹ️ Bundle directory does not exist: ${targetBundleDir}`);
    return 0;
  }

  let renamedCount = 0;

  for (const targetEntry of readdirSync(targetBundleDir, { withFileTypes: true })) {
    if (!targetEntry.isDirectory() || targetEntry.name === 'macos' || targetEntry.name.endsWith('.app')) {
      continue;
    }

    const targetDir = join(targetBundleDir, targetEntry.name);
    for (const fileEntry of readdirSync(targetDir, { withFileTypes: true })) {
      if (!fileEntry.isFile()) {
        continue;
      }

      const ext = extname(fileEntry.name).toLowerCase();
      if (!BUNDLE_EXTENSIONS.has(ext)) {
        continue;
      }

      const formattedName = formatBundleName(fileEntry.name);
      if (formattedName !== fileEntry.name) {
        console.log(`Renaming bundle binary: ${fileEntry.name} -> ${formattedName}`);
        renameSync(join(targetDir, fileEntry.name), join(targetDir, formattedName));
        renamedCount++;
      }
    }
  }

  return renamedCount;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const totalRenamed = formatBundles();
  if (totalRenamed === 0) {
    console.log('ℹ️ No bundle binaries needed renaming.');
  } else {
    console.log(`✅ Successfully formatted ${totalRenamed} bundle ${totalRenamed === 1 ? 'binary' : 'binaries'}.`);
  }
}
