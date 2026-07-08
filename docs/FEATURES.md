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
| Sticky notes | ✅ | Toolbar "🟨 Note". Type inside, recolor the background from the palette, resize/rotate like any element. |
| Connectors / arrows | ✅ | Toolbar "↔ Connect", then click a source and a target element. The arrow trims to each element's edge, follows both endpoints live while dragging (incl. group/frame drags), and is deleted automatically when either endpoint is removed. `Esc` or clicking empty canvas cancels connect mode. |
| Frames | ✅ | Toolbar "🖼 Frame". A dashed grouping area rendered behind everything, with an editable title; dragging the frame carries every element whose center is inside it. |
| Move elements | ✅ | Drag any element; dragging a multi-selected element moves the whole group. |
| Resize elements | ✅ | Corner + side handles on the selection box. |
| Rotate elements | ✅ | Rotation handle above the box, **single-selection only** (disabled for multi-select to avoid a confusing skewed group rotation). |
| Reset rotation | ✅ | Right-click → "Reset Rotation"; recenters correctly instead of jumping. |
| Reset size | 🔄 | Right-click → "Reset Size". Works fully for text (falls back to app defaults). For images, only works if the image was added *after* the `origWidth`/`origHeight` tracking was introduced — older images have nothing to reset to. |
| Multi-select | ✅ | Shift/Ctrl+click to add/remove, or drag a rubber-band box over empty canvas. |
| Layer ordering | ✅ | Toolbar buttons (⤒↑↓⤓) or right-click menu: bring to front/back, forward/backward. |
| Text formatting | ✅ | Font size (A−/A+), bold, italic, align left/center/right. Applies to *all* selected text elements at once. |
| Font family & size (font bar) | ✅ | A floating bar above any text/sticky/frame-title editor: 5 font families + a size stepper, with a live preview while typing. |
| Per-selection text color | ✅ | Select part of the text while editing and click a color swatch to recolor just that run (stored as `spans`); rendered on canvas via a custom `RichText` Konva shape. Works for text elements and sticky notes. |
| Color picker | ✅ | 6 preset swatches + a native color-wheel input; applies to selected text (font color) and sticky notes (background color). |
| Delete elements | ✅ | `Del`/`Backspace`, toolbar button, or right-click menu. Works on the whole selection. |
| Copy / paste elements | ✅ | `Ctrl+C` copies the current selection (in-app clipboard, separate from OS image paste); `Ctrl+V` pastes a duplicate offset from the original, and cascades further on repeated paste. |
| Duplicate | ✅ | `Ctrl+D`, or right-click → "Duplicate". Works on a single element or the whole selection at once; offsets the copy so it doesn't stack exactly on the original. |
| Lock elements | ✅ | Right-click → "Lock"/"Unlock". Locked elements can't be dragged, resized, rotated, or have their attached comment edited (shown at reduced opacity). Toggling a multi-selection locks/unlocks all of them together. |
| Undo | ✅ | `Ctrl+Z`, per-board history stack (up to 20 steps). Every mutating action (move, resize, rotate, color, delete, layer order, group move, paste) is a single undo step. |
| Redo | ✅ | `Ctrl+Y` or `Ctrl+Shift+Z`. Mirrors the undo stack (also capped at 20); any new mutation clears the redo stack, same as standard editor behavior. |

## Viewport

| Feature | Status | Notes |
| --- | --- | --- |
| Zoom | ✅ | Mouse wheel (zooms toward cursor), or toolbar `−`/`+`/reset buttons. |
| Pan | ✅ | Right-click + hold + drag on empty canvas, or middle-mouse drag. |
| World bounds | ✅ | Pan/zoom is clamped to a fixed world rect so you can't scroll off into infinite empty space; zooming far out re-centers the content. |
| Grid | ✅ | Toggle from the toolbar. |
| Snap-to-grid | ✅ | While the grid is on, dragging and resizing (both images and text) snaps to the grid line. |
| Snap-to-elements (alignment guides) | ✅ | Toggle "Snap" from the toolbar. While dragging, an element's edges/centers snap to nearby elements' edges/centers and a pink guide line is shown. Works with grid on or off. |
| Mini-map | ✅ | Static thumbnail in the bottom-right (toggle from the toolbar). Shows all elements + the current viewport rectangle; click anywhere on it to jump the viewport there. Theme-aware. |
| Fullscreen mode | ✅ | Toolbar "⛶" hides the sidebar and toolbar (uses the browser Fullscreen API); floating buttons keep map/exit reachable. |

## Comments / Annotations

| Feature | Status | Notes |
| --- | --- | --- |
| Add a comment | ✅ | Right-click an image or text element → "Add Comment". Attached to that object (not a standalone element) — not available from the toolbar. |
| Follows its object | ✅ | Rendered to the object's right; position is derived from the object's `x`/`y`/`width` and re-synced live while dragging, so it always stays attached, including during group drags. |
| Edit | ✅ | Double-click the comment, or right-click its object → "Edit Comment". |
| Show / hide | ✅ | Right-click its object → "Hide Comment"/"Show Comment" (eye / eye-slash icon). Hidden comments keep their data, they just don't render. |
| Delete | ✅ | Right-click its object → "Delete Comment" (removes just the comment, not the object). |
| Resize | ✅ | While editing, drag the handle on the right edge (width), bottom edge (height), or bottom-right corner (both) — like a normal resizable box. Text size is adjusted separately with A−/A+ buttons. |
| Locking | ✅ | A locked object's comment can't be opened for editing either, and renders at reduced opacity to match. |
| Distinct from sticky notes | ✅ | Fixed amber "speech bubble" look (Konva Label/Tag with a pointer), separate from both the plain-text element and the 🟨 sticky-note element — intentionally not stylable via the text color/format toolbar. |

## Boards

| Feature | Status | Notes |
| --- | --- | --- |
| Create board | ✅ | Sidebar "+ New". |
| Rename board | ✅ | Double-click a board name in the sidebar. |
| Delete board | ✅ | Confirmation dialog (styled, not the native browser popup). |
| Switch between boards | ✅ | Click a board in the sidebar. |
| Collapse/show sidebar | ✅ | `«`/`»` toggle button. |
| Theme toggle | ✅ | Light/dark toggle in the sidebar, persisted to `localStorage` (`mpp:theme`). |

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
| Light & dark theme | ✅ | Toggle from the sidebar; remembered across sessions. Every surface (toolbar, sidebar, menus, dialogs, mini-map, grid) has both variants. |
| Custom confirm/alert dialogs | ✅ | Replaces native browser popups for delete/clear/import-error prompts. |
| Right-click context menu | ✅ | Per-element: layer order, duplicate, lock/unlock, add/edit/hide/delete comment, reset rotation/size, delete. Acts on the whole selection when the clicked element is part of one. |
| Image compression | ✅ | Pasted/uploaded images are downscaled (max 900px) and re-encoded as WebP (falls back to PNG if the source has transparency) to keep `localStorage` usage down. |

## Not Planned / Explicitly Out of Scope
- Real-time collaboration / multi-user editing.
- User accounts or authentication.
- Freeform vector shapes (rectangles/ellipses/polygons/freehand drawing). The board has text, images, sticky notes, frames, and connector arrows — but no general shape/drawing tools.
