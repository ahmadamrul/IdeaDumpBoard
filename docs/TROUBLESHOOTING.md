# Troubleshooting / FAQ

Real issues that have come up while building/using this app, and how to
diagnose or fix them.

## The page is blank / white

This has two very different causes — check which one applies:

### 1. It's actually a different app / a cached page
**Symptom:** the browser tab's title bar shows a name that isn't
"IdeaDumpBoard", or you're looking at some other app's UI entirely.

**Cause:** another local project previously ran on the same port and
registered a **service worker**, which then intercepts requests to that port
and serves its own cached page instead of asking the dev server at all. This
is why `curl http://localhost:PORT/` can show the correct
"IdeaDumpBoard" HTML while the *browser* still shows something else — the
service worker never lets the browser's request reach the server.

**Fix:**
- This project pins its dev server to **port 5199** specifically to dodge
  known-conflicting ports (5173/5174) — make sure you're actually visiting
  `http://localhost:5199/`.
- If it still happens: open DevTools → **Application** tab → **Service
  Workers** → **Unregister** for that origin, then hard-refresh (`Ctrl+Shift+R`).
- Also avoid VS Code's built-in "Simple Browser" panel for this — it has its
  own caching behavior separate from a real browser. Use an actual Chrome/
  Edge/Firefox window.

### 2. It's a real JavaScript runtime error
**Symptom:** the tab title correctly says "IdeaDumpBoard", but the canvas
area never renders.

**Cause:** a React error during render — commonly a variable used before
it's declared (`Cannot access 'X' before initialization`). Notably, **this
kind of bug passes `npm run build` successfully** — it only fails at
*runtime*, in the browser, because it's about execution order, not syntax.

**Fix:**
1. Open DevTools (`F12`) → **Console** tab.
2. Look for a red error, usually a `ReferenceError` or `TypeError` with a
   file name and line number.
3. That line is almost always the actual bug — e.g. a `useCallback` that
   references another `useCallback`-wrapped function declared later in the
   same component. Move the declaration order, or check the dependency array.

## Reset Rotation moved the element to a weird position
This was a real bug, since fixed: resetting `rotation` to `0` without
recomputing `x`/`y` causes a jump, because Konva rotates a node around its
`(x, y)` origin (top-left), not its visual center. `Canvas.jsx`'s
`resetRotation` now recomputes the center first (using the node's actual
rendered width/height and current rotation angle) and repositions so the
center stays fixed. If you see this bug resurface after an edit to that
function, that's the invariant that broke.

## "Reset Size" does nothing
Only elements that were added **after** `origWidth`/`origHeight`/
`origFontSize` tracking was introduced have a recorded "original size" to
reset back to. For:
- **Text elements**: always works — falls back to app defaults (`240px`
  width, `24px` font) if the original wasn't recorded.
- **Image elements**: only works if `origWidth`/`origHeight` are present.
  Older images (added before this feature existed) have nothing to reset to,
  so the action is a no-op. Re-paste the image if you want it to be
  resettable going forward.

## Exported JSON file is much bigger than expected
Images are the culprit — they're embedded as base64 data-URLs. Two levers
already applied to keep this down:
- Downscaled to max 900px on the longest side.
- Encoded as **WebP** (quality 0.82) instead of PNG, since PNG is lossless
  and typically 5-10x larger for photographic content. (PNG is only kept for
  images with real transparency, or if the browser can't encode WebP.)

If a board's export still feels large, it's almost certainly holding images
added **before** the WebP change (still PNG) — delete and re-paste them to
pick up the smaller encoding. Further optional levers (each with a
trade-off): lower the WebP quality below `0.82`, or lower `MAX_IMG_DIM`
below `900` in `App.jsx` (both reduce fidelity, especially when zoomed in).

## "Could not save — storage is full" alert
`localStorage` has a hard ~5MB-per-origin cap in most browsers. This alert
fires when a write exceeds it (see `lib/storage.js`'s `saveBoards`). To
recover:
- Export boards you don't currently need (toolbar → Export) and delete them.
- Delete unused large images from boards you keep.
- There's no auto-cleanup or quota warning before this point today — it's a
  hard failure, not a graceful degrade.

## Pasting an image does nothing
- Make sure the browser tab/window is focused when you press `Ctrl+V` —
  paste is a `window`-level event listener, but the OS still needs the page
  focused to deliver the paste event to it.
- Check what's actually in your clipboard — if it's not image data (e.g. you
  copied plain text), `Ctrl+V` falls through to the in-app element clipboard
  instead (pasting a duplicate of your last `Ctrl+C`'d selection, if any).

## Rotate handle doesn't appear
Rotation is only enabled when **exactly one** element is selected — by
design (see [FEATURES.md](FEATURES.md)). If you have a multi-selection, the
rotate handle intentionally doesn't show; click empty canvas to clear the
selection, then click just the one element you want to rotate.

## The cursor doesn't change while panning / rotating
- Panning (right-click-hold-drag, or middle-mouse-drag) sets the cursor to
  a "grabbing" hand directly via the DOM (not React state) for performance;
  if it seems stuck, releasing the mouse button anywhere (even outside the
  canvas) should reset it — there's a window-level `mouseup` safety net for
  exactly this case.
- The rotate handle uses a custom circular-arrow cursor (an inline SVG data
  URI) instead of Konva's default crosshair `+`. If your browser doesn't
  support custom cursor images for some reason, it falls back to a plain
  pointer cursor.

## General debugging tips
- `npm run build` catches syntax errors but **not** runtime/logic errors —
  always also load the app in a real browser and check the Console.
- When in doubt about *why* something renders wrong, check whether the bug
  is upstream in `App.jsx` (wrong data/patch being committed) or downstream
  in `Canvas.jsx` (correct data, but a Konva rendering/transform quirk) —
  the two layers are cleanly separated (see [ARCHITECTURE.md](ARCHITECTURE.md)).
