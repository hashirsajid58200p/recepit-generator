# Receipt Studio Architecture

## 1. Overview

Receipt Studio is a zero-dependency, client-side web application that renders payment receipts onto an HTML5 `<canvas>` and exports full-resolution PNG files directly in the browser (`canvas.toBlob('image/png')` + download / Web Share API).

All source files live in `receipt-studio/src/` and canonical static assets live in `receipt-studio/public/assets/`. A lightweight Node.js build step compiles them into `receipt-studio/dist/`, which acts as the self-contained static bundle served both locally and in production.

---

## 2. Build & Verification Flow

```text
receipt-studio/src/
  ├── index.html          ──copy──▶ dist/index.html
  ├── styles/tokens.css   ─┐
  │                        ├─concat─▶ dist/style.css
  ├── styles/main.css     ─┘
  └── scripts/app.js      ──copy──▶ dist/app.js

receipt-studio/public/assets/ ──sync──▶ dist/assets/
```

- **`scripts/build.mjs`**:
  - Validates that `src/index.html`, `src/styles/tokens.css`, `src/styles/main.css`, `src/scripts/app.js`, and all 11 required files in `public/assets/` exist and are non-empty.
  - Copies `src/index.html` to `dist/index.html` and `src/scripts/app.js` to `dist/app.js`.
  - Concatenates `src/styles/tokens.css` followed by `src/styles/main.css` into `dist/style.css`.
  - Mirrors `public/assets/` into `dist/assets/`, removing any stale files in `dist/assets/`.
