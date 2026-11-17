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
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const srcDir = join(rootDir, 'src');
const publicAssetsDir = join(rootDir, 'public', 'assets');
const distDir = join(rootDir, 'dist');
const distAssetsDir = join(distDir, 'assets');
const distScriptsDir = join(distDir, 'scripts');

const REQUIRED_SRC_FILES = [
  'index.html',
  join('styles', 'tokens.css'),
  join('styles', 'main.css'),
  join('scripts', 'app.js'),
  join('scripts', 'canvas-utils.js'),
  join('scripts', 'templates', 'index.js'),
];

const REQUIRED_FONTS = [
  'Arial.ttf',
  'Arial-Bold.ttf',
  'Roboto.ttf',
  'Roboto-LICENSE.txt',
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

function collectFiles(dir, baseDir = dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      files.push(relative(baseDir, fullPath));
    }
  }
  return files.sort();
}

function syncDirectory(sourceDir, targetDir) {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  const files = collectFiles(sourceDir);
  for (const relPath of files) {
    const srcFile = join(sourceDir, relPath);
    const destFile = join(targetDir, relPath);
    mkdirSync(dirname(destFile), { recursive: true });
    copyFileSync(srcFile, destFile);
  }
  return files.length;
}

function validateInputs() {
  for (const relPath of REQUIRED_SRC_FILES) {
    assertNonEmptyFile(join(srcDir, relPath), `source file src/${relPath}`);
  }

  const fontsDir = join(publicAssetsDir, 'fonts');
  for (const fontFile of REQUIRED_FONTS) {
    assertNonEmptyFile(join(fontsDir, fontFile), `font public/assets/fonts/${fontFile}`);
  }

  const templatesAssetsDir = join(publicAssetsDir, 'templates');
  if (!existsSync(templatesAssetsDir) || readdirSync(templatesAssetsDir).length === 0) {
    throw new Error(`Missing template asset folders under ${templatesAssetsDir}`);
  }
}

function build() {
  validateInputs();
  mkdirSync(distDir, { recursive: true });

  copyFileSync(join(srcDir, 'index.html'), join(distDir, 'index.html'));

  const tokensCss = readFileSync(join(srcDir, 'styles', 'tokens.css'), 'utf8').trimEnd();
  const mainCss = readFileSync(join(srcDir, 'styles', 'main.css'), 'utf8').trimStart();
  writeFileSync(join(distDir, 'style.css'), `${tokensCss}\n\n${mainCss}`, 'utf8');

  const scriptCount = syncDirectory(join(srcDir, 'scripts'), distScriptsDir);
  const assetCount = syncDirectory(publicAssetsDir, distAssetsDir);

  console.log(
    `Built dist/ successfully (index.html, style.css, ${scriptCount} scripts, ${assetCount} assets).`
  );
}

try {
  build();
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
