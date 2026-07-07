# Installation

## Prerequisites
- **Node.js** 18 or newer (Vite 6 requires it).
- **npm** (ships with Node). Yarn/pnpm would also work but the project's
  lockfile (`package-lock.json`) is npm's.
- A modern browser (Chrome, Edge, or Firefox recommended — see
  [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for WebP/clipboard support notes).

## Setup

```bash
# 1. Clone or copy the project
cd IdeaDumpBoard

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The dev server prints a local URL, e.g.:

```
VITE v6.x.x  ready in 900 ms
➜  Local:   http://localhost:5199/
```

Open that URL in your browser (a real browser tab — see the note below about
in-editor browser panels).

> **Port note:** the dev port is pinned to **5199** in `vite.config.js`
> (rather than Vite's default 5173/5174) specifically to avoid collisions
> with other local projects — including their cached service workers, which
> can otherwise silently serve a *different* project's page on the same port.
> See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you ever see the wrong app
> load on that port.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot module reload. |
| `npm run build` | Production build, output to `dist/`. |
| `npm run preview` | Serve the production build from `dist/` locally, to sanity-check before deploying. |

## Verifying the Install
After `npm run dev`, you should see:
- A sidebar with "📌 Boards" and a "My First Board" entry.
- A toolbar with "+ Text" / "⬆ Image" buttons.
- An empty dark canvas with the hint text "Empty board — Paste a screenshot
  (Ctrl+V), drop an image, or add text."

If instead you see a blank white page, a different app's UI, or errors —
jump to [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## No Environment Variables Required
There is currently no `.env` file and no external API keys — the app is
fully self-contained (client-only, `localStorage`-backed). If Firebase backup
is added later (see [ROADMAP.md](ROADMAP.md)), this document will need a
Firebase config section.
