import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const srcDir = join(rootDir, 'src');
const publicAssetsDir = join(rootDir, 'public', 'assets');
const distDir = join(rootDir, 'dist');
const distAssetsDir = join(distDir, 'assets');

const REQUIRED_SRC_FILES = [
  'index.html',
  join('styles', 'tokens.css'),
  join('styles', 'main.css'),
  join('scripts', 'app.js'),
];

const REQUIRED_ASSETS = [
  'Arial.ttf',
  'Arial-Bold.ttf',
  'Roboto.ttf',
  'Roboto-LICENSE.txt',
  'template.png',
  'template2.png',
  'logo1.webp',
  'logo2.jpeg',
  'logo3.png',
  'receipt2-logo1.png',
  'receipt2-logo2.jpeg',
];

function assertNonEmptyFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing required ${label}: ${filePath}`);
  }
  const stats = statSync(filePath);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`Expected non-empty file for ${label}: ${filePath}`);
  }
}

function validateInputs() {
  for (const relPath of REQUIRED_SRC_FILES) {
    assertNonEmptyFile(join(srcDir, relPath), `source file src/${relPath}`);
  }

  if (!existsSync(publicAssetsDir)) {
    throw new Error(`Missing public assets directory: ${publicAssetsDir}`);
  }

  for (const asset of REQUIRED_ASSETS) {
    assertNonEmptyFile(join(publicAssetsDir, asset), `public asset public/assets/${asset}`);
  }
}

function syncAssets() {
  mkdirSync(distAssetsDir, { recursive: true });

  const sourceEntries = readdirSync(publicAssetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

  const sourceSet = new Set(sourceEntries);

  for (const entry of readdirSync(distAssetsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !sourceSet.has(entry.name)) {
      rmSync(join(distAssetsDir, entry.name), { recursive: true, force: true });
    }
  }

  for (const name of sourceEntries) {
    copyFileSync(join(publicAssetsDir, name), join(distAssetsDir, name));
  }

  return sourceEntries.length;
}

function build() {
  validateInputs();
  mkdirSync(distDir, { recursive: true });

  copyFileSync(join(srcDir, 'index.html'), join(distDir, 'index.html'));

  const tokensCss = readFileSync(join(srcDir, 'styles', 'tokens.css'), 'utf8').trimEnd();
  const mainCss = readFileSync(join(srcDir, 'styles', 'main.css'), 'utf8').trimStart();
  writeFileSync(join(distDir, 'style.css'), `${tokensCss}\n\n${mainCss}`, 'utf8');

  copyFileSync(join(srcDir, 'scripts', 'app.js'), join(distDir, 'app.js'));

  const assetCount = syncAssets();
  console.log(
    `Built dist/ successfully (index.html, style.css, app.js, ${assetCount} assets).`
  );
}

try {
  build();
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
