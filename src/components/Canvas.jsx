import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Arrow,
  Group,
  Label,
  Layer,
  Line,
  Rect,
  Stage,
  Tag,
  Text,
  Transformer,
} from 'react-konva'
import ContextMenu from './ContextMenu'
import MiniMap from './MiniMap'
import RichText, {
  fillsToSpans,
  layoutLines,
  remapFills,
  spansToFills,
} from './RichText'
import URLImage from './URLImage'

const GRID_SIZE = 40
const MIN_SCALE = 0.2
const MAX_SCALE = 4
// How close (in screen pixels) a dragged edge/center must come to another
// element's edge/center before it snaps and shows an alignment guide.
const SNAP_PX = 10
// The pannable/zoomable world is capped to this rect (world-space
// coordinates) so users can't scroll off into empty infinite space —
// panning stops once the canvas edge reaches the viewport edge.
const WORLD_BOUNDS = { minX: -2000, minY: -2000, maxX: 6000, maxY: 5000 }

// Approximate world-space size of any element (text height is derived from
// its font since it has no explicit height).
function elementSize(el) {
  return {
    w: el.width || 120,
    h: el.height || (el.type === 'text' ? (el.fontSize || 16) * 1.4 : 80),
  }
}

// Point on `rect`'s border along the line toward `toward`'s center, plus a
// small gap so arrows don't touch the shapes they connect.
function trimToEdge(rect, toward) {
  const dx = toward.cx - rect.cx
  const dy = toward.cy - rect.cy
  const len = Math.hypot(dx, dy)
  if (!len) return { x: rect.cx, y: rect.cy }
  const sx = dx ? rect.w / 2 / Math.abs(dx) : Infinity
  const sy = dy ? rect.h / 2 / Math.abs(dy) : Infinity
  const pad = 6
  // Cap short of the midpoint so overlapping shapes can't invert the arrow.
  const t = Math.min(Math.min(sx, sy) + pad / len, 0.45)
  return { x: rect.cx + dx * t, y: rect.cy + dy * t }
}

// Arrow endpoints between two elements, trimmed to their bounding boxes.
// `moved` optionally overrides x/y positions during a live drag.
function connectorPoints(fromEl, toEl, moved) {
  const fp = moved?.get(fromEl.id) || fromEl
  const tp = moved?.get(toEl.id) || toEl
  const fs = elementSize(fromEl)
  const ts = elementSize(toEl)
  const a = { cx: fp.x + fs.w / 2, cy: fp.y + fs.h / 2, ...fs }
  const b = { cx: tp.x + ts.w / 2, cy: tp.y + ts.h / 2, ...ts }
  const start = trimToEdge(a, b)
  const end = trimToEdge(b, a)
  return [start.x, start.y, end.x, end.y]
}

// Keep the viewport within WORLD_BOUNDS: if the (scaled) world is bigger
// than the viewport, clamp panning to its edges; if it's smaller (zoomed
// far out), center it instead of letting it float anywhere.
function clampView(view, size) {
  const { scale } = view
  const worldWidth = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) * scale
  const worldHeight = (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY) * scale

  let x
  if (worldWidth <= size.width) {
    x = (size.width - worldWidth) / 2 - WORLD_BOUNDS.minX * scale
  } else {
    const minX = size.width - WORLD_BOUNDS.maxX * scale
    const maxX = -WORLD_BOUNDS.minX * scale
    x = Math.min(maxX, Math.max(minX, view.x))
  }

  let y
  if (worldHeight <= size.height) {
    y = (size.height - worldHeight) / 2 - WORLD_BOUNDS.minY * scale
  } else {
    const minY = size.height - WORLD_BOUNDS.maxY * scale
    const maxY = -WORLD_BOUNDS.minY * scale
    y = Math.min(maxY, Math.max(minY, view.y))
  }

  return x === view.x && y === view.y ? view : { ...view, x, y }
}
const COMMENT_GAP = 16
const COMMENT_WIDTH = 200
const COMMENT_HEIGHT = 80
const COMMENT_FONT_SIZE = 14
const MIN_COMMENT_WIDTH = 120
const MAX_COMMENT_WIDTH = 480
const MIN_COMMENT_HEIGHT = 48
const MAX_COMMENT_HEIGHT = 400
const MIN_COMMENT_FONT_SIZE = 10
const MAX_COMMENT_FONT_SIZE = 28

// Simple line icons (matching the eye icons) so menu items don't rely on
// emoji, which render inconsistently across platforms.
const CommentIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const LockIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const UnlockIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
)

// Eye / eye-slash icons for the comment visibility menu item (no monkey emoji).
const EyeIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeOffIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

// Font choices offered while editing any text. Values are canvas-safe font
// stacks (Konva passes them straight to ctx.font, which accepts fallbacks).
const FONTS = [
  { label: 'Default', value: 'system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: '"Courier New", monospace' },
  { label: 'Casual', value: '"Comic Sans MS", "Segoe Print", cursive' },
  { label: 'Display', value: 'Impact, "Arial Black", sans-serif' },
]
const DEFAULT_FONT = FONTS[0].value

// Selection-color palettes shown in the editing bar. Light shades read well
// on the dark canvas (text elements); dark shades on yellow stickies.
const TEXT_EDIT_COLORS = ['#f8fafc', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc']
const STICKY_EDIT_COLORS = ['#1e293b', '#dc2626', '#1d4ed8', '#15803d', '#7e22ce', '#f8fafc']
const STICKY_TEXT_COLOR = '#1e293b'

// Group per-char fills into colored <span>s for the live editor preview.
function previewSpans(text, fills, fallback) {
  const out = []
  let i = 0
  while (i < text.length) {
    const f = fills[i] || fallback
    let j = i + 1
    while (j < text.length && (fills[j] || fallback) === f) j++
    out.push(
      <span key={i} style={{ color: f }}>
        {text.slice(i, j)}
      </span>,
    )
    i = j
  }
  return out
}

// Floating toolbar shown above an active text editor: font family choices
// plus size stepper. Buttons preventDefault on mousedown so the textarea
// underneath never loses focus (which would commit the edit).
function FontBar({ left, top, fontSize, fontFamily, minSize, maxSize, onChange, colors, onColor }) {
  const btn =
    'flex h-6 min-w-6 items-center justify-center rounded bg-slate-800 px-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700'
  return (
    <div
      className="flex items-center gap-1 rounded-md bg-slate-900/90 p-1 shadow-lg backdrop-blur-sm"
      style={{ position: 'absolute', left, top, zIndex: 10 }}
    >
      {FONTS.map((f) => (
        <button
          key={f.label}
          type="button"
          title={f.label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange({ fontFamily: f.value })}
          className={`${btn} ${
            (fontFamily || DEFAULT_FONT) === f.value
              ? 'ring-2 ring-indigo-400'
              : ''
          }`}
          style={{ fontFamily: f.value }}
        >
          Aa
        </button>
      ))}
      <div className="mx-0.5 h-4 w-px bg-slate-700" />
      <button
        type="button"
        title="Smaller text"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange({ fontSize: Math.max(minSize, fontSize - 2) })}
        className={btn}
      >
        A−
      </button>
      <span className="w-6 text-center text-xs text-slate-300">{fontSize}</span>
      <button
        type="button"
        title="Bigger text"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange({ fontSize: Math.min(maxSize, fontSize + 2) })}
        className={btn}
      >
        A+
      </button>
      {colors && (
        <>
          <div className="mx-0.5 h-4 w-px bg-slate-700" />
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              title="Color selected text"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onColor(c)}
              className="h-4 w-4 shrink-0 rounded-full border border-slate-600"
              style={{ backgroundColor: c }}
            />
          ))}
        </>
      )}
    </div>
  )
}

