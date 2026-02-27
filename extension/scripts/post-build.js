/**
 * Post-build script: copies manifest.json and icons into dist/
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const iconsDir = join(root, 'icons');
const distIconsDir = join(dist, 'icons');

// Copy manifest.dist.json → dist/manifest.json
const manifestSrc = join(root, 'manifest.dist.json');
const manifestDest = join(dist, 'manifest.json');
copyFileSync(manifestSrc, manifestDest);
console.log('✔ Copied manifest.dist.json → dist/manifest.json');

// Copy icons
if (!existsSync(distIconsDir)) {
  mkdirSync(distIconsDir, { recursive: true });
}

const iconFiles = readdirSync(iconsDir).filter(f => f.endsWith('.png'));
for (const icon of iconFiles) {
  copyFileSync(join(iconsDir, icon), join(distIconsDir, icon));
}
console.log(`✔ Copied ${iconFiles.length} icon(s) → dist/icons/`);

console.log('✔ Post-build complete! Load dist/ as Chrome extension.');