- **`scripts/dev.mjs`**:
  - Serves `dist/` using Node's built-in `node:http` module on `http://localhost:${PORT || 4173}`.
  - Maps MIME types cleanly for `.html`, `.css`, `.js`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.ttf`, `.txt`, `.svg`, and `.json`, while preventing path traversal outside `dist/`.
- **`scripts/check.mjs`**:
  - Runs `node --check` on `scripts/*.mjs`, `src/scripts/app.js`, and `dist/app.js`.
  - Validates `.openai/hosting.json` points to `"dist"`.
  - Verifies SHA-256 parity for all 11 assets between `public/assets/` and `dist/assets/`.
  - Confirms required DOM IDs, form field names, `data-*` selectors, `@font-face` rules, and canvas rendering symbols are present in both `src/` and `dist/`.

---

## 3. Asset Ownership

`receipt-studio/public/assets/` is the single source of truth for all runtime fonts, template backgrounds, and default logos. Duplicate root asset folders (`receipt1 logos/` and `receipt2 logos/`) were verified byte-for-byte via SHA-256 and consolidated into `public/assets/`.

| Asset File | Role | Consumer |
| :--- | :--- | :--- |
| `Arial.ttf` | Regular UI/receipt body font (`ReceiptArial`, weight `400`) | CSS `@font-face` + Canvas |
| `Arial-Bold.ttf` | Bold receipt headings/IDs (`ReceiptArial`, weight `700`) | CSS `@font-face` + Canvas |
| `Roboto.ttf` | Variable-weight amount & Template 2 font (`ReceiptAmount`, weight `100 900`) | CSS `@font-face` + Canvas |
| `Roboto-LICENSE.txt` | Apache-2.0 / bundled license notice for `Roboto.ttf` | Distribution compliance |
| `template.png` | Base background raster for Template 1 (`1080×1574`) | Canvas (`render()`) |
| `template2.png` | Base background raster for Template 2 (`1003×2460`) | Canvas (`renderSecond()`) |
| `logo1.webp` | Template 1 default sender (`from`) logo | Canvas (`logos.from`) |
| `logo2.jpeg` | Template 1 default recipient (`to`) logo | Canvas (`logos.to`) |
| `logo3.png` | Template 1 default payment processor (`processor`) mark | Canvas (`logos.processor`) |
| `receipt2-logo1.png` | Template 2 default header (`from`) logo | Canvas (`logoSets[2].from`) |
| `receipt2-logo2.jpeg` | Template 2 default recipient (`to`) logo | Canvas (`logoSets[2].to`) |

All custom user-uploaded logos (`[data-logo="from" | "to" | "processor"]`) accept `image/png`, `image/jpeg`, or `image/webp` entirely in memory via `URL.createObjectURL()` without network uploads.

---

## 4. Canvas Template Specifications

### Template 1 — Standard Transfer (`1080×1574`)

- **Canvas Dimensions**: `1080 × 1574` px (`assets/template.png`)
- **Primary Amount**: `Rs. <amount>` formatted with `en-US` grouping (`maximumFractionDigits: 2`), `92px` bold `ReceiptAmount`, `#674ac2`, centered at `(540, 410)` (max width `950`).
- **Timestamp**: `Paid at <h:mm AM/PM> on <DD Mon YY>`, `40px` regular `ReceiptArial`, `#777`, centered at `(540, 494)`.
- **Sender Block**:
  - Name (`nameText`): up to 2 wrapped lines with `…` truncation, `44px` bold `ReceiptArial`, `#222`, left-aligned at `(211, 822)`, max width `300`.
  - Masked number: `*<senderNumber>` (4 digits), `40px` `ReceiptArial`, `#777`, at `(211, 936)`.
  - Circular logo (`from`): `108×108` clipped circle at `(79, 775)`.
- **Recipient Block**:
  - Name (`nameText`): up to 2 wrapped lines, `44px` bold `ReceiptArial`, `#222`, left-aligned at `(726, 822)`, max width `278`.
  - Account/Reference (`recipientNumber`): `40px` `ReceiptArial`, `#777`, at `(726, 936)` when name wraps to 2 lines or `(726, 877)` for 1 line.
  - Circular logo (`to`): `108×108` clipped circle at `(593, 775)`.
- **Transaction ID**: 9-digit random integer (`100000000`–`999999999` via `crypto.getRandomValues`), `44px` bold `ReceiptArial`, `#222`, right-aligned at `(1000, 1194)`.
- **Processor Logo (`processor`)**: Aspect-fit inside `(590, 1335, 310, 125)`.

### Template 2 — Bank / Bill Payment (`1003×2460`)

- **Canvas Dimensions**: `1003 × 2460` px (`assets/template2.png`), using layout coordinate scale `scale = 1003 / 835`.
- **CSS Coupling**: `.canvas-wrap:has(canvas[height="2460"])` removes outer border radius and sets a white background behind the proof frame.
- **Primary Amount**: `PKR <amount>` (`86 * scale` bold `ReceiptAmount`), centered horizontally across `(1003 - total) / 2` at `y = 426 * scale`, with `PKR ` in `#637781` and the numeric value in `#159eaa`.
- **Sender Details**:
  - Sender name (whitespace-normalized), `32 * scale` `ReceiptAmount`, `#7c858a`, centered at `x = 417.5 * scale, y = 822 * scale`.
  - Account type (`accountType`), `36 * scale`, `#29b7b5`, at `y = 877 * scale`.
  - Account number (`Account No: <accountNumber>`), `32 * scale`, `#929b9d`, at `y = 928 * scale`.
- **Recipient Details**:
  - Recipient name (`recipient`), `32 * scale`, `#7c858a`, at `y = 1486 * scale`.
  - Recipient type (`recipientType`), `36 * scale`, `#29b7b5`, at `y = 1540 * scale`.
  - Consumer number (`Consumer No: <recipientNumber>`), `32 * scale`, `#929b9d`, at `y = 1594 * scale`.
- **Metadata & Reference**:
  - Date (`Date: DD/MM/YYYY`) at `(207 * scale, 1717 * scale)` and Time (`Time: HH:MM:SS`) at `(630 * scale, 1717 * scale)`.
  - Purpose (`Purpose of payment: <purpose>`) at `(417.5 * scale, 1815 * scale)`.
  - Transaction ID (`Transaction ID: <transaction>`, 7-digit `1000000`–`9999999`) in `#29b7b5` at `(417.5 * scale, 2012 * scale)`.
- **Logos**:
  - Header logo (`from`): aspect-fit inside `(168 * scale, 38 * scale, 497 * scale, 136 * scale)`.
  - Recessed recipient badge (`to` via `recessedRecipientLogo`): `138 * scale` circular clip at `(349 * scale, 1280 * scale)` with `#fff` fill, 10% inset logo, and dual radial shading gradients.

### Draft & Export Behavior

- Switching templates saves the current form values into `templateDrafts[activeTemplate]` and restores any prior draft for the target template (initializing Template 2 defaults on first switch).
- Export generates a PNG named `receipt-${canvas.width}x${canvas.height}.png` and uses `navigator.share({ files: [file] })` when sharing is requested and supported, falling back to `download()`.

---

## 5. Static Deployment (`.openai/hosting.json`)

Deployment metadata resides in `receipt-studio/.openai/hosting.json`:

```json
{
  "project_id": "appgprj_6acf1fe5999c8191b9363082aa147210",
  "static": {
    "directory": "dist"
  }
}
```

- The hosting target serves `receipt-studio/dist/` directly as the web root (`/` -> `dist/index.html`, `/style.css`, `/app.js`, `/assets/*`).
- All font and asset references inside `dist/style.css` and `dist/app.js` are relative (`assets/...`), requiring no server-side routing or build-time path rewriting.
- `receipt-studio/.git` and `receipt-studio/.openai/hosting.json` are preserved intact across builds.