// Custom circular-arrow cursor for the Transformer's rotate handle, in
// place of Konva's default 'crosshair' (a plain "+").
const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'>
    <path d='M6 5a8 8 0 1 0 10 1.2' fill='none' stroke='#000' stroke-width='3.2' stroke-linecap='round'/>
    <path d='M6 5a8 8 0 1 0 10 1.2' fill='none' stroke='#fff' stroke-width='1.5' stroke-linecap='round'/>
    <path d='M17 2.5 18 8 12.5 6.5Z' fill='#000'/>
    <path d='M17 3.3 17.7 7 13.7 6Z' fill='#fff'/>
  </svg>`,
)}") 11 11, pointer`

// The whiteboard canvas. Renders draggable image + text elements, handles
// single/multi selection, resize+rotate (via Transformer), inline text
// editing, and pan/zoom of the viewport.
export default function Canvas({
  stageRef,
  elements,
  selectedIds,
  onSelectionChange, // (ids: string[]) => void
  onChange, // (id, patch) => void — commits a change to one element
  onBatchChange, // (patches: {id, ...}[]) => void — commits many at once
  showGrid,
  showMinimap,
  theme,
  snapEnabled,
  view,
  onViewChange, // ({ scale, x, y }) => void
  onLayer, // (id, 'front' | 'forward' | 'backward' | 'back') => void
  onDeleteElement, // (ids: string[]) => void
  onResetSize, // (id) => void
  onDuplicate, // (ids: string[]) => void
  onToggleLock, // (ids: string[]) => void
  onCommentChange, // (id, {text, width, fontSize}) => void — set/update the comment attached to an object
  onToggleComment, // (id) => void — show/hide the attached comment
  onDeleteComment, // (id) => void
  connecting, // null | { from: id|null } — connector-drawing mode state
  onConnectClick, // (id|null) => void — element clicked while connecting (null = cancel)
}) {
  const wrapperRef = useRef(null)
  const layerRef = useRef(null)
  const trRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [editing, setEditing] = useState(null) // { id, value, x, y, fontSize, fill }
  const [editingSticky, setEditingSticky] = useState(null) // { id, value, x, y, width, height, fill, fontSize }
  const [editingFrame, setEditingFrame] = useState(null) // { id, value, x, y }
  const [editingComment, setEditingComment] = useState(null) // { id, value, x, y }
  const [menu, setMenu] = useState(null) // { x, y, id }
  const [selectRect, setSelectRect] = useState(null) // {x,y,width,height} world coords
  const [guides, setGuides] = useState([]) // active alignment guide lines (world coords) during a drag
  const guideSigRef = useRef('') // last-rendered guide signature, to skip redundant setState

  const editAreaRef = useRef(null) // the active editing textarea, for selection-based coloring
  const selectDragRef = useRef(null) // { startX, startY } world coords, while drag-selecting
  const panRef = useRef(null) // { lastX, lastY } screen coords, while panning
  const groupDragRef = useRef(null) // Map<id, {x,y}> start positions during a group drag

  // Keep the stage sized to its container.
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Safety net: if the mouse button is released outside the canvas while
  // panning (Konva only sees mouseup within the stage), still stop the pan.
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (panRef.current) {
        panRef.current = null
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'default'
      }
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => window.removeEventListener('mouseup', onWindowMouseUp)
  }, [])

  // Re-clamp whenever the view or viewport size changes from elsewhere
  // (toolbar zoom buttons, reset, container resize), not just direct
  // pan/wheel gestures handled above.
  useEffect(() => {
    const clamped = clampView(view, size)
    if (clamped !== view) onViewChange(clamped)
  }, [view, size, onViewChange])

  // Attach the transformer to every selected node.
  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    if (!selectedIds.length || editing) {
      tr.nodes([])
      tr.getLayer()?.batchDraw()
      return
    }
    const nodes = selectedIds
      .filter((id) => {
        const el = elements.find((e) => e.id === id)
        // Connectors have no meaningful resize box — their shape derives
        // entirely from their endpoints.
        return el && !el.locked && el.type !== 'connector'
      })
      .map((id) => stage.findOne('#' + id))
      .filter(Boolean)
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds, elements, editing, stageRef])

  const openContextMenu = (evt, id) => {
    evt.evt.preventDefault()
    if (!selectedIds.includes(id)) onSelectionChange([id])
    const rect = wrapperRef.current?.getBoundingClientRect()
    setMenu({
      x: evt.evt.clientX - (rect?.left || 0),
      y: evt.evt.clientY - (rect?.top || 0),
      id,
    })
  }

  // Click on a shape: plain click replaces selection, shift/ctrl click toggles it.
  const handleShapeSelect = (e, id) => {
    if (connecting) {
      onConnectClick(id)
      return
    }
    const additive = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
    if (additive) {
      onSelectionChange(
        selectedIds.includes(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id],
      )
    } else if (!selectedIds.includes(id) || selectedIds.length === 1) {
      onSelectionChange([id])
    }
    // else: clicking an already-selected member of a multi-selection keeps
    // the whole group selected (so a group-drag can start from any member).
  }

  const handleStageMouseDown = (e) => {
    const stage = stageRef.current
    const clickedEmpty = e.target === stage

    // Middle-mouse anywhere, or right-click-hold on empty canvas, pans
    // instead of selecting. Right-click on a shape still opens its context
    // menu (handled separately by that shape's own onContextMenu).
    const wantsPan =
      e.evt.button === 1 || (clickedEmpty && e.evt.button === 2)
    if (wantsPan) {
      e.evt.preventDefault()
      panRef.current = { lastX: e.evt.clientX, lastY: e.evt.clientY }
      if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing'
      return
    }

    if (clickedEmpty && e.evt.button === 0) {
      if (connecting) {
        onConnectClick(null) // clicking empty canvas cancels connect mode
        return
      }
      onSelectionChange([])
      setMenu(null)
      const pos = stage.getRelativePointerPosition()
      selectDragRef.current = { startX: pos.x, startY: pos.y }
      setSelectRect({ x: pos.x, y: pos.y, width: 0, height: 0 })
    }
  }

  const handleStageMouseMove = (e) => {
    const stage = stageRef.current
    if (!stage) return

    if (panRef.current) {
      const { clientX, clientY } = e.evt
      const dx = clientX - panRef.current.lastX
      const dy = clientY - panRef.current.lastY
      panRef.current = { lastX: clientX, lastY: clientY }
      onViewChange(
        clampView({ ...view, x: view.x + dx, y: view.y + dy }, size),
      )
      return
    }

    if (selectDragRef.current) {
      const pos = stage.getRelativePointerPosition()
      const { startX, startY } = selectDragRef.current
      setSelectRect({
        x: Math.min(startX, pos.x),
        y: Math.min(startY, pos.y),
        width: Math.abs(pos.x - startX),
        height: Math.abs(pos.y - startY),
      })
    }
  }

  const handleStageMouseUp = () => {
    if (panRef.current) {
      panRef.current = null
      if (wrapperRef.current) wrapperRef.current.style.cursor = 'default'
      return
    }

    if (selectDragRef.current) {
      const rect = selectRect
      selectDragRef.current = null
      setSelectRect(null)
      if (rect && (rect.width > 4 || rect.height > 4)) {
        const layer = layerRef.current
        const hits = elements.filter((el) => {
          // Frames would swallow any marquee drawn inside them, and
          // connectors follow their endpoints anyway — select neither.
          if (el.type === 'frame' || el.type === 'connector') return false
          const node = layer?.findOne('#' + el.id)
          if (!node) return false
          const box = node.getClientRect({ relativeTo: layer })
          return (
            box.x < rect.x + rect.width &&
            box.x + box.width > rect.x &&
            box.y < rect.y + rect.height &&
            box.y + box.height > rect.y
          )
        })
        onSelectionChange(hits.map((el) => el.id))
      }
    }
  }

  // Zoom toward the cursor position on wheel scroll.
  const handleWheel = (e) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = view.scale
    const pointer = stage.getPointerPosition()
    const mousePointTo = {
      x: (pointer.x - view.x) / oldScale,
      y: (pointer.y - view.y) / oldScale,
    }
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const factor = 1.05
    let newScale = direction > 0 ? oldScale * factor : oldScale / factor
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    onViewChange(
      clampView(
        {
          scale: newScale,
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        },
        size,
      ),
    )
  }

  const startEditing = (el) => {
    onSelectionChange([])
    setEditing({
      id: el.id,
      value: el.text,
      x: el.x,
      y: el.y,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily || DEFAULT_FONT,
      fill: el.fill,
      fills: spansToFills(el.spans, el.text, el.fill),
      align: el.align || 'left',
      width: el.width || 240,
      fontStyle: el.fontStyle || 'normal',
    })
  }

  // Color button clicked while editing: recolor just the selected range of
  // the textarea, or everything when nothing is selected.
  const applySelectionColor = (setter, recolorsBase) => (color) => {
    const ta = editAreaRef.current
    const start = ta?.selectionStart ?? 0
    const end = ta?.selectionEnd ?? 0
    setter((s) => {
      if (!s) return s
      if (start === end) {
        return {
          ...s,
          ...(recolorsBase ? { fill: color } : {}),
          fills: s.fills.map(() => color),
        }
      }
      const fills = [...s.fills]
      for (let i = start; i < end && i < fills.length; i++) fills[i] = color
      return { ...s, fills }
    })
  }

  const startEditingSticky = (el) => {
    onSelectionChange([])
    setEditingSticky({
      id: el.id,
      value: el.text || '',
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fill: el.fill,
      fontSize: el.fontSize || 16,
      fontFamily: el.fontFamily || DEFAULT_FONT,
      fills: spansToFills(el.spans, el.text || '', STICKY_TEXT_COLOR),
    })
  }

  const commitEditingSticky = () => {
    if (!editingSticky) return
    const { value: text, fills } = editingSticky
    const uniform =
      !text.length ||
      (fills.every((f) => f === fills[0]) && fills[0] === STICKY_TEXT_COLOR)
    onChange(editingSticky.id, {
      text,
      fontSize: editingSticky.fontSize,
      fontFamily: editingSticky.fontFamily,
      spans: uniform ? undefined : fillsToSpans(text, fills),
    })
    setEditingSticky(null)
  }

  const startEditingFrame = (el) => {
    onSelectionChange([])
    setEditingFrame({
      id: el.id,
      value: el.title || 'Frame',
      x: el.x,
      y: el.y,
      fontSize: el.titleFontSize || 14,
      fontFamily: el.titleFontFamily || DEFAULT_FONT,
    })
  }

  const commitEditingFrame = () => {
    if (!editingFrame) return
    onChange(editingFrame.id, {
      title: editingFrame.value.trim() || 'Frame',
      titleFontSize: editingFrame.fontSize,
      titleFontFamily: editingFrame.fontFamily,
    })
    setEditingFrame(null)
  }

  // Comments live to the right of their parent object; position is derived
  // from the parent's current x/y/width so it always stays in sync.
  const startEditingComment = (el) => {
    setEditingComment({
      id: el.id,
      value: el.comment?.text || '',
      x: el.x + (el.width || 0) + COMMENT_GAP,
      y: el.y,
      width: el.comment?.width ?? COMMENT_WIDTH,
      height: el.comment?.height ?? COMMENT_HEIGHT,
      fontSize: el.comment?.fontSize ?? COMMENT_FONT_SIZE,
      fontFamily: el.comment?.fontFamily || DEFAULT_FONT,
    })
  }

  const commitEditingComment = () => {
    if (!editingComment) return
    const text = editingComment.value.trim()
    if (text) {
      onCommentChange(editingComment.id, {
        text,
        width: editingComment.width,
        height: editingComment.height,
        fontSize: editingComment.fontSize,
        fontFamily: editingComment.fontFamily,
      })
    } else {
      onDeleteComment(editingComment.id)
    }
    setEditingComment(null)
  }

  // Drag-resize the comment box from its right edge / bottom edge / corner.
  // Position (x/y) stays anchored to the parent object, so only width and
  // height — grown from the fixed top-left corner — are meaningful to drag.
  const startCommentResize = (axis) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = editingComment.width
    const startHeight = editingComment.height
    const onMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / view.scale
      const dy = (moveEvent.clientY - startY) / view.scale
      setEditingComment((s) => {
        if (!s) return s
        const next = { ...s }
        if (axis === 'e' || axis === 'se') {
          next.width = Math.max(
            MIN_COMMENT_WIDTH,
            Math.min(MAX_COMMENT_WIDTH, startWidth + dx),
          )
        }
        if (axis === 's' || axis === 'se') {
          next.height = Math.max(
            MIN_COMMENT_HEIGHT,
            Math.min(MAX_COMMENT_HEIGHT, startHeight + dy),
          )
        }
        return next
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Reset rotation while keeping the shape's visual center fixed. Konva
  // rotates around a node's (x, y) origin (its pre-rotation top-left), so
  // simply zeroing rotation without recomputing x/y would shift the shape.
  const resetRotation = (id) => {
    const stage = stageRef.current
    const node = stage?.findOne('#' + id)
    if (!node || node.rotation() === 0) return
    const rad = (node.rotation() * Math.PI) / 180
    const w = node.width()
    const h = node.height()
    const cx = node.x() + (w / 2) * Math.cos(rad) - (h / 2) * Math.sin(rad)
    const cy = node.y() + (w / 2) * Math.sin(rad) + (h / 2) * Math.cos(rad)
    onChange(id, { rotation: 0, x: cx - w / 2, y: cy - h / 2 })
  }

  // Snap a world-space value to the nearest grid line (no-op when the grid is hidden).
  const snap = (v) => (showGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v)

  // Constrains dragging to the grid. Konva calls this with the node's
  // absolute (canvas-pixel) position, so we convert to world space, snap,
  // then convert back before returning it.
  const dragBoundFunc = (pos) => {
    if (!showGrid) return pos
    const worldX = (pos.x - view.x) / view.scale
    const worldY = (pos.y - view.y) / view.scale
    return {
      x: snap(worldX) * view.scale + view.x,
      y: snap(worldY) * view.scale + view.y,
    }
  }

  // Only draw grid lines across the currently visible world region (plus a
  // small margin so edges never show while panning), instead of a fixed
  // 12000×12000 field. This keeps the count to a few dozen lines regardless
  // of zoom, versus ~600 static nodes redrawn on every pan/zoom frame.
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const margin = GRID_SIZE * 2
    const left = -view.x / view.scale
    const top = -view.y / view.scale
    const right = (size.width - view.x) / view.scale
    const bottom = (size.height - view.y) / view.scale
    const startX = Math.floor((left - margin) / GRID_SIZE) * GRID_SIZE
    const endX = Math.ceil((right + margin) / GRID_SIZE) * GRID_SIZE
    const startY = Math.floor((top - margin) / GRID_SIZE) * GRID_SIZE
    const endY = Math.ceil((bottom + margin) / GRID_SIZE) * GRID_SIZE
    const lines = []
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      lines.push({ key: `v${x}`, points: [x, startY, x, endY] })
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      lines.push({ key: `h${y}`, points: [startX, y, endX, y] })
    }
    return lines
  }, [showGrid, view, size])

  const commitEditing = () => {
    if (!editing) return
    const text = editing.value.trim()
    if (text) {
      // Trimming may drop leading chars — keep fills aligned before grouping.
      const offset = editing.value.indexOf(text)
      const fills = editing.fills.slice(offset, offset + text.length)
      const uniform = fills.length && fills.every((f) => f === fills[0])
      onChange(editing.id, {
        text,
        fontSize: editing.fontSize,
        fontFamily: editing.fontFamily,
        fill: uniform ? fills[0] : editing.fill,
        spans: uniform ? undefined : fillsToSpans(text, fills),
      })
    }
    setEditing(null)
  }

  // A comment isn't a Konva child of its parent object, so while dragging we
  // reposition its node by hand to keep it visually attached; the derived
  // x/y in the render below takes over again once the drag commits.
  const syncCommentNode = (stage, id, x, y) => {
    const commentNode = stage.findOne('#' + id + '-comment')
    if (!commentNode) return
    const el = elements.find((e) => e.id === id)
    commentNode.position({ x: x + (el?.width || 0) + COMMENT_GAP, y })
  }

  // Connector endpoints derive from element positions in state, so while a
  // drag is in flight we repoint the arrow nodes by hand (same idea as
  // syncCommentNode above).
  const syncConnectors = (stage, moved) => {
    elements.forEach((c) => {
      if (c.type !== 'connector') return
      if (!moved.has(c.from) && !moved.has(c.to)) return
      const arrow = stage.findOne('#' + c.id)
      const fromEl = elements.find((e) => e.id === c.from)
      const toEl = elements.find((e) => e.id === c.to)
      if (!arrow || !fromEl || !toEl) return
      arrow.points(connectorPoints(fromEl, toEl, moved))
    })
  }

  // Only re-render guide lines when the set actually changes — dragmove
  // fires on every pointer move and setState each time would thrash.
  const updateGuides = (next) => {
    const sig = next.map((g) => g.points.join(',')).join('|')
    if (sig !== guideSigRef.current) {
      guideSigRef.current = sig
      setGuides(next)
    }
  }

  // Snap the dragged element's edges/center to the nearest other element's
  // edges/center (within SNAP_PX on screen) and return the snapped world
  // position plus the guide lines to draw. `movingIds` are excluded as
  // targets since they travel with the drag.
  const computeSnap = (el, rawX, rawY, movingIds) => {
    const { w, h } = elementSize(el)
    const threshold = SNAP_PX / view.scale
    const dragV = [rawX, rawX + w / 2, rawX + w] // left, center, right
    const dragH = [rawY, rawY + h / 2, rawY + h] // top, middle, bottom
    let bestV = null
    let bestH = null
    for (const other of elements) {
      if (other.type === 'connector' || movingIds.has(other.id)) continue
      const os = elementSize(other)
      const ov = [other.x, other.x + os.w / 2, other.x + os.w]
      const oh = [other.y, other.y + os.h / 2, other.y + os.h]
      for (const dp of dragV) {
        for (const op of ov) {
          const diff = op - dp
          const ad = Math.abs(diff)
          if (ad <= threshold && (!bestV || ad < Math.abs(bestV.diff)))
            bestV = { diff, line: op, other, os }
        }
      }
      for (const dp of dragH) {
        for (const op of oh) {
          const diff = op - dp
          const ad = Math.abs(diff)
          if (ad <= threshold && (!bestH || ad < Math.abs(bestH.diff)))
            bestH = { diff, line: op, other, os }
        }
      }
    }
    const x = bestV ? rawX + bestV.diff : rawX
    const y = bestH ? rawY + bestH.diff : rawY
    const gs = []
    if (bestV) {
      const y1 = Math.min(y, bestV.other.y)
      const y2 = Math.max(y + h, bestV.other.y + bestV.os.h)
      gs.push({ points: [bestV.line, y1, bestV.line, y2] })
    }
    if (bestH) {
      const x1 = Math.min(x, bestH.other.x)
      const x2 = Math.max(x + w, bestH.other.x + bestH.os.w)
      gs.push({ points: [x1, bestH.line, x2, bestH.line] })
    }
    return { x, y, guides: gs }
  }

  // --- Group drag: moving one member of a multi-selection moves them all,
  // and dragging a frame carries every element inside it along. ---
  const handleDragStart = (id) => {
    const stage = stageRef.current
    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      const starts = new Map()
      selectedIds.forEach((sid) => {
        if (elements.find((el) => el.id === sid)?.locked) return
        const node = stage.findOne('#' + sid)
        if (node) starts.set(sid, { x: node.x(), y: node.y() })
      })
      groupDragRef.current = { leaderId: id, starts }
      return
    }

    const el = elements.find((e) => e.id === id)
    if (el?.type === 'frame') {
      const starts = new Map()
      const frameNode = stage.findOne('#' + id)
      if (frameNode) starts.set(id, { x: frameNode.x(), y: frameNode.y() })
      elements.forEach((other) => {
        if (
          other.id === id ||
          other.type === 'connector' ||
          other.type === 'frame' ||
          other.locked
        )
          return
        const s = elementSize(other)
        const cx = other.x + s.w / 2
        const cy = other.y + s.h / 2
        const inside =
          cx >= el.x &&
          cx <= el.x + el.width &&
          cy >= el.y &&
          cy <= el.y + el.height
        if (!inside) return
        const node = stage.findOne('#' + other.id)
        if (node) starts.set(other.id, { x: node.x(), y: node.y() })
      })
      groupDragRef.current = { leaderId: id, starts }
    }
  }

  const handleDragMove = (id, e) => {
    const stage = stageRef.current
    const node = e.target

    // Alignment guides snap the dragged element to other elements' edges and
    // centers. Runs alongside grid snapping (grid quantizes first via
    // dragBoundFunc; this then fine-tunes to real element edges).
    if (snapEnabled) {
      const el = elements.find((e) => e.id === id)
      if (el) {
        const grp = groupDragRef.current
        const movingIds =
          grp && grp.leaderId === id
            ? new Set(grp.starts.keys())
            : new Set([id])
        const snapped = computeSnap(el, node.x(), node.y(), movingIds)
        if (snapped.x !== node.x() || snapped.y !== node.y())
          node.position({ x: snapped.x, y: snapped.y })
        updateGuides(snapped.guides)
      }
    }

    syncCommentNode(stage, id, node.x(), node.y())

    const moved = new Map([[id, { x: node.x(), y: node.y() }]])
    const group = groupDragRef.current
    if (group && group.leaderId === id) {
      const leaderStart = group.starts.get(id)
      const dx = node.x() - leaderStart.x
      const dy = node.y() - leaderStart.y
      group.starts.forEach((start, sid) => {
        if (sid === id) return
        const pos = { x: start.x + dx, y: start.y + dy }
        const other = stage.findOne('#' + sid)
        if (other) other.position(pos)
        syncCommentNode(stage, sid, pos.x, pos.y)
        moved.set(sid, pos)
      })
      trRef.current?.forceUpdate()
    }
    syncConnectors(stage, moved)
    stage.batchDraw()
  }

  const handleDragEnd = (id, e) => {
    updateGuides([]) // clear alignment guides once the drag settles
    const group = groupDragRef.current
    if (group && group.leaderId === id) {
      const stage = stageRef.current
      const patches = [...group.starts.keys()].map((sid) => {
        const node = stage.findOne('#' + sid)
        return { id: sid, x: node.x(), y: node.y() }
      })
      groupDragRef.current = null
      onBatchChange(patches)
    } else {
      onChange(id, { x: e.target.x(), y: e.target.y() })
    }
  }

  // Frames render behind everything, connectors above frames but under the
  // content they link, regardless of array position.
  const orderedElements = useMemo(
    () => [
      ...elements.filter((el) => el.type === 'frame'),
      ...elements.filter((el) => el.type === 'connector'),
      ...elements.filter(
        (el) => el.type !== 'frame' && el.type !== 'connector',
      ),
    ],
    [elements],
  )

  // Precompute each connector's arrow points, memoized on `elements`. This
  // keeps the array references STABLE across re-renders that don't change
  // element positions (e.g. the snap feature's setGuides during a drag), so
  // react-konva won't overwrite the points we update imperatively in
  // syncConnectors mid-drag — which was causing the arrow to flicker to a
  // stale position while dragging a connected object.
  const connectorPointsMap = useMemo(() => {
    const map = {}
    for (const c of elements) {
      if (c.type !== 'connector') continue
      const fromEl = elements.find((e) => e.id === c.from)
      const toEl = elements.find((e) => e.id === c.to)
      if (fromEl && toEl) map[c.id] = connectorPoints(fromEl, toEl)
    }
    return map
  }, [elements])

  // Highlight the source element while picking a connector target.
  const connectSourceEl = connecting?.from
    ? elements.find((el) => el.id === connecting.from)
    : null

  const menuEl = menu ? elements.find((el) => el.id === menu.id) : null
  const menuLocked = !!menuEl?.locked
  const menuIds = menu
    ? selectedIds.includes(menu.id)
      ? selectedIds
      : [menu.id]
    : []

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      style={{ cursor: connecting ? 'crosshair' : undefined }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={view.scale}
        scaleY={view.scale}
        x={view.x}
        y={view.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        {showGrid && (
          <Layer listening={false}>
            {gridLines.map((l) => (
              <Line
                key={l.key}
                points={l.points}
                stroke={theme === 'light' ? '#cbd5e1' : '#475569'}
                strokeWidth={1}
                opacity={0.35}
              />
            ))}
          </Layer>
        )}
        <Layer ref={layerRef}>
          {orderedElements.map((el) => {
            if (el.type === 'connector') {
              const pts = connectorPointsMap[el.id]
              if (!pts) return null
              const isSelected = selectedIds.includes(el.id)
              return (
                <Arrow
                  key={el.id}
                  id={el.id}
                  points={pts}
                  stroke={isSelected ? '#818cf8' : '#94a3b8'}
                  fill={isSelected ? '#818cf8' : '#94a3b8'}
                  strokeWidth={2}
                  pointerLength={10}
                  pointerWidth={10}
                  hitStrokeWidth={16}
                  onClick={(e) => handleShapeSelect(e, el.id)}
                  onTap={() => handleShapeSelect({ evt: {} }, el.id)}
                  onContextMenu={(e) => openContextMenu(e, el.id)}
                />
              )
            }

            const common = {
              id: el.id,
              draggable: !el.locked,
              rotation: el.rotation || 0,
              opacity: el.locked ? 0.7 : 1,
              dragBoundFunc,
              onClick: (e) => handleShapeSelect(e, el.id),
              onTap: () => handleShapeSelect({ evt: {} }, el.id),
              onContextMenu: (e) => openContextMenu(e, el.id),
              onDragStart: () => handleDragStart(el.id),
              onDragMove: (e) => handleDragMove(el.id, e),
              onDragEnd: (e) => handleDragEnd(el.id, e),
            }

            let shapeNode = null

            if (el.type === 'image') {
              shapeNode = (
                <URLImage
                  key={el.id}
                  element={el}
                  {...common}
                  onTransformEnd={(e) => {
                    const node = e.target
                    const scaleX = node.scaleX()
                    const scaleY = node.scaleY()
                    node.scaleX(1)
                    node.scaleY(1)
                    onChange(el.id, {
                      x: snap(node.x()),
                      y: snap(node.y()),
                      width: Math.max(20, snap(node.width() * scaleX)),
                      height: Math.max(20, snap(node.height() * scaleY)),
                      rotation: node.rotation(),
                    })
                  }}
                />
              )
            } else if (el.type === 'sticky') {
              shapeNode = (
                <Group
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  {...common}
                  onDblClick={() => !el.locked && startEditingSticky(el)}
                  onDblTap={() => !el.locked && startEditingSticky(el)}
                  onTransformEnd={(e) => {
                    const node = e.target
                    const scaleX = node.scaleX()
                    const scaleY = node.scaleY()
                    node.scaleX(1)
                    node.scaleY(1)
                    onChange(el.id, {
                      x: snap(node.x()),
                      y: snap(node.y()),
                      width: Math.max(60, snap(el.width * scaleX)),
                      height: Math.max(60, snap(el.height * scaleY)),
                      rotation: node.rotation(),
                    })
                  }}
                >
                  <Rect
                    width={el.width}
                    height={el.height}
                    fill={el.fill || '#fde047'}
                    cornerRadius={4}
                    shadowColor="black"
                    shadowBlur={8}
                    shadowOpacity={0.3}
                    shadowOffsetY={3}
                  />
                  {el.spans?.length && editingSticky?.id !== el.id ? (
                    <RichText
                      width={el.width}
                      height={el.height}
                      padding={12}
                      text={el.text}
                      spans={el.spans}
                      fontSize={el.fontSize || 16}
                      fontFamily={el.fontFamily || DEFAULT_FONT}
                      fill={STICKY_TEXT_COLOR}
                      align="center"
                      verticalAlign="middle"
                      lineHeight={1.3}
                      listening={false}
                    />
                  ) : (
                    <Text
                      width={el.width}
                      height={el.height}
                      padding={12}
                      text={editingSticky?.id === el.id ? '' : el.text}
                      fontSize={el.fontSize || 16}
                      fontFamily={el.fontFamily || DEFAULT_FONT}
                      fill={STICKY_TEXT_COLOR}
                      align="center"
                      verticalAlign="middle"
                      lineHeight={1.3}
                      wrap="word"
                      listening={false}
                    />
                  )}
                </Group>
              )
            } else if (el.type === 'frame') {
              shapeNode = (
                <Group key={el.id} x={el.x} y={el.y} {...common}
                  onTransformEnd={(e) => {
                    const node = e.target
                    const scaleX = node.scaleX()
                    const scaleY = node.scaleY()
                    node.scaleX(1)
                    node.scaleY(1)
                    onChange(el.id, {
                      x: snap(node.x()),
                      y: snap(node.y()),
                      width: Math.max(120, snap(el.width * scaleX)),
                      height: Math.max(120, snap(el.height * scaleY)),
                      rotation: node.rotation(),
                    })
                  }}
                >
                  {/* Fill doesn't listen so clicks inside the frame still
                      reach the stage (deselect / marquee); the frame itself
                      is grabbed via its border or title. */}
                  <Rect
                    width={el.width}
                    height={el.height}
                    fill="rgba(100,116,139,0.08)"
                    cornerRadius={8}
                    listening={false}
                  />
                  <Rect
                    width={el.width}
                    height={el.height}
                    stroke={
                      selectedIds.includes(el.id) ? '#818cf8' : '#64748b'
                    }
                    strokeWidth={1.5}
                    dash={[8, 4]}
                    cornerRadius={8}
                    fillEnabled={false}
                    hitStrokeWidth={12}
                  />
                  <Text
                    y={-(el.titleFontSize || 14) - 10}
                    text={editingFrame?.id === el.id ? '' : el.title || 'Frame'}
                    fontSize={el.titleFontSize || 14}
                    fontFamily={el.titleFontFamily || DEFAULT_FONT}
                    fontStyle="bold"
                    fill="#94a3b8"
                    onDblClick={() => !el.locked && startEditingFrame(el)}
                    onDblTap={() => !el.locked && startEditingFrame(el)}
                  />
                </Group>
              )
            } else if (el.id !== editing?.id) {
              const TextNode = el.spans?.length ? RichText : Text
              shapeNode = (
                <TextNode
                  key={el.id}
                  text={el.text}
                  spans={el.spans}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  align={el.align || 'left'}
                  lineHeight={1.2}
                  fontSize={el.fontSize}
                  fontFamily={el.fontFamily || DEFAULT_FONT}
                  fill={el.fill}
                  fontStyle={el.fontStyle || 'normal'}
                  {...common}
                  onDblClick={() => startEditing(el)}
                  onDblTap={() => startEditing(el)}
                  onTransformEnd={(e) => {
                    const node = e.target
                    const scaleX = node.scaleX()
                    const scaleY = node.scaleY()
                    node.scaleX(1)
                    node.scaleY(1)
                    const patch = {
                      x: snap(node.x()),
                      y: snap(node.y()),
                      width: Math.max(40, snap(node.width() * scaleX)),
                      rotation: node.rotation(),
                    }
                    // Corner drag scales both axes -> scale the font too.
                    if (Math.abs(scaleY - 1) > 0.01) {
                      patch.fontSize = Math.max(
                        8,
                        Math.round(el.fontSize * scaleY),
                      )
                    }
                    onChange(el.id, patch)
                  }}
                />
              )
            }

            // Attached comment — position derives from the parent's current
            // x/y/width, so it's always in sync (dragging keeps it in sync
            // live via syncCommentNode above).
            const commentVisible =
              el.comment && !el.comment.hidden && editingComment?.id !== el.id
            const commentNode = commentVisible ? (
              <Label
                key={el.id + '-comment'}
                id={el.id + '-comment'}
                x={el.x + (el.width || 0) + COMMENT_GAP}
                y={el.y}
                opacity={el.locked ? 0.7 : 1}
                listening
                onDblClick={() => !el.locked && startEditingComment(el)}
                onDblTap={() => !el.locked && startEditingComment(el)}
                onContextMenu={(e) => openContextMenu(e, el.id)}
              >
                <Tag
                  fill="#fde68a"
                  stroke="#ca8a04"
                  strokeWidth={1}
                  pointerDirection="left"
                  pointerWidth={12}
                  pointerHeight={12}
                  lineJoin="round"
                  cornerRadius={6}
                  shadowColor="black"
                  shadowBlur={6}
                  shadowOpacity={0.25}
                  shadowOffsetY={2}
                />
                <Text
                  text={el.comment.text}
                  fontSize={el.comment.fontSize ?? COMMENT_FONT_SIZE}
                  fontFamily={el.comment.fontFamily || DEFAULT_FONT}
                  fill="#422006"
                  padding={10}
                  width={el.comment.width ?? COMMENT_WIDTH}
                  height={el.comment.height ?? COMMENT_HEIGHT}
                  wrap="word"
                />
              </Label>
            ) : null

            return (
              <Fragment key={el.id}>
                {shapeNode}
                {commentNode}
              </Fragment>
            )
          })}

          {connectSourceEl && (
            <Rect
              x={connectSourceEl.x - 6}
              y={connectSourceEl.y - 6}
              width={elementSize(connectSourceEl).w + 12}
              height={elementSize(connectSourceEl).h + 12}
              stroke="#6366f1"
              strokeWidth={2 / view.scale}
              dash={[6, 4]}
              cornerRadius={6}
              listening={false}
            />
          )}

          <Transformer
            ref={trRef}
            rotateEnabled={selectedIds.length === 1}
            rotateAnchorCursor={ROTATE_CURSOR}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
            ]}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
            }
          />

          {selectRect && (
            <Rect
              x={selectRect.x}
              y={selectRect.y}
              width={selectRect.width}
              height={selectRect.height}
              fill="rgba(99,102,241,0.15)"
              stroke="#6366f1"
              strokeWidth={1 / view.scale}
              listening={false}
            />
          )}

          {guides.map((g, i) => (
            <Line
              key={i}
              points={g.points}
              stroke="#f43f5e"
              strokeWidth={1.5 / view.scale}
              listening={false}
            />
          ))}
        </Layer>
      </Stage>

      {editing &&
        (() => {
          // Shared metrics so the colored preview div and the (transparent-
          // text) textarea line up glyph-for-glyph.
          const editorBox = {
            position: 'absolute',
            left: editing.x * view.scale + view.x,
            top: editing.y * view.scale + view.y,
            width: editing.width * view.scale,
            minHeight: editing.fontSize * 1.2 * view.scale * 2,
            fontSize: editing.fontSize * view.scale,
            fontFamily: editing.fontFamily || DEFAULT_FONT,
            fontWeight: editing.fontStyle.includes('bold') ? 700 : 400,
            fontStyle: editing.fontStyle.includes('italic')
              ? 'italic'
              : 'normal',
            textAlign: editing.align,
            lineHeight: 1.2,
            padding: 0,
            margin: 0,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }
          return (
            <>
              <FontBar
                left={editing.x * view.scale + view.x}
                top={Math.max(4, editing.y * view.scale + view.y - 38)}
                fontSize={editing.fontSize}
                fontFamily={editing.fontFamily}
                minSize={8}
                maxSize={200}
                onChange={(patch) => setEditing((s) => ({ ...s, ...patch }))}
                colors={TEXT_EDIT_COLORS}
                onColor={applySelectionColor(setEditing, true)}
              />
              <div
                aria-hidden
                style={{
                  ...editorBox,
                  border: '1px dashed transparent',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  pointerEvents: 'none',
                }}
              >
                {previewSpans(editing.value, editing.fills, editing.fill)}
              </div>
              <textarea
                ref={editAreaRef}
                className="rt-editor"
                autoFocus
                value={editing.value}
                onChange={(e) =>
                  setEditing((s) => ({
                    ...s,
                    value: e.target.value,
                    fills: remapFills(s.fills, s.value, e.target.value, s.fill),
                  }))
                }
                onBlur={commitEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    commitEditing()
                  }
                  if (e.key === 'Escape') setEditing(null)
                }}
                style={{
                  ...editorBox,
                  height:
                    (layoutLines(editing.value, {
                      fontStyle: editing.fontStyle,
                      fontSize: editing.fontSize,
                      fontFamily: editing.fontFamily || DEFAULT_FONT,
                      width: editing.width,
                    }).length +
                      1) *
                    editing.fontSize *
                    1.2 *
                    view.scale,
                  color: 'transparent',
                  caretColor: editing.fill,
                  border: '1px dashed #6366f1',
                  background: 'transparent',
                  outline: 'none',
                  resize: 'none',
                  transformOrigin: 'top left',
                }}
              />
            </>
          )
        })()}

      {editingSticky &&
        (() => {
          const stickyBox = {
            position: 'absolute',
            left: editingSticky.x * view.scale + view.x,
            top: editingSticky.y * view.scale + view.y,
            width: editingSticky.width * view.scale,
            height: editingSticky.height * view.scale,
            fontSize: editingSticky.fontSize * view.scale,
            fontFamily: editingSticky.fontFamily || DEFAULT_FONT,
            textAlign: 'center',
            lineHeight: 1.3,
            padding: 12 * view.scale,
            borderRadius: 4,
            margin: 0,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }
          return (
            <>
              <FontBar
                left={editingSticky.x * view.scale + view.x}
                top={Math.max(4, editingSticky.y * view.scale + view.y - 38)}
                fontSize={editingSticky.fontSize}
                fontFamily={editingSticky.fontFamily}
                minSize={8}
                maxSize={72}
                onChange={(patch) =>
                  setEditingSticky((s) => ({ ...s, ...patch }))
                }
                colors={STICKY_EDIT_COLORS}
                onColor={applySelectionColor(setEditingSticky, false)}
              />
              <div
                aria-hidden
                style={{
                  ...stickyBox,
                  background: editingSticky.fill || '#fde047',
                  border: '1px dashed transparent',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  pointerEvents: 'none',
                }}
              >
                {previewSpans(
                  editingSticky.value,
                  editingSticky.fills,
                  STICKY_TEXT_COLOR,
                )}
              </div>
              <textarea
                ref={editAreaRef}
                className="rt-editor"
                autoFocus
                value={editingSticky.value}
                onChange={(e) =>
                  setEditingSticky((s) => ({
                    ...s,
                    value: e.target.value,
                    fills: remapFills(
                      s.fills,
                      s.value,
                      e.target.value,
                      STICKY_TEXT_COLOR,
                    ),
                  }))
                }
                onBlur={commitEditingSticky}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    commitEditingSticky()
                  }
                  if (e.key === 'Escape') setEditingSticky(null)
                }}
                style={{
                  ...stickyBox,
                  background: 'transparent',
                  color: 'transparent',
                  caretColor: STICKY_TEXT_COLOR,
                  border: '1px dashed #6366f1',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </>
          )
        })()}

      {editingFrame && (
        <>
          <FontBar
            left={editingFrame.x * view.scale + view.x}
            top={Math.max(
              4,
              (editingFrame.y - editingFrame.fontSize - 10) * view.scale +
                view.y -
                40,
            )}
            fontSize={editingFrame.fontSize}
            fontFamily={editingFrame.fontFamily}
            minSize={8}
            maxSize={72}
            onChange={(patch) => setEditingFrame((s) => ({ ...s, ...patch }))}
          />
          <input
            autoFocus
            value={editingFrame.value}
            onChange={(e) =>
              setEditingFrame((s) => ({ ...s, value: e.target.value }))
            }
            onBlur={commitEditingFrame}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEditingFrame()
              if (e.key === 'Escape') setEditingFrame(null)
            }}
            style={{
              position: 'absolute',
              left: editingFrame.x * view.scale + view.x,
              top:
                (editingFrame.y - editingFrame.fontSize - 10) * view.scale +
                view.y -
                4,
              width: 200,
              fontSize: editingFrame.fontSize * view.scale,
              fontWeight: 700,
              fontFamily: editingFrame.fontFamily || DEFAULT_FONT,
              color: '#e2e8f0',
              background: '#1e293b',
              border: '1px solid #6366f1',
              borderRadius: 4,
              padding: '2px 6px',
              outline: 'none',
              zIndex: 10,
            }}
          />
        </>
      )}

      {editingComment && (
        <>
          <FontBar
            left={editingComment.x * view.scale + view.x}
            top={Math.max(4, editingComment.y * view.scale + view.y - 38)}
            fontSize={editingComment.fontSize}
            fontFamily={editingComment.fontFamily}
            minSize={MIN_COMMENT_FONT_SIZE}
            maxSize={MAX_COMMENT_FONT_SIZE}
            onChange={(patch) =>
              setEditingComment((s) => ({ ...s, ...patch }))
            }
          />
          <textarea
            autoFocus
            value={editingComment.value}
            onChange={(e) =>
              setEditingComment((s) => ({ ...s, value: e.target.value }))
            }
            onBlur={commitEditingComment}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commitEditingComment()
              }
              if (e.key === 'Escape') setEditingComment(null)
            }}
            style={{
              position: 'absolute',
              left: editingComment.x * view.scale + view.x,
              top: editingComment.y * view.scale + view.y,
              width: editingComment.width * view.scale,
              height: editingComment.height * view.scale,
              color: '#422006',
              fontSize: editingComment.fontSize * view.scale,
              fontFamily: editingComment.fontFamily || DEFAULT_FONT,
              lineHeight: 1.2,
              border: '1px solid #ca8a04',
              background: '#fde68a',
              outline: 'none',
              resize: 'none',
              padding: 8,
              margin: 0,
              overflow: 'hidden',
              transformOrigin: 'top left',
              borderRadius: 6,
            }}
          />
          {/* Drag handles: right edge = width, bottom edge = height, corner = both. */}
          <div
            onMouseDown={startCommentResize('e')}
            title="Drag to resize width"
            style={{
              position: 'absolute',
              left:
                (editingComment.x + editingComment.width) * view.scale +
                view.x -
                4,
              top:
                (editingComment.y + editingComment.height / 2) * view.scale +
                view.y -
                4,
              width: 8,
              height: 8,
              background: '#ca8a04',
              border: '1px solid #422006',
              borderRadius: 2,
              cursor: 'ew-resize',
              zIndex: 10,
            }}
          />
          <div
            onMouseDown={startCommentResize('s')}
            title="Drag to resize height"
            style={{
              position: 'absolute',
              left:
                (editingComment.x + editingComment.width / 2) * view.scale +
                view.x -
                4,
              top:
                (editingComment.y + editingComment.height) * view.scale +
                view.y -
                4,
              width: 8,
              height: 8,
              background: '#ca8a04',
              border: '1px solid #422006',
              borderRadius: 2,
              cursor: 'ns-resize',
              zIndex: 10,
            }}
          />
          <div
            onMouseDown={startCommentResize('se')}
            title="Drag to resize"
            style={{
              position: 'absolute',
              left:
                (editingComment.x + editingComment.width) * view.scale +
                view.x -
                5,
              top:
                (editingComment.y + editingComment.height) * view.scale +
                view.y -
                5,
              width: 10,
              height: 10,
              background: '#ca8a04',
              border: '1px solid #422006',
              borderRadius: 2,
              cursor: 'nwse-resize',
              zIndex: 10,
            }}
          />
        </>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: 'Bring to Front',
              icon: '⤒',
              disabled: menuLocked,
              onClick: () => onLayer(menu.id, 'front'),
            },
            {
              label: 'Bring Forward',
              icon: '↑',
              disabled: menuLocked,
              onClick: () => onLayer(menu.id, 'forward'),
            },
            {
              label: 'Send Backward',
              icon: '↓',
              disabled: menuLocked,
              onClick: () => onLayer(menu.id, 'backward'),
            },
            {
              label: 'Send to Back',
              icon: '⤓',
              disabled: menuLocked,
              onClick: () => onLayer(menu.id, 'back'),
            },
            { divider: true },
            {
              label: 'Duplicate',
              icon: '⧉',
              onClick: () => onDuplicate(menuIds),
            },
            {
              label: menuLocked ? 'Unlock' : 'Lock',
              icon: menuLocked ? UnlockIcon : LockIcon,
              onClick: () => onToggleLock(menuIds),
            },
            { divider: true },
            ...(menuEl?.comment
              ? [
                  {
                    label: 'Edit Comment',
                    icon: CommentIcon,
                    disabled: menuLocked,
                    onClick: () => startEditingComment(menuEl),
                  },
                  {
                    label: menuEl.comment.hidden
                      ? 'Show Comment'
                      : 'Hide Comment',
                    icon: menuEl.comment.hidden ? EyeIcon : EyeOffIcon,
                    disabled: menuLocked,
                    onClick: () => onToggleComment(menu.id),
                  },
                  {
                    label: 'Delete Comment',
                    icon: '🗑',
                    disabled: menuLocked,
                    onClick: () => onDeleteComment(menu.id),
                  },
                ]
              : [
                  {
                    label: 'Add Comment',
                    icon: CommentIcon,
                    disabled:
                      menuLocked || !menuEl || menuEl.type === 'connector',
                    onClick: () => startEditingComment(menuEl),
                  },
                ]),
            { divider: true },
            {
              label: 'Reset Rotation',
              icon: '⟲',
              disabled: menuLocked,
              onClick: () => resetRotation(menu.id),
            },
            {
              label: 'Reset Size',
              icon: '⤢',
              disabled: menuLocked,
              onClick: () => onResetSize(menu.id),
            },
            { divider: true },
            {
              label: 'Delete',
              icon: '🗑',
              disabled: menuLocked,
              onClick: () => onDeleteElement(menuIds),
            },
          ]}
        />
      )}

      {showMinimap && (
        <MiniMap
          elements={elements}
          view={view}
          size={size}
          onViewChange={onViewChange}
        />
      )}
    </div>
  )
}
