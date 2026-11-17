# Receipt Studio

Client-side payment receipt generator and static PNG export workbench.

## Project Structure

```text
Recepit Generator/
├── README.md
├── docs/
│   └── architecture.md        # Asset ownership, canvas specs, build & hosting flow
└── receipt-studio/            # Deployable application root
    ├── .openai/hosting.json   # Static deployment config (serves dist/)
    ├── package.json           # Zero-dependency Node.js scripts (dev, build, check)
    ├── public/
    │   └── assets/            # Canonical source-of-truth fonts, templates, and logos (11 files)
    ├── scripts/
    │   ├── build.mjs          # Validates src/ + public/assets/ and builds dist/
    │   ├── check.mjs          # Runs syntax, DOM/CSS/JS contract, and asset checks
    │   └── dev.mjs            # Local HTTP static server for dist/
    ├── src/
    │   ├── index.html         # Application markup
    │   ├── styles/
    │   │   ├── tokens.css     # Theme, spacing, typography, and motion tokens
    │   │   └── main.css       # Layout and component styles
    │   └── scripts/
    │       └── app.js         # Form state, asset preloading, canvas rendering, PNG export
    └── dist/                  # Built static site served by .openai/hosting.json
        ├── index.html
        ├── style.css
        ├── app.js
        └── assets/
```

## Prerequisites

- **Node.js** `>= 18` (tested on Node `v24.22.3`)
- Zero external npm dependencies (uses Node.js built-in modules only)

## Quick Start

Run all commands from inside `receipt-studio/`:

```bash
cd receipt-studio

# 1. Build dist/ from src/ and public/assets/
npm run build

# 2. Verify JS syntax, DOM/CSS/JS contracts, and asset parity
npm run check

# 3. Start the local static server (default: http://localhost:4173)
npm run dev
```

You can override the dev server port with `PORT`:

```bash
PORT=8080 npm run dev
```

## Available Scripts (`receipt-studio/package.json`)

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `node scripts/dev.mjs` | Serves `dist/` over HTTP on `http://localhost:${PORT \|\| 4173}` with clean MIME types and `Cache-Control: no-store`. |
| `build` | `node scripts/build.mjs` | Validates `src/` and `public/assets/`, copies `src/index.html` and `src/scripts/app.js`, concatenates `src/styles/tokens.css` + `src/styles/main.css` into `dist/style.css`, and mirrors `public/assets/` into `dist/assets/`. |
| `check` | `node scripts/check.mjs` | Runs `node --check` on `scripts/*.mjs`, `src/scripts/app.js`, and `dist/app.js`; verifies `.openai/hosting.json`, required DOM IDs/attributes, CSS rules, JS hooks, and SHA-256 parity across all 11 assets in `public/assets/` and `dist/assets/`. |

## Static Deployment

`receipt-studio/.openai/hosting.json` configures static hosting directly from `receipt-studio/dist/`:

```json
{
  "project_id": "appgprj_6acf1fe5999c8191b9363082aa147210",
  "static": {
    "directory": "dist"
  }
}
```

Always run `npm run build && npm run check` before deploying so `dist/` stays synchronized with `src/` and `public/assets/`.
