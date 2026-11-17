# Receipt Studio Architecture

## 1. Overview

Receipt Studio is a zero-dependency, client-side web application that renders payment receipts onto an HTML5 `<canvas>` and exports full-resolution PNG files directly in the browser (`canvas.toBlob('image/png')` + download / Web Share API).

Each receipt template is self-contained with its own module in `src/scripts/templates/<id>.js` and its own independent background and default logo images in `public/assets/templates/<id>/`.

## 2. Build & Verification Flow

- **`scripts/build.mjs`**:
  - Validates core source files, bundled fonts (`public/assets/fonts/`), and template asset directories (`public/assets/templates/`).
  - Copies `src/index.html` to `dist/index.html`.
  - Concatenates `src/styles/tokens.css` + `src/styles/main.css` into `dist/style.css`.
  - Mirrors `src/scripts/` into `dist/scripts/` and `public/assets/` into `dist/assets/`.
- **`scripts/check.mjs`**:
  - Runs `node --check` on `scripts/*.mjs`, `src/scripts/**/*.js`, and `dist/scripts/**/*.js`.
  - Verifies SHA-256 parity for all files between `public/assets/` and `dist/assets/`, and between `src/scripts/` and `dist/scripts/`.
  - Confirms required DOM containers, `@font-face` rules, scrollbar styling, and `.openai/hosting.json`.
- **`scripts/dev.mjs`**:
  - Serves `dist/` locally on `http://localhost:${PORT || 4173}`.

## 3. Asset Ownership

- `public/assets/fonts/`: `Arial.ttf`, `Arial-Bold.ttf`, `Roboto.ttf`, `Roboto-LICENSE.txt`
- `public/assets/templates/purple-transfer/`: `background.png` (`1080×1574`), `from.webp`, `to.jpeg`, `processor.png`
- `public/assets/templates/teal-bill/`: `background.png` (`1003×2460`), `from.png`, `to.jpeg`

All custom uploaded logos stay in memory per template (`logoSets[template.id]`) via `URL.createObjectURL()`, keeping templates isolated from each other.
