import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Label, Layer, Line, Rect, Stage, Tag, Text, Transformer } from 'react-konva'
import ContextMenu from './ContextMenu'
import URLImage from './URLImage'

const GRID_SIZE = 40
const MIN_SCALE = 0.2
const MAX_SCALE = 4
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
}) {
  const wrapperRef = useRef(null)
  const layerRef = useRef(null)
  const trRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [editing, setEditing] = useState(null) // { id, value, x, y, fontSize, fill }
  const [editingComment, setEditingComment] = useState(null) // { id, value, x, y }
  const [menu, setMenu] = useState(null) // { x, y, id }
  const [selectRect, setSelectRect] = useState(null) // {x,y,width,height} world coords

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
      .filter((id) => !elements.find((el) => el.id === id)?.locked)
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
      onViewChange({ ...view, x: view.x + dx, y: view.y + dy })
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
    onViewChange({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }

  const startEditing = (el) => {
    onSelectionChange([])
    setEditing({
      id: el.id,
      value: el.text,
      x: el.x,
      y: el.y,
      fontSize: el.fontSize,
      fill: el.fill,
      align: el.align || 'left',
      width: el.width || 240,
      fontStyle: el.fontStyle || 'normal',
    })
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

  // Grid lines span a large virtual area so they stay visible while panning/zooming.
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const BOUND = 6000
    const lines = []
    for (let x = -BOUND; x <= BOUND; x += GRID_SIZE) {
      lines.push({ key: `v${x}`, points: [x, -BOUND, x, BOUND] })
    }
    for (let y = -BOUND; y <= BOUND; y += GRID_SIZE) {
      lines.push({ key: `h${y}`, points: [-BOUND, y, BOUND, y] })
    }
    return lines
  }, [showGrid])

  const commitEditing = () => {
    if (!editing) return
    const text = editing.value.trim()
    if (text) onChange(editing.id, { text })
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

  // --- Group drag: moving one member of a multi-selection moves them all ---
  const handleDragStart = (id) => {
    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      const stage = stageRef.current
      const starts = new Map()
      selectedIds.forEach((sid) => {
        if (elements.find((el) => el.id === sid)?.locked) return
        const node = stage.findOne('#' + sid)
        if (node) starts.set(sid, { x: node.x(), y: node.y() })
      })
      groupDragRef.current = { leaderId: id, starts }
    }
  }

  const handleDragMove = (id, e) => {
    const stage = stageRef.current
    const node = e.target
    syncCommentNode(stage, id, node.x(), node.y())

    const group = groupDragRef.current
    if (!group || group.leaderId !== id) return
    const leaderStart = group.starts.get(id)
    const dx = node.x() - leaderStart.x
    const dy = node.y() - leaderStart.y
    group.starts.forEach((start, sid) => {
      if (sid === id) return
      const other = stage.findOne('#' + sid)
      if (other) other.position({ x: start.x + dx, y: start.y + dy })
      syncCommentNode(stage, sid, start.x + dx, start.y + dy)
    })
    trRef.current?.forceUpdate()
    stage.batchDraw()
  }

  const handleDragEnd = (id, e) => {
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
                stroke="#475569"
                strokeWidth={1}
                opacity={0.35}
              />
            ))}
          </Layer>
        )}
        <Layer ref={layerRef}>
          {elements.map((el) => {
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
            } else if (el.id !== editing?.id) {
              shapeNode = (
                <Text
                  key={el.id}
                  text={el.text}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  align={el.align || 'left'}
                  fontSize={el.fontSize}
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
        </Layer>
      </Stage>

      {editing && (
        <textarea
          autoFocus
          value={editing.value}
          onChange={(e) => setEditing((s) => ({ ...s, value: e.target.value }))}
          onBlur={commitEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              commitEditing()
            }
            if (e.key === 'Escape') setEditing(null)
          }}
          style={{
            position: 'absolute',
            left: editing.x * view.scale + view.x,
            top: editing.y * view.scale + view.y,
            width: editing.width * view.scale,
            color: editing.fill,
            fontSize: editing.fontSize * view.scale,
            fontFamily: 'system-ui, sans-serif',
            fontWeight: editing.fontStyle.includes('bold') ? 700 : 400,
            fontStyle: editing.fontStyle.includes('italic') ? 'italic' : 'normal',
            textAlign: editing.align,
            lineHeight: 1.2,
            border: '1px dashed #6366f1',
            background: 'transparent',
            outline: 'none',
            resize: 'none',
            padding: 0,
            margin: 0,
            overflow: 'hidden',
            transformOrigin: 'top left',
          }}
        />
      )}

      {editingComment && (
        <>
          <div
            style={{
              position: 'absolute',
              left: editingComment.x * view.scale + view.x,
              top: editingComment.y * view.scale + view.y - 30,
              zIndex: 10,
              display: 'flex',
              gap: 4,
            }}
          >
            <button
              type="button"
              title="Smaller text"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                setEditingComment((s) => ({
                  ...s,
                  fontSize: Math.max(MIN_COMMENT_FONT_SIZE, s.fontSize - 2),
                }))
              }
              className="h-6 min-w-6 rounded bg-slate-800 px-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              A−
            </button>
            <button
              type="button"
              title="Bigger text"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                setEditingComment((s) => ({
                  ...s,
                  fontSize: Math.min(MAX_COMMENT_FONT_SIZE, s.fontSize + 2),
                }))
              }
              className="h-6 min-w-6 rounded bg-slate-800 px-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              A+
            </button>
          </div>
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
              fontFamily: 'system-ui, sans-serif',
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
                    disabled: menuLocked || !menuEl,
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
    </div>
  )
}
