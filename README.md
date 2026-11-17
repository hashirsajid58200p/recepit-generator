# Receipt Studio

Client-side payment receipt generator and static PNG export workbench.

## Project Structure

```text
Recepit Generator/
├── .github/workflows/pages.yml      # GitHub Pages build & deploy workflow
├── .openai/hosting.json             # Static deployment config (serves dist/)
├── docs/architecture.md             # Template specs, asset ownership & build flow
├── package.json                     # Zero-dependency Node.js scripts (dev, build, check)
├── public/
│   └── assets/
│       ├── fonts/                   # Shared receipt fonts (Arial, Arial-Bold, Roboto)
│       └── templates/               # Independent asset folder per receipt design
│           ├── purple-transfer/
│           └── teal-bill/
├── scripts/
│   ├── build.mjs                    # Builds dist/ from src/ and public/assets/
│   ├── check.mjs                    # Runs syntax, DOM/CSS/JS contract, and asset checks
│   └── dev.mjs                      # Local HTTP static server for dist/
└── src/
    ├── index.html                   # Application shell
    ├── styles/
    │   ├── tokens.css               # Theme, scrollbar, typography, and motion tokens
    │   └── main.css                 # Layout, scrollbars, and component styles
    └── scripts/
        ├── app.js                   # Form/draft state, asset preloading, canvas export
        ├── canvas-utils.js          # Shared canvas text, wrapping, and logo helpers
        └── templates/
            ├── index.js             # Ordered template registry
            ├── purple-transfer.js   # Template 1 definition & renderer
            └── teal-bill.js         # Template 2 definition & renderer
```

## Quick Start

```bash
npm run build
npm run check
npm run dev
```

## Adding a New Receipt Template

1. Create `public/assets/templates/<template-id>/` with `background.png` and its own independent default logo images.
2. Add `src/scripts/templates/<template-id>.js` exporting the template config (`id`, `name`, `width`, `height`, `background`, `defaultLogos`, `logoSlots`, `defaults`, `extraFields`, `generateTransactionId()`, and `render()`).
3. Register the template in `src/scripts/templates/index.js`.
4. Run `npm run build && npm run check`.

## GitHub Pages Deployment

`.github/workflows/pages.yml` automatically runs `npm run build && npm run check` on pushes to `main` and deploys `dist/` to GitHub Pages (enable **Settings → Pages → Source: GitHub Actions**).
