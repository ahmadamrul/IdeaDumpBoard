# Roadmap & Version History

## Current State: MVP
The core whiteboard is functional and used day-to-day. See
[FEATURES.md](FEATURES.md) for the exact, up-to-date status of every
feature — this document is about direction, not a duplicate checklist.

## Version History (informal)

Since there's no git history or formal releases yet, this is a narrative
summary of how the app evolved during initial development:

1. **Initial MVP** — React + Vite + react-konva scaffold; canvas with
   paste/drop/upload images, add text, drag elements, resize (corner/side
   handles), delete, colors, board CRUD, localStorage persistence, JSON/PNG
   export+import, keyboard shortcuts (paste, delete, undo).
2. **Text formatting & layers** — font size, bold, align, per-board undo
   history, layer ordering (toolbar buttons).
3. **Grid** — optional visual alignment grid, toggleable.
4. **Pan & zoom** — mouse-wheel zoom toward cursor, draggable viewport,
   zoom controls in the toolbar.
5. **Sidebar collapse** — hide/show the boards panel.
6. **Right-click context menu** — layer order + delete, as an alternative to
   toolbar buttons.
7. **Bug fix pass** — resolved a stale-declaration runtime crash
   (`updateElement` referenced before initialization) and a service-worker
   cache issue that made the wrong app appear on a shared dev port; pinned
   the dev server to port 5199 to avoid recurrence.
8. **Free-transform for text** — corner handles resize font size (not just
   width), matching image resize behavior.
9. **Multi-select, resize, rotate, richer color/font controls, copy-paste** —
   shift/ctrl-click and drag-select multi-selection, group drag, rotation
   (single-selection only, to avoid a confusing group-skew), native color
   picker, italic toggle, `Ctrl+C`/`Ctrl+V` element duplication, "reset
   rotation"/"reset size" via right-click.
10. **Pan gesture change** — replaced hold-Space-to-pan with right-click-
    hold-drag (right-click on an element still opens its context menu).
11. **Custom dialogs** — replaced native `confirm()`/`alert()` popups with a
    dark-themed modal matching the rest of the UI.
12. **Image compression** — pasted/uploaded images downscaled and re-encoded
    as WebP (falls back to PNG for transparency) to shrink localStorage/export size.

## Planned (Near-Term)
These are concrete, scoped next steps — not speculative:
- **Redo** — the undo stack currently only goes one direction.
- **Snap-to-grid** — the grid is currently a visual reference only; elements
  don't snap to it while dragging/resizing.
- **Backfill `origWidth`/`origHeight` for older images** so "Reset Size"
  works universally, not just for images added after the feature existed.

## Under Consideration (No Commitment Yet)
- **Firebase Firestore + Storage backup** — optional cloud sync, mainly to
  work around `localStorage`'s ~5MB ceiling for image-heavy boards. Would
  need to stay strictly opt-in to preserve the "private, offline-first by
  default" property this tool is built around.
- **More shape types** (rectangle, arrow, sticky note distinct from plain
  text) — not currently planned, would need real demand first.
- **Group/ungroup** elements as a persistent unit (distinct from the
  transient multi-selection that exists today).
- **Search** across boards/elements, once the number of boards/elements
  makes that worth having.

## Explicitly Not Planned
- **Real-time multi-user collaboration.** This tool is intentionally solo/
  single-user; adding this would mean a backend, accounts, and conflict
  resolution — a fundamentally different project.
- **User accounts / authentication.** Ties directly to the point above.
- **Mobile-first redesign.** The toolset (right-click menus, hover states,
  drag handles, keyboard shortcuts) assumes a desktop mouse + keyboard;
  reworking this for touch/mobile isn't currently a goal.

## How to Propose a Change
Since this is a solo personal project with no formal contribution process:
open a note in [DEVELOPMENT.md](DEVELOPMENT.md)'s conventions, keep changes
scoped (avoid bundling unrelated features into one change), and always
verify with a real browser reload (not just `npm run build`) before calling
something done — see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for why that
distinction matters here specifically.
