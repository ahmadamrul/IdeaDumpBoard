# Database Schema (localStorage)

There is no server-side database. All persistence is the browser's
`localStorage`, storing plain JSON under two keys.

## Keys

| Key | Contents |
| --- | --- |
| `mpp:boards` | Array of all boards (see below). |
| `mpp:activeBoardId` | The id of the last-open board (a plain string). |

## `mpp:boards` Shape

```json
[
  {
    "id": "board-l3x9k2-ab3f1",
    "name": "Project A",
    "createdAt": 1735680000000,
    "updatedAt": 1735683600000,
    "elements": [ /* Element[], see below */ ]
  }
]
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Generated via `uid('board')`. |
| `name` | `string` | User-editable board name. |
| `createdAt` / `updatedAt` | `number` | `Date.now()` timestamps; `updatedAt` bumps on any edit. |
| `elements` | `Element[]` | See below — the actual whiteboard content. |

## Element Shapes

Every element has these common fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | `uid('img')` or `uid('txt')`. |
| `type` | `'image' \| 'text'` | Discriminates the shape below. |
| `x`, `y` | `number` | Top-left position in board/world coordinates (unaffected by viewport pan/zoom). |
| `rotation` | `number` | Degrees, default `0`. |

### Image element
```json
{
  "id": "img-l3x9k2-ab3f1",
  "type": "image",
  "src": "data:image/webp;base64,...",
  "x": 0, "y": 0,
  "width": 400, "height": 300,
  "origWidth": 400, "origHeight": 300,
  "rotation": 0
}
```
- `src` — a base64 data-URL. Encoded as **WebP** (quality 0.82) for normal
  photos, or **PNG** if the source image has an actual alpha channel, or if
  the browser can't encode WebP (silent fallback).
- Images are downscaled before encoding so neither dimension exceeds
  **900px** (`MAX_IMG_DIM` in `App.jsx`) — this keeps `localStorage` usage
  reasonable, at some cost to fidelity if you zoom in very far.
- `origWidth`/`origHeight` — the dimensions at the moment the image was
  added; used by "Reset Size" in the right-click menu. **Images added before
  this field existed won't have it**, so Reset Size is a no-op for them.

### Text element
```json
{
  "id": "txt-l3x9k2-ab3f1",
  "type": "text",
  "text": "Double-click to edit",
  "x": 100, "y": 100,
  "width": 240, "fontSize": 24,
  "fill": "#f8fafc",
  "align": "left",
  "fontStyle": "normal",
  "origWidth": 240, "origFontSize": 24,
  "rotation": 0
}
```
- `width` — the text box's wrap width (dragging a side handle changes this;
  dragging a corner handle changes `fontSize` instead).
- `fontStyle` — space-joined combination of `bold`/`italic`, or `'normal'`
  (e.g. `"bold italic"`).
- `align` — `'left' | 'center' | 'right'`.
- `origWidth`/`origFontSize` — recorded at creation time, always present
  (unlike images, every text element gets sensible fallback defaults —
  `240`/`24` — if these are ever missing).

## Storage Limits
`localStorage` is capped at roughly **5MB per origin** in most browsers. This
is the main practical ceiling on how many/how large images a board can hold.
Mitigations already in place:
- Image downscaling (900px max) + WebP compression (see above).
- If a write fails (quota exceeded), `saveBoards()` in `lib/storage.js`
  catches the error and shows an alert rather than silently losing data or
  crashing.

If this becomes a real limitation, the documented path forward is adding
Firebase Storage/Firestore as an optional backend (see
[ROADMAP.md](ROADMAP.md)) — not implemented today.

## No Migrations
There is no schema versioning or migration system. Fields have been added
over time (`rotation`, `origWidth`, `origHeight`, `origFontSize`,
`align`, `fontStyle`) directly onto the element shape; all code that reads
these fields uses `??`/`||` fallbacks so older boards saved before a field
existed keep working without a migration step.
