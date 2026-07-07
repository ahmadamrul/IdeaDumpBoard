# Features

Status reflects the actual code in `src/` as of this writing — not a wishlist.
✅ = implemented and working. 🔄 = partially implemented / limited. 📋 = not started.

## Canvas & Elements

| Feature | Status | Notes |
| --- | --- | --- |
| Paste image from clipboard (`Ctrl+V`) | ✅ | Also works for screenshots copied from other apps. |
| Drag & drop image upload | ✅ | Drop onto the canvas area. |
| Upload via file picker | ✅ | Toolbar "⬆ Image" button, multi-file supported. |
| Add text notes | ✅ | Toolbar "+ Text", double-click to edit inline. |
| Move elements | ✅ | Drag any element; dragging a multi-selected element moves the whole group. |
| Resize elements | ✅ | Corner + side handles on the selection box. |
| Rotate elements | ✅ | Rotation handle above the box, **single-selection only** (disabled for multi-select to avoid a confusing skewed group rotation). |
| Reset rotation | ✅ | Right-click → "Reset Rotation"; recenters correctly instead of jumping. |
| Reset size | 🔄 | Right-click → "Reset Size". Works fully for text (falls back to app defaults). For images, only works if the image was added *after* the `origWidth`/`origHeight` tracking was introduced — older images have nothing to reset to. |
| Multi-select | ✅ | Shift/Ctrl+click to add/remove, or drag a rubber-band box over empty canvas. |
| Layer ordering | ✅ | Toolbar buttons (⤒↑↓⤓) or right-click menu: bring to front/back, forward/backward. |
| Text formatting | ✅ | Font size (A−/A+), bold, italic, align left/center/right. Applies to *all* selected text elements at once. |
| Color picker | ✅ | 6 preset swatches + a native color-wheel input, applies to selected text. |
| Delete elements | ✅ | `Del`/`Backspace`, toolbar button, or right-click menu. Works on the whole selection. |
| Copy / paste elements | ✅ | `Ctrl+C` copies the current selection (in-app clipboard, separate from OS image paste); `Ctrl+V` pastes a duplicate offset from the original, and cascades further on repeated paste. |
| Undo | ✅ | `Ctrl+Z`, per-board history stack (up to 50 steps). Every mutating action (move, resize, rotate, color, delete, layer order, group move, paste) is a single undo step. |
| Redo | 📋 | Not implemented — undo only goes one direction. |

## Viewport

| Feature | Status | Notes |
| --- | --- | --- |
| Zoom | ✅ | Mouse wheel (zooms toward cursor), or toolbar `−`/`+`/reset buttons. |
| Pan | ✅ | Right-click + hold + drag on empty canvas, or middle-mouse drag. |
| Grid | ✅ | Toggle from the toolbar; visual reference only. |
| Snap-to-grid | 📋 | Grid is currently visual-only, elements don't snap to it. |

## Boards

| Feature | Status | Notes |
| --- | --- | --- |
| Create board | ✅ | Sidebar "+ New". |
| Rename board | ✅ | Double-click a board name in the sidebar. |
| Delete board | ✅ | Confirmation dialog (styled, not the native browser popup). |
| Switch between boards | ✅ | Click a board in the sidebar. |
| Collapse/show sidebar | ✅ | `«`/`»` toggle button. |

## Persistence

| Feature | Status | Notes |
| --- | --- | --- |
| Auto-save | ✅ | Debounced write to `localStorage` (~300ms after the last change). |
| Export board as PNG | ✅ | Toolbar "PNG" — snapshots the current canvas. |
| Export board as JSON | ✅ | Toolbar "Export" — full data backup of the active board. |
| Import board from JSON | ✅ | Toolbar "Import" — accepts a single board or a `{ boards: [...] }` bundle. |
| Cloud backup (Firebase) | 📋 | Not implemented. Would require adding Firestore/Storage and is intentionally deferred until localStorage limits actually become a problem. |

## UI / UX

| Feature | Status | Notes |
| --- | --- | --- |
| Dark theme | ✅ | The only theme currently; no light mode toggle. |
| Custom confirm/alert dialogs | ✅ | Replaces native browser popups for delete/clear/import-error prompts. |
| Right-click context menu | ✅ | Per-element: layer order, reset rotation/size, delete. |
| Image compression | ✅ | Pasted/uploaded images are downscaled (max 900px) and re-encoded as WebP (falls back to PNG if the source has transparency) to keep `localStorage` usage down. |

## Not Planned / Explicitly Out of Scope
- Real-time collaboration / multi-user editing.
- User accounts or authentication.
- Shapes beyond text and images (no rectangles/arrows/polygons at this time).
