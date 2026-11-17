import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const srcDir = join(rootDir, 'src');
const publicAssetsDir = join(rootDir, 'public', 'assets');
const distDir = join(rootDir, 'dist');
const distAssetsDir = join(distDir, 'assets');
const distScriptsDir = join(distDir, 'scripts');

const REQUIRED_HTML_PATTERNS = [
  { label: '#template-list container', regex: /id=["']template-list["']/ },
  { label: '#details form', regex: /id=["']details["']/ },
  { label: '#extra-fields container', regex: /id=["']extra-fields["']/ },
  { label: '#logo-uploads container', regex: /id=["']logo-uploads["']/ },
  { label: '#randomize button', regex: /id=["']randomize["']/ },
  { label: '#transaction-hint', regex: /id=["']transaction-hint["']/ },
  { label: '#logo-hint', regex: /id=["']logo-hint["']/ },
  { label: '#receipt canvas', regex: /id=["']receipt["']/ },
  { label: '#save button', regex: /id=["']save["']/ },
  { label: '#share button', regex: /id=["']share["']/ },
  { label: '#status region', regex: /id=["']status["']/ },
  { label: '.dimensions element', regex: /class=["'][^"']*\bdimensions\b[^"']*["']/ },
  { label: 'style.css link', regex: /href=["']style\.css["']/ },
  { label: 'scripts/app.js module script', regex: /type=["']module["'][^>]*src=["']scripts\/app\.js["']/ },
];

const REQUIRED_CSS_PATTERNS = [
  { label: 'ReceiptArial @font-face', regex: /font-family:\s*['"]?ReceiptArial['"]?/ },
  { label: 'ReceiptAmount @font-face', regex: /font-family:\s*['"]?ReceiptAmount['"]?/ },
  { label: 'Arial.ttf font URL', regex: /assets\/fonts\/Arial\.ttf/ },
  { label: 'Arial-Bold.ttf font URL', regex: /assets\/fonts\/Arial-Bold\.ttf/ },
  { label: 'Roboto.ttf font URL', regex: /assets\/fonts\/Roboto\.ttf/ },
  { label: 'scrollbar-color rule', regex: /scrollbar-color:/ },
  { label: 'prefers-contrast media rule', regex: /prefers-contrast:\s*more/ },
  { label: 'flat-light canvas frame rule', regex: /\[data-frame=["']flat-light["']\]/ },
];

const failures = [];

function checkFileExists(filePath, label) {
  if (!existsSync(filePath) || !statSync(filePath).isFile() || statSync(filePath).size === 0) {
    failures.push(`Missing or empty ${label}: ${filePath}`);
    return false;
  }
  return true;
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function collectFiles(dir, baseDir = dir) {
  if (!existsSync(dir)) return [];
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

function checkPatterns(content, patterns, targetLabel) {
  for (const { label, regex } of patterns) {
    if (!regex.test(content)) {
      failures.push(`${targetLabel} missing ${label}`);
    }
  }
}

function checkSyntax(filePath, label) {
  try {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString().trim() : error.message;
    failures.push(`Syntax check failed for ${label}: ${stderr}`);
  }
}

for (const scriptName of ['build.mjs', 'dev.mjs', 'check.mjs']) {
  const scriptPath = join(__dirname, scriptName);
  if (checkFileExists(scriptPath, `scripts/${scriptName}`)) {
    checkSyntax(scriptPath, `scripts/${scriptName}`);
  }
}

const hostingPath = join(rootDir, '.openai', 'hosting.json');
if (checkFileExists(hostingPath, '.openai/hosting.json')) {
  try {
    const hosting = JSON.parse(readFileSync(hostingPath, 'utf8'));
    if (hosting?.static?.directory !== 'dist') {
      failures.push(`.openai/hosting.json static.directory must be "dist", got ${JSON.stringify(hosting?.static?.directory)}`);
    }
  } catch (error) {
    failures.push(`Invalid JSON in .openai/hosting.json: ${error.message}`);
  }
}

const publicAssetFiles = collectFiles(publicAssetsDir);
if (publicAssetFiles.length === 0) {
  failures.push('public/assets/ has no files');
}
for (const relPath of publicAssetFiles) {
  const pubPath = join(publicAssetsDir, relPath);
  const distPath = join(distAssetsDir, relPath);
  const pubOk = checkFileExists(pubPath, `public/assets/${relPath}`);
  const distOk = checkFileExists(distPath, `dist/assets/${relPath}`);
  if (pubOk && distOk && sha256(pubPath) !== sha256(distPath)) {
    failures.push(`SHA-256 mismatch between public/assets/${relPath} and dist/assets/${relPath}`);
  }
}

const srcScriptFiles = collectFiles(join(srcDir, 'scripts'));
if (srcScriptFiles.length === 0) {
  failures.push('src/scripts/ has no files');
}
for (const relPath of srcScriptFiles) {
  const srcScriptPath = join(srcDir, 'scripts', relPath);
  const distScriptPath = join(distScriptsDir, relPath);
  if (checkFileExists(srcScriptPath, `src/scripts/${relPath}`)) {
    checkSyntax(srcScriptPath, `src/scripts/${relPath}`);
  }
  if (checkFileExists(distScriptPath, `dist/scripts/${relPath}`)) {
    checkSyntax(distScriptPath, `dist/scripts/${relPath}`);
  }
  if (existsSync(srcScriptPath) && existsSync(distScriptPath) && sha256(srcScriptPath) !== sha256(distScriptPath)) {
    failures.push(`SHA-256 mismatch between src/scripts/${relPath} and dist/scripts/${relPath}`);
  }
}

const srcHtmlPath = join(srcDir, 'index.html');
const distHtmlPath = join(distDir, 'index.html');
const srcTokensPath = join(srcDir, 'styles', 'tokens.css');
const srcMainPath = join(srcDir, 'styles', 'main.css');
const distCssPath = join(distDir, 'style.css');

if (checkFileExists(srcHtmlPath, 'src/index.html')) {
  checkPatterns(readFileSync(srcHtmlPath, 'utf8'), REQUIRED_HTML_PATTERNS, 'src/index.html');
}
if (checkFileExists(distHtmlPath, 'dist/index.html')) {
  checkPatterns(readFileSync(distHtmlPath, 'utf8'), REQUIRED_HTML_PATTERNS, 'dist/index.html');
}

const hasSrcTokens = checkFileExists(srcTokensPath, 'src/styles/tokens.css');
const hasSrcMain = checkFileExists(srcMainPath, 'src/styles/main.css');
if (hasSrcTokens && hasSrcMain) {
  const combinedSrcCss = `${readFileSync(srcTokensPath, 'utf8')}\n${readFileSync(srcMainPath, 'utf8')}`;
  checkPatterns(combinedSrcCss, REQUIRED_CSS_PATTERNS, 'src/styles/*');
}

if (checkFileExists(distCssPath, 'dist/style.css')) {
  checkPatterns(readFileSync(distCssPath, 'utf8'), REQUIRED_CSS_PATTERNS, 'dist/style.css');
}

if (failures.length > 0) {
  console.error('Checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `All checks passed: ${publicAssetFiles.length} assets, ${srcScriptFiles.length} JS modules, and src/ -> dist/ contracts verified.`
);
