# Architecture

## Tech Stack

### Frontend
- **React 18** (`react`, `react-dom`) — UI framework, function components + hooks only, no class components.
- **Vite 6** — dev server and build tool.
- **Konva 9** + **react-konva 18** — canvas rendering engine. *(Note: earlier
  planning docs mentioned Fabric.js; the project actually uses Konva via
  react-konva, chosen for its more idiomatic React bindings.)*
- **Tailwind CSS 4** (via `@tailwindcss/vite`) — utility-first styling, dark theme only.

### Storage
- **`localStorage`** — sole persistence layer today. All boards and their
  elements are serialized to JSON under a single key.
- **Firebase** — not integrated. Listed in [ROADMAP.md](ROADMAP.md) as an
  optional future backup layer, not present in the codebase.

### Deployment
- **Vercel** (or any static host / Netlify) — this is a pure static SPA, no
  backend/server component, so any static file host works. See
  [DEPLOYMENT.md](DEPLOYMENT.md).

There is no backend, no API server, and no database beyond the browser's
`localStorage`. Everything runs client-side.

## High-Level Data Flow

```
User action (click/drag/keyboard)
        │
        ▼
Canvas.jsx (Konva event handlers)
        │  calls prop callbacks (onChange, onSelectionChange, onBatchChange...)
        ▼
App.jsx (owns all mutable state)
        │  every mutation goes through `commit()`
        ▼
commit() → useHistory.record(prevState) → setElements(newState)
        │
        ▼
useBoards (debounced) → localStorage.setItem('mpp:boards', ...)
```

Key architectural decision: **all element mutations flow through a single
`commit()` function in `App.jsx`.** This guarantees every mutating action
(drag, resize, rotate, recolor, delete, layer reorder, paste, group move)
gets recorded onto the undo stack exactly once, as a single step — there is
no code path that mutates board elements without going through `commit`.

## Component Tree

```
App
├── Sidebar               (board list, create/rename/delete, collapse)
├── Toolbar                (add text/image, formatting, layers, zoom, grid, export/import)
├── Canvas                  (Konva Stage/Layer — selection, transform, pan/zoom)
│   ├── URLImage (per image element)
│   ├── Konva.Text (per text element)
│   ├── Konva.Transformer  (resize/rotate handles)
│   └── ContextMenu          (right-click menu, conditionally rendered)
└── ConfirmDialog             (modal, conditionally rendered)
```

## State Ownership

All application state lives in `App.jsx` (no global state library — the
component tree is shallow enough that prop drilling is simple and explicit):

- `boards`, `activeBoard` — from `useBoards()`.
- `selectedIds` — array of currently-selected element ids.
- `color` — the "active" color for new text / the color picker.
- `showGrid`, `view` (pan/zoom transform), `sidebarCollapsed` — UI/viewport state.
- `dialog` — from `useDialog()`, drives the confirm/alert modal.

`Canvas.jsx` holds only **transient, canvas-local** UI state that doesn't
need to persist or trigger undo history: the in-progress rubber-band
selection rectangle, the active pan gesture, inline text-editing state, and
the open context menu.

## Why These Choices

- **Konva/react-konva over Fabric.js or raw `<canvas>`**: react-konva gives
  React-idiomatic components (`<Stage>`, `<Layer>`, `<Text>`, `<Image>`)
  instead of an imperative canvas API, which fits a React codebase much more
  naturally than Fabric.js's own imperative object model.
- **`localStorage` over a backend database**: this is an explicitly
  single-user, offline-first, private tool — a server and database would add
  operational complexity with no matching benefit at this stage.
- **No state management library (Redux/Zustand/etc.)**: the state graph is
  small and lives in one component; introducing a library would be
  premature abstraction for the current scope.
- **Images stored as WebP data-URLs** (not object URLs / blobs): keeps the
  whole board representation as one plain JSON blob, which is what makes
  `localStorage` persistence and JSON export/import trivial. The trade-off is
  `localStorage`'s ~5MB quota, mitigated by downscaling + WebP compression
  (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)).
