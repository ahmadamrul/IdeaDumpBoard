# Project Overview

## Project Name
**IdeaDumpBoard**

## Description
IdeaDumpBoard is a personal, solo-use whiteboard application for visually
organizing software/creative projects. It's a single infinite canvas per
"board" where you paste screenshots, drop in images, and drop text notes
anywhere you like — arranged spatially instead of in a list or a table.

## Problem It Solves
Keeping track of multiple in-flight projects tends to spread across
screenshots folders, sticky notes, half-finished docs, and browser tabs.
IdeaDumpBoard centralizes that into one visual space per project:

- **Centralized visual planning** — one board per project, all context in one place.
- **Paste screenshots directly** — no "save file → upload file" round trip.
- **Freeform annotation** — text notes placed anywhere, not constrained to a list.
- **Multiple projects side by side** — switch boards from the sidebar instead of juggling files.

## Target User
- Solo developers tracking personal/side projects.
- Students organizing coursework or research visually.
- Anyone doing lightweight project/task planning who wants a whiteboard
  rather than a spreadsheet or kanban board.

This is explicitly **not** built for teams — there is no real-time
collaboration, no accounts, and no shared/multi-user state.

## Key Benefits
- **Simple & fast** — no onboarding, no configuration, open and start pasting.
- **No learning curve** — standard whiteboard gestures (click, drag, resize,
  rotate, right-click) that most users already know from other tools.
- **Private by default** — all data lives in the browser's `localStorage` on
  the user's own machine; nothing is sent to a server.
- **Offline-first** — works with no network connection once the page is loaded.

## Current Status
**MVP, actively evolving.** The core whiteboard (canvas, boards, save/load,
selection, resize/rotate, layering, copy/paste, undo, export/import) is
implemented and usable day-to-day. See [FEATURES.md](FEATURES.md) for the
detailed, up-to-date feature checklist and [ROADMAP.md](ROADMAP.md) for
what's planned next.

## Team
Solo developer (Ahmad), building this as a personal tool first — features
are added as they're actually needed, not speculatively.

## Why It Was Built
To have one simple, private, always-available place to dump screenshots and
notes per project without needing to sign up for or configure a heavier
project-management tool.
