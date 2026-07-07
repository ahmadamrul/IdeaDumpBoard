# Development Guide

## Getting Set Up
See [INSTALLATION.md](INSTALLATION.md) first. Once `npm run dev` is running,
you have hot module reload — most edits to `src/**/*.jsx` show up instantly
without a full page reload or losing your canvas state.

## Project Conventions

### Code style
- Functional components + hooks only. No class components.
- No global state library — state lives in `App.jsx` and flows down via
  props. Keep it that way unless the prop-drilling genuinely becomes
  unmanageable (it hasn't yet).
- **Every element mutation must go through `commit()` in `App.jsx`.** This is
  the single rule that keeps undo history correct. If you add a new action
  that changes `elements`, route it through `commit()` (directly, or via
  `updateElement`/`updateElements` which already do). Never call
  `setElements` directly for a user-facing mutation.
- No comments explaining *what* code does — only *why*, for non-obvious
  constraints (see existing comments in `Canvas.jsx` for the tone/level to
  match, e.g. the rotation-reset trigonometry).
- Tailwind utility classes directly in JSX; no separate CSS files per
  component.

### File organization
```
src/
  App.jsx           # all state + top-level wiring — start here
  components/       # presentational + Konva-interaction components
  hooks/             # useBoards, useHistory, useDialog
  lib/               # framework-agnostic helpers (storage.js)
```
New components go in `components/`; new stateful logic that isn't purely
UI goes in a hook under `hooks/`.

## Common Development Tasks

### Adding a new element property
1. Add the field to the element object in `App.jsx` (`addImage`/`addText`)
   with a sensible default.
2. Read it in `Canvas.jsx` where the shape is rendered (`<Text>`/`<URLImage>`).
3. If it's user-editable, add a control to `Toolbar.jsx` and a handler in
   `App.jsx` that goes through `commit()`.
4. Use a fallback (`el.newField ?? default`) everywhere you read it, since
   existing saved boards won't have the field — there's no migration system
   (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)).

### Adding a new toolbar button
Add the button + its prop callback in `Toolbar.jsx`, wire the callback in
`App.jsx` where `<Toolbar>` is rendered, and implement the actual state
change in `App.jsx` (through `commit()` if it mutates elements).

### Adding a new right-click menu item
Add an entry to the `items` array passed to `<ContextMenu>` in `Canvas.jsx`,
and either handle it locally (like `resetRotation`, which needs live Konva
node geometry) or via a prop callback down from `App.jsx` (like `onLayer`,
`onDeleteElement`, `onResetSize`).

### Working with Konva/react-konva
- Konva nodes are found by id via `stage.findOne('#' + id)` — every
  renderable element sets `id={el.id}` for this to work.
- `onTransformEnd` handlers must reset `node.scaleX()/scaleY()` to `1` and
  bake the scale into `width`/`height` (and `fontSize` for text corner-drags)
  — Konva's Transformer scales via `scaleX`/`scaleY`, not by changing
  `width`/`height` directly, so skipping this reset causes compounding scale
  bugs on the next transform.
- Rotation is around a node's `(x, y)` origin (top-left), not its center.
  Any code that needs to reset/recompute rotation while keeping the shape
  visually in place must recompute `x`/`y` using the trigonometry in
  `Canvas.jsx`'s `resetRotation` — don't just zero `rotation` and leave
  `x`/`y` unchanged, the shape will visibly jump.

## Testing Changes
There is currently no automated test suite. Verify changes by:
1. `npm run build` — catches syntax errors and confirms the production
   bundle compiles.
2. Running the dev server and manually exercising the changed feature in a
   real browser (not just the in-editor "Simple Browser" — see
   [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for why).
3. Checking the browser console for runtime errors (React errors often only
   surface at runtime, not at build time — e.g. a hook referencing a
   not-yet-declared variable builds fine but crashes on load).

## Git / Version Control
The project has a git repository with a `.gitignore` excluding
`node_modules/` and `dist/`.
