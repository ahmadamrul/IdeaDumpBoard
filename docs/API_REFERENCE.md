# API Reference

This project has no HTTP/REST API — it's a client-only SPA. "API" here means
the internal component props and hook interfaces. Reference this when
modifying `src/`.

## Components

### `App.jsx`
Root component. Owns all board/element state and every mutating action
(`commit`, `updateElement`, `updateElements`, `moveLayer`, `deleteElements`,
`resetSize`, `copySelected`/`pasteClipboard`, export/import). No props (it's
the app root).

### `Canvas` — `components/Canvas.jsx`
Renders the Konva `Stage`/`Layer` and owns all Konva-specific interaction
logic (selection, drag, resize/rotate, pan/zoom, rubber-band select, group
drag, inline text editing, context menu positioning).

| Prop | Type | Description |
| --- | --- | --- |
| `stageRef` | `ref` | Forwarded ref to the Konva Stage instance (used by `App` for PNG export and centering new elements). |
| `elements` | `Element[]` | The active board's elements (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)). |
| `selectedIds` | `string[]` | Currently selected element ids. |
| `onSelectionChange` | `(ids: string[]) => void` | Called whenever the selection changes (click, shift-click, rubber-band, deselect). |
| `onChange` | `(id: string, patch: object) => void` | Commit a patch to a single element (drag end, resize/rotate end, etc.). |
| `onBatchChange` | `(patches: {id, ...}[]) => void` | Commit several elements' positions at once, as a single undo step (used for group drag). |
| `showGrid` | `boolean` | Whether to render the background grid. |
| `view` | `{ scale, x, y }` | Current pan/zoom transform. |
| `onViewChange` | `(view) => void` | Called on wheel-zoom or pan-drag. |
| `onLayer` | `(id, dir) => void` | `dir` is `'front' \| 'forward' \| 'backward' \| 'back'`. |
| `onDeleteElement` | `(id: string) => void` | Delete a single element (right-click menu). |
| `onResetSize` | `(id: string) => void` | Reset an element back to its original width/height (or font size, for text). |

Rotation reset is handled **internally** in `Canvas.jsx` (`resetRotation`),
not via a prop, because it needs live Konva node geometry (actual rendered
width/height) to recompute a position that keeps the shape's visual center
fixed — see the code comment in `Canvas.jsx` for the trigonometry.

### `URLImage` — `components/URLImage.jsx`
Loads an `element.src` (data-URL) into an `HTMLImageElement` and renders it
as a Konva `Image`. Accepts the same transform props Konva shapes take
(`x`, `y`, `width`, `height`, `draggable`, event handlers, etc. via spread).

### `ContextMenu` — `components/ContextMenu.jsx`
Generic right-click menu, positioned absolutely at `{x, y}`.

| Prop | Type | Description |
| --- | --- | --- |
| `x`, `y` | `number` | Position within the canvas wrapper (screen pixels). |
| `items` | `{ label, icon, onClick, disabled? }[] \| { divider: true }[]` | Menu entries, in order. |
| `onClose` | `() => void` | Called after any item click, on outside click, or `Esc`. |

### `ConfirmDialog` — `components/ConfirmDialog.jsx`
Styled replacement for `window.confirm`/`window.alert`. Driven by
`useDialog()` (below) — not meant to be used standalone.

| Prop | Type | Description |
| --- | --- | --- |
| `dialog` | `{ message, variant, resolve, confirmLabel?, danger? } \| null` | Current dialog state; `null` renders nothing. |
| `onClose` | `(result: boolean) => void` | Call with the user's answer; resolves the pending promise from `useDialog`. |

### `Sidebar` — `components/Sidebar.jsx`
Board list, collapse toggle, create/rename/delete.

| Prop | Type | Description |
| --- | --- | --- |
| `boards` | `Board[]` | All boards. |
| `activeId` | `string` | Currently open board's id. |
| `onSelect` | `(id) => void` | Switch active board. |
| `onCreate` | `() => void` | Create a new board. |
| `onRename` | `(id, name) => void` | Rename a board. |
| `onDelete` | `(id) => void` | Delete a board (called after confirmation). |
| `collapsed` | `boolean` | Whether the sidebar is collapsed to a thin strip. |
| `onToggleCollapsed` | `() => void` | Toggle collapse state. |
| `confirmAction` | `(message, options?) => Promise<boolean>` | The `confirm` function from `useDialog()`, used for the delete-board prompt. |

### `Toolbar` — `components/Toolbar.jsx`
Top bar: add text/image, color picker, text formatting, layer order,
undo/delete/clear, grid toggle, zoom controls, export/import. Purely
presentational — every button calls a prop callback supplied by `App.jsx`.
See the component source for the full prop list (it's long but each prop
maps 1:1 to one visible button).

## Hooks

### `useBoards()` — `hooks/useBoards.js`
Owns the list of boards and which one is active; persists to `localStorage`
(debounced) on every change.

Returns:
```
{
  boards, activeBoard, activeId, setActiveId,
  addBoard(name), deleteBoard(id), renameBoard(id, name),
  setElements(updaterOrArray),  // replaces the active board's elements
  importBoard(boardOrBundle),
}
```

### `useHistory(boardId, applyElements)` — `hooks/useHistory.js`
Per-board undo stack (max 50 snapshots), keyed by `boardId` so switching
boards doesn't cross-contaminate history.

Returns:
```
{
  record(elementsSnapshot),  // push a snapshot before a mutation
  undo(),                     // pop the last snapshot and call applyElements(it)
  clear(),                    // wipe history for the current board
}
```

### `useDialog()` — `hooks/useDialog.js`
Promise-based replacement for `window.confirm`/`window.alert`.

Returns:
```
{
  dialog,                              // current dialog state, or null
  confirm(message, options?) => Promise<boolean>,
  alertUser(message) => Promise<boolean>,
  close(result: boolean),              // resolves the pending promise
}
```
`options` for `confirm`: `{ confirmLabel?: string, danger?: boolean }`.

## Utility Functions — `lib/storage.js`
- `uid(prefix = 'id')` — generates a short unique id, e.g. `img-l3x9k2-ab3f1`.
- `loadBoards()` / `saveBoards(boards)` — read/write the `mpp:boards` localStorage key.
- `loadActiveId()` / `saveActiveId(id)` — read/write the `mpp:activeBoardId` key.
- `createBoard(name)` — returns a fresh `{ id, name, elements: [], createdAt, updatedAt }`.
