# Usage Guide

## Getting Started
When you open the app, you land on a default board with an empty canvas.
Everything you do auto-saves — there's no "Save" button to remember to click.

## Working with Boards
- **Create a board**: click **+ New** in the sidebar. Each board is an
  independent canvas — good for one board per project.
- **Switch boards**: click any board name in the sidebar.
- **Rename a board**: double-click its name, type, press `Enter` (or click
  away to confirm, `Esc` to cancel).
- **Delete a board**: hover a board row → click the `✕` that appears → confirm
  in the dialog that pops up.
- **Hide the sidebar**: click `«` in the sidebar header to collapse it to a
  thin strip (more canvas room); click `»` to bring it back.

## Adding Content

### Images
- **Paste**: copy a screenshot or image anywhere on your system, then press
  `Ctrl+V` with the app focused.
- **Drag & drop**: drag an image file from your file manager onto the canvas.
- **Upload**: click **⬆ Image** in the toolbar and pick one or more files.

Images are automatically downscaled (max 900px on the longest side) and
compressed to WebP to keep things small — see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### Text
- Click **+ Text** in the toolbar — a placeholder note appears in the middle
  of your current view.
- **Double-click** any text element to edit its contents inline. Press
  `Enter` to confirm, `Shift+Enter` for a new line, `Esc` to cancel.

## Selecting Elements
- **Click** an element to select it alone.
- **Shift+click** (or **Ctrl+click**) another element to add/remove it from
  the selection.
- **Drag on empty canvas** to draw a selection box — everything it touches
  gets selected.
- **Click empty canvas** to deselect everything.

## Moving, Resizing, Rotating
- **Drag** a selected element to move it. If multiple elements are selected,
  dragging any one of them moves the whole group together.
- **Resize**: drag a corner (scales proportionally) or a side handle (width
  only, useful for text wrapping) on the selection box.
- **Rotate**: drag the small circular handle above the selection box. This
  is only available when exactly **one** element is selected — rotating a
  multi-element group is disabled on purpose because it produces a confusing
  skewed bounding box.

## Formatting Text
Select one or more text elements, then use the toolbar:
- **A− / A+**: shrink/grow font size.
- **B** / *I*: toggle bold / italic.
- **⇤ ↔ ⇥**: align left / center / right.
- **Color swatches + color wheel**: recolor the text.

All of these apply to every selected text element at once.

## Layer Order (Front/Back)
Two equivalent ways:
- **Toolbar**: with something selected, use **⤒** (front) **↑** (forward)
  **↓** (backward) **⤓** (back).
- **Right-click** an element directly for the same options in a context menu,
  plus duplicate, lock, comment actions, **Reset Rotation**, **Reset Size**,
  and **Delete**.

## Copy, Paste, Duplicate, Undo/Redo, Delete
- **`Ctrl+C`** copies the current selection into an in-app clipboard.
- **`Ctrl+V`** pastes a duplicate, offset slightly from the original.
  (If your OS clipboard contains an actual image — e.g. a fresh screenshot —
  `Ctrl+V` pastes *that* instead, taking priority over the in-app clipboard.)
- **`Ctrl+D`**, or right-click → **Duplicate**, makes an offset copy of the
  current selection (single or multiple elements) in one step, without
  touching the clipboard.
- **`Ctrl+Z`** undoes the last action (move, resize, rotate, delete, color,
  paste, duplicate, lock, comment edit, layer change...). **`Ctrl+Y`** (or
  `Ctrl+Shift+Z`) redoes it. Making a new change after undoing clears the
  redo stack, same as most editors.
- **`Del`** / **`Backspace`** deletes the current selection.

## Locking Elements
Right-click an element → **Lock** to prevent it from being accidentally
dragged, resized, or rotated — useful once you've got something positioned
exactly where you want it. Locked elements render slightly transparent so
it's obvious at a glance. Right-click → **Unlock** to release it. Locking a
multi-selection locks/unlocks all of them together. A locked element's
comment (if it has one) also can't be opened for editing until unlocked.

## Comments (Annotations)
Comments are a distinct annotation type, separate from a plain text
element — meant for notes *about* something on the board, not content on
the board itself.
- **Add**: right-click an image or text element → **Add Comment**, type your
  note, then click elsewhere (or press `Enter`) to save. There's no toolbar
  button for this — it only makes sense attached to an existing element.
- **Position**: a comment always renders as a small amber sticky note to the
  right of its object, and **follows it automatically** whenever the object
  is moved — including as part of a group drag.
- **Edit**: double-click an existing comment, or right-click its object →
  **Edit Comment**.
- **Resize**: while editing, drag the small handle on the comment's right
  edge (width), bottom edge (height), or bottom-right corner (both at once).
  Use the **A−**/**A+** buttons above the editor to change the text size
  separately.
- **Hide/show**: right-click the object → **Hide Comment**/**Show Comment**
  (eye / eye-with-a-slash icon). Hiding just stops it from rendering — the
  text isn't lost.
- **Delete**: right-click the object → **Delete Comment**. This removes only
  the comment, not the object it's attached to.

## Navigating the Canvas
- **Zoom**: scroll the mouse wheel (zooms toward your cursor), or use the
  `−`/`+` buttons in the toolbar. Click the zoom percentage to reset to 100%.
- **Pan**: right-click, hold, and drag on empty canvas — or drag with the
  middle mouse button. (A quick right-click *on an element*, without holding
  and dragging, opens its context menu instead.)
- **Grid**: toggle the `# Grid` button in the toolbar. While it's on, dragging
  and resizing elements snaps to the grid lines; turn it off for free
  positioning.

## Saving, Exporting, Importing
- **Auto-save**: every change is saved to `localStorage` automatically
  (roughly 300ms after you stop editing).
- **Export PNG**: toolbar → **PNG** — downloads a snapshot image of the
  current board.
- **Export JSON**: toolbar → **Export** — downloads the full board data,
  useful as a backup or to move a board to another browser/machine.
- **Import JSON**: toolbar → **Import** — pick a previously exported `.json`
  file to add it as a new board.

## Tips
- Use multi-select + drag-select to quickly reposition several notes/images
  as a group.
- If an element ends up rotated in a way you don't want, right-click it →
  **Reset Rotation** rather than eyeballing it back to straight.
- If localStorage starts feeling full (see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)),
  export boards you don't need open right now and delete them locally.
