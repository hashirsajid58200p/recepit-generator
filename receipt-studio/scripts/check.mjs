import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const srcDir = join(rootDir, 'src');
const publicAssetsDir = join(rootDir, 'public', 'assets');
const distDir = join(rootDir, 'dist');
const distAssetsDir = join(distDir, 'assets');

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

const REQUIRED_HTML_PATTERNS = [
  { label: '#details form', regex: /id=["']details["']/ },
  { label: '#randomize button', regex: /id=["']randomize["']/ },
  { label: '#transaction-hint', regex: /id=["']transaction-hint["']/ },
  { label: '#logo-hint', regex: /id=["']logo-hint["']/ },
  { label: '#from-logo-label', regex: /id=["']from-logo-label["']/ },
  { label: '#receipt canvas', regex: /id=["']receipt["']/ },
  { label: 'canvas width="1080"', regex: /width=["']1080["']/ },
  { label: 'canvas height="1574"', regex: /height=["']1574["']/ },
  { label: '#save button', regex: /id=["']save["']/ },
  { label: '#share button', regex: /id=["']share["']/ },
  { label: '#status region', regex: /id=["']status["']/ },
  { label: '[data-template="1"]', regex: /data-template=["']1["']/ },
  { label: '[data-template="2"]', regex: /data-template=["']2["']/ },
  { label: '[data-only="1"]', regex: /data-only=["']1["']/ },
  { label: '[data-only="2"]', regex: /data-only=["']2["']/ },
  { label: '[data-logo="from"]', regex: /data-logo=["']from["']/ },
  { label: '[data-logo="to"]', regex: /data-logo=["']to["']/ },
  { label: '[data-logo="processor"]', regex: /data-logo=["']processor["']/ },
  { label: '[data-clear="from"]', regex: /data-clear=["']from["']/ },
  { label: '[data-clear="to"]', regex: /data-clear=["']to["']/ },
  { label: '[data-clear="processor"]', regex: /data-clear=["']processor["']/ },
  { label: '.dimensions element', regex: /class=["'][^"']*\bdimensions\b[^"']*["']/ },
  { label: 'field name="amount"', regex: /name=["']amount["']/ },
  { label: 'field name="time"', regex: /name=["']time["']/ },
  { label: 'field name="date"', regex: /name=["']date["']/ },
  { label: 'field name="sender"', regex: /name=["']sender["']/ },
  { label: 'field name="recipient"', regex: /name=["']recipient["']/ },
  { label: 'field name="senderNumber"', regex: /name=["']senderNumber["']/ },
  { label: 'field name="recipientNumber"', regex: /name=["']recipientNumber["']/ },
  { label: 'field name="accountType"', regex: /name=["']accountType["']/ },
  { label: 'field name="accountNumber"', regex: /name=["']accountNumber["']/ },
  { label: 'field name="recipientType"', regex: /name=["']recipientType["']/ },
  { label: 'field name="purpose"', regex: /name=["']purpose["']/ },
  { label: 'field name="transaction"', regex: /name=["']transaction["']/ },
  { label: 'style.css link', regex: /href=["']style\.css["']/ },
  { label: 'app.js script', regex: /src=["']app\.js["']/ },
];

const REQUIRED_CSS_PATTERNS = [
  { label: 'ReceiptArial @font-face', regex: /font-family:\s*['"]?ReceiptArial['"]?/ },
  { label: 'ReceiptAmount @font-face', regex: /font-family:\s*['"]?ReceiptAmount['"]?/ },
  { label: 'Arial.ttf font URL', regex: /assets\/Arial\.ttf/ },
  { label: 'Arial-Bold.ttf font URL', regex: /assets\/Arial-Bold\.ttf/ },
  { label: 'Roboto.ttf font URL', regex: /assets\/Roboto\.ttf/ },
  {
    label: '.canvas-wrap:has(canvas[height="2460"])',
    regex: /\.canvas-wrap:has\(\s*canvas\[height=["']2460["']\]\s*\)/,
  },
];

const REQUIRED_JS_PATTERNS = [
  { label: 'ReceiptArial font usage', regex: /ReceiptArial/ },
  { label: 'ReceiptAmount font usage', regex: /ReceiptAmount/ },
  { label: 'render() function', regex: /function\s+render\s*\(/ },
  { label: 'renderSecond() function', regex: /function\s+renderSecond\s*\(/ },
  { label: 'recessedRecipientLogo() function', regex: /function\s+recessedRecipientLogo\s*\(/ },
  { label: 'randomTransaction() function', regex: /function\s+randomTransaction\s*\(/ },
  { label: 'selectTemplate() function', regex: /function\s+selectTemplate\s*\(/ },
  { label: 'exportReceipt() function', regex: /async\s+function\s+exportReceipt\s*\(/ },
  { label: 'nameText() function', regex: /function\s+nameText\s*\(/ },
  { label: 'templateDrafts state', regex: /\btemplateDrafts\b/ },
  { label: 'logoSets state', regex: /\blogoSets\b/ },
  { label: 'assets/template.png reference', regex: /assets\/template\.png/ },
  { label: 'assets/template2.png reference', regex: /assets\/template2\.png/ },
  { label: 'logo1.webp reference', regex: /logo1\.webp/ },
  { label: 'logo2.jpeg reference', regex: /logo2\.jpeg/ },
  { label: 'logo3.png reference', regex: /logo3\.png/ },
  { label: 'receipt2-logo1.png reference', regex: /receipt2-logo1\.png/ },
  { label: 'receipt2-logo2.jpeg reference', regex: /receipt2-logo2\.jpeg/ },
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

// 1. Check scripts syntax
for (const scriptName of ['build.mjs', 'dev.mjs', 'check.mjs']) {
  const scriptPath = join(__dirname, scriptName);
  if (checkFileExists(scriptPath, `scripts/${scriptName}`)) {
    checkSyntax(scriptPath, `scripts/${scriptName}`);
  }
}

// 2. Check hosting.json
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

// 3. Check assets in public/assets/ and dist/assets/
for (const asset of REQUIRED_ASSETS) {
  const pubPath = join(publicAssetsDir, asset);
  const distPath = join(distAssetsDir, asset);
  const pubOk = checkFileExists(pubPath, `public/assets/${asset}`);
  const distOk = checkFileExists(distPath, `dist/assets/${asset}`);
  if (pubOk && distOk && sha256(pubPath) !== sha256(distPath)) {
    failures.push(`SHA-256 mismatch between public/assets/${asset} and dist/assets/${asset}`);
  }
}

// 4. Check src/ and dist/ HTML, CSS, JS
const srcHtmlPath = join(srcDir, 'index.html');
const distHtmlPath = join(distDir, 'index.html');
const srcTokensPath = join(srcDir, 'styles', 'tokens.css');
const srcMainPath = join(srcDir, 'styles', 'main.css');
const distCssPath = join(distDir, 'style.css');
const srcJsPath = join(srcDir, 'scripts', 'app.js');
const distJsPath = join(distDir, 'app.js');

if (checkFileExists(srcHtmlPath, 'src/index.html')) {
  const srcHtml = readFileSync(srcHtmlPath, 'utf8');
  checkPatterns(srcHtml, REQUIRED_HTML_PATTERNS, 'src/index.html');
  const emMatches = srcHtml.match(/data-template=["'][12]["'][\s\S]*?<em>[\s\S]*?<\/em>/g);
  if (!emMatches || emMatches.length < 2) {
    failures.push('src/index.html template buttons must each contain an <em> element');
  }
}

if (checkFileExists(distHtmlPath, 'dist/index.html')) {
  const distHtml = readFileSync(distHtmlPath, 'utf8');
  checkPatterns(distHtml, REQUIRED_HTML_PATTERNS, 'dist/index.html');
  const emMatches = distHtml.match(/data-template=["'][12]["'][\s\S]*?<em>[\s\S]*?<\/em>/g);
  if (!emMatches || emMatches.length < 2) {
    failures.push('dist/index.html template buttons must each contain an <em> element');
  }
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

if (checkFileExists(srcJsPath, 'src/scripts/app.js')) {
  checkSyntax(srcJsPath, 'src/scripts/app.js');
  checkPatterns(readFileSync(srcJsPath, 'utf8'), REQUIRED_JS_PATTERNS, 'src/scripts/app.js');
}

if (checkFileExists(distJsPath, 'dist/app.js')) {
  checkSyntax(distJsPath, 'dist/app.js');
  checkPatterns(readFileSync(distJsPath, 'utf8'), REQUIRED_JS_PATTERNS, 'dist/app.js');
}

if (failures.length > 0) {
  console.error('Checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `All checks passed: ${REQUIRED_ASSETS.length} assets verified, JS syntax valid, src/ and dist/ contracts intact.`
);
