# IdeaDumpBoard 📌

A personal, solo whiteboard for organizing projects. Paste screenshots, add
text notes, arrange things visually on a canvas, and save everything locally in
your browser.

## Features

- **Canvas** (react-konva): drag, resize, rotate, and arrange elements; pan & zoom the viewport (with world bounds so you can't scroll off into empty space)
- **Images**: paste from clipboard (`Ctrl+V`), drag & drop, or upload — auto-compressed to WebP
- **Text**: add notes, double-click to edit, resize, bold/italic, align, custom color
- **Sticky notes** 🟨: Miro-style notes; type inside, recolor the background from the palette, resize/rotate like any element
- **Connectors / arrows** ↔: "Connect" mode links two elements with an arrow that follows them live when moved and is removed automatically if either end is deleted
- **Frames** 🖼: dashed grouping areas with an editable title; dragging a frame carries every element inside it along
- **Rich text controls**: a floating bar above any text/sticky/frame-title editor with font family, font size, and **per-selection color** (select a few characters and recolor just them)
- **Mini-map**: static thumbnail in the bottom-right corner; click it to jump the viewport there. Toggle from the toolbar
- **Fullscreen mode** ⛶: hide the sidebar & toolbar for a distraction-free canvas
- **Snap to elements**: alignment guides that snap a dragged element's edges/centers to nearby elements; toggle on/off from the toolbar
- **Light & dark theme**: toggle from the sidebar, remembered across sessions
- **Multi-select**: shift/ctrl-click, or drag a selection box over empty canvas
- **Layer order**: right-click a shape, or use the toolbar (bring to front/back, forward/backward)
- **Reset**: right-click → reset rotation or reset size back to original
- **Lock elements**: right-click → Lock, prevents accidental drag/resize/rotate (and locks any attached comment too)
- **Duplicate**: `Ctrl+D` or right-click → Duplicate, offsets the copy so it doesn't stack on the original
- **Comments/annotations**: right-click an image or text → Add Comment. Renders as an amber speech-bubble to the object's right, always follows it when moved, resizable by dragging its edges/corner, and can be hidden/shown per comment — distinct from a sticky note
- **Grid + snap-to-grid**: toggle the grid from the toolbar; dragging/resizing snaps to it while it's on
- **Boards**: create / rename / delete, one per project (collapsible sidebar)
- **Auto-save** to `localStorage` (debounced)
- **Export/Import**: PNG snapshot + JSON data backup
- **Undo/Redo** (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`), **Copy/Paste** (`Ctrl+C`/`Ctrl+V`), **Delete** (`Del`/`Backspace`)
- Custom themed confirm dialogs (no native browser popups)

## Keyboard & mouse shortcuts

| Action                  | Shortcut / gesture                     |
| ------------------------ | -------------------------------------- |
| Paste image               | `Ctrl+V` (from clipboard)              |
| Copy / paste element(s)   | `Ctrl+C` / `Ctrl+V` (with a selection)  |
| Duplicate selected         | `Ctrl+D`, or right-click → Duplicate   |
| Delete selected           | `Del` / `Backspace`                    |
| Undo / Redo                 | `Ctrl+Z` / `Ctrl+Y` (or `Ctrl+Shift+Z`) |
| Edit text / sticky / frame title | Double-click it (a font bar appears above the editor) |
| Recolor part of the text     | Select some characters while editing, then click a color swatch in the font bar |
| Connect two elements         | Toolbar "↔ Connect", then click the source and the target element (`Esc` cancels) |
| Jump the viewport            | Click anywhere on the mini-map (bottom-right)         |
| Toggle snap / grid / map / fullscreen / theme | Toolbar buttons (theme lives in the sidebar) |
| Add / edit a comment         | Right-click an image or text → Add/Edit Comment; double-click an existing comment |
| Resize a comment             | Drag its right edge (width), bottom edge (height), or bottom-right corner (both) while editing |
| Lock / unlock                | Right-click → Lock / Unlock            |
| Rename board                | Double-click a board name in the sidebar |
| Multi-select                | `Shift`/`Ctrl`+click, or drag over empty canvas |
| Rotate                     | Drag the handle above a single selected element |
| Resize                     | Drag a corner or side handle (snaps to grid if it's on) |
| Pan the canvas              | Right-click + hold + drag empty canvas, or middle-mouse drag |
| Zoom                        | Mouse wheel, or `+`/`-` in the toolbar |
| Right-click menu             | Right-click an element (layer order, lock, duplicate, comment, reset, delete) |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5199
npm run build    # production build to dist/
npm run preview  # preview the build
```

> The dev server port is pinned to `5199` in `vite.config.js` to avoid clashing
> with other local projects (and their cached service workers) on the more
> common `5173`/`5174`.

## Project structure

```
src/
  App.jsx                   # wiring: state, keyboard, paste/drop, export/import
  components/
    Canvas.jsx              # Konva stage: selection, resize/rotate, pan/zoom, snap-to-grid,
                             # snap-to-elements + alignment guides, sticky/frame/connector
                             # rendering, text editing, comment editing/resizing, lock enforcement
    RichText.jsx             # custom Konva shape for multi-colored (per-selection) text
    MiniMap.jsx              # static bottom-right thumbnail + click-to-navigate
    URLImage.jsx             # loads a data-URL into a Konva image
    ContextMenu.jsx           # right-click menu (layer order, lock, duplicate, comment, reset, delete)
    ConfirmDialog.jsx          # styled replacement for window.confirm/alert
    Sidebar.jsx                # board list / create / rename / delete, theme toggle
    Toolbar.jsx                 # add text/sticky/frame/connect, formatting, layer order,
                                 # grid/snap/map/fullscreen toggles, zoom, export/import
  hooks/
    useBoards.js              # board store + localStorage persistence
    useHistory.js              # per-board undo/redo stacks
    useDialog.js                # promise-based confirm()/alert() replacement
  lib/
    storage.js                 # localStorage read/write helpers
```

## Data model (localStorage)

Boards are stored under the key `mpp:boards`:

```json
[
  {
    "id": "board-xxx",
    "name": "Project A",
    "elements": [
      {
        "id": "img-1",
        "type": "image",
        "src": "data:image/webp;base64,...",
        "x": 0, "y": 0, "width": 400, "height": 300,
        "origWidth": 400, "origHeight": 300,
        "rotation": 0,
        "locked": false,
        "comment": {
          "text": "check this crop",
          "hidden": false,
          "width": 200, "height": 80, "fontSize": 14
        }
      },
      {
        "id": "txt-1",
        "type": "text",
        "text": "Planning...",
        "x": 100, "y": 100,
        "fontSize": 24, "fill": "#f8fafc", "fontFamily": "system-ui, sans-serif",
        "align": "left", "fontStyle": "normal",
        "width": 240, "origWidth": 240, "origFontSize": 24,
        "rotation": 0,
        "spans": [
          { "text": "Plan", "fill": "#f87171" },
          { "text": "ning...", "fill": "#f8fafc" }
        ]
      },
      {
        "id": "stk-1",
        "type": "sticky",
        "text": "idea",
        "x": 40, "y": 40, "width": 180, "height": 180,
        "fill": "#fde047", "fontSize": 16, "fontFamily": "system-ui, sans-serif",
        "rotation": 0, "spans": null
      },
      {
        "id": "frm-1",
        "type": "frame",
        "title": "Group A",
        "x": 0, "y": 0, "width": 600, "height": 400,
        "titleFontSize": 14, "titleFontFamily": "system-ui, sans-serif",
        "rotation": 0
      },
      {
        "id": "con-1",
        "type": "connector",
        "from": "stk-1",
        "to": "txt-1"
      }
    ]
  }
]
```

> Images are stored as base64 data-URLs, downscaled to max 900px on their
> longest side, and re-encoded as WebP (falls back to PNG if the source has
> transparency, or if the browser can't encode WebP) to keep localStorage's
> ~5MB quota from filling up. For heavy use, add Firebase Storage later (see
> below).

> `locked` defaults to `false`/absent; when `true`, the element can't be
> dragged, resized, rotated, or have its comment edited until unlocked.
> `comment` is optional and only present once a comment has been added via
> right-click → Add Comment — it's attached to its parent object (not a
> standalone element), so its position is always derived from the parent's
> `x`/`y`/`width` rather than stored independently.

> **Element types:** `image`, `text`, `sticky` (note with a colored
> background), `frame` (a grouping area rendered behind everything, with an
> editable title), and `connector` (an arrow referencing two element ids via
> `from`/`to` — it has no position of its own and is recomputed from its
> endpoints; deleting either endpoint deletes it too).
> `spans` is optional and only present when a text/sticky has per-selection
> colors — it's an array of `{ text, fill }` runs that together spell out the
> full text; when absent, the single `fill` applies to everything.
> `fontFamily` and per-element font sizes come from the floating font bar
> shown while editing.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Vercel auto-detects Vite. Confirm:
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Deploy.** Done.

CLI alternative:

```bash
npm i -g vercel
vercel        # follow prompts
vercel --prod # production deploy
```

(Netlify works the same way: build `npm run build`, publish `dist`.)

## Later / nice-to-have

- Firebase Firestore + Storage backup (offload images out of localStorage)
- Group/ungroup elements as a persistent unit (tried and reverted once already — see [ROADMAP.md](docs/ROADMAP.md))
