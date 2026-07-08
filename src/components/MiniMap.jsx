import { useMemo, useRef } from 'react'

const MM_WIDTH = 180
const MM_HEIGHT = 130
const PADDING = 60 // world-space padding around content so the map isn't too tight

// Rough bounding box for a single element in world coordinates.
function elementBounds(el) {
  const width = el.width || 120
  const height = el.height || (el.type === 'text' ? (el.fontSize || 16) * 1.4 : 80)
  return { x: el.x, y: el.y, width, height }
}

// Small fixed-size thumbnail (bottom-right) showing all elements plus the
// current viewport as a rectangle. Click (or drag) anywhere on it to jump
// the canvas so that spot is centered in the viewport.
export default function MiniMap({ elements, view, size, onViewChange }) {
  const mapRef = useRef(null)
  // Connectors have no position of their own — they follow their endpoints.
  const visible = useMemo(
    () => elements.filter((el) => el.type !== 'connector'),
    [elements],
  )

  // Bounds are derived from the ELEMENTS only (not the viewport), so the
  // thumbnail layout is stable while panning — only the viewport rectangle
  // moves. This also matches the "static like Miro/Figma" behavior and lets
  // the dots below be memoized so they aren't rebuilt on every pan frame.
  const bounds = useMemo(() => {
    if (!visible.length)
      return { minX: 0, minY: 0, width: 1, height: 1 }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const el of visible) {
      const b = elementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    }
    minX -= PADDING
    minY -= PADDING
    maxX += PADDING
    maxY += PADDING
    return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
  }, [visible])

  const scale = Math.min(MM_WIDTH / bounds.width, MM_HEIGHT / bounds.height)
  const offsetX = (MM_WIDTH - bounds.width * scale) / 2
  const offsetY = (MM_HEIGHT - bounds.height * scale) / 2

  const toMapPoint = (worldX, worldY) => ({
    x: offsetX + (worldX - bounds.minX) * scale,
    y: offsetY + (worldY - bounds.minY) * scale,
  })

  // Element dots depend only on elements + derived layout, never on `view` —
  // so panning/zooming the canvas doesn't rebuild them.
  const dots = useMemo(
    () =>
      visible.map((el) => {
        const b = elementBounds(el)
        const style = {
          left: offsetX + (b.x - bounds.minX) * scale,
          top: offsetY + (b.y - bounds.minY) * scale,
          width: Math.max(2, b.width * scale),
          height: Math.max(2, b.height * scale),
        }
        if (el.type === 'frame')
          return (
            <div
              key={el.id}
              className="absolute rounded-sm border border-slate-500/80"
              style={style}
            />
          )
        if (el.type === 'sticky')
          return (
            <div
              key={el.id}
              className="absolute rounded-sm"
              style={{ ...style, backgroundColor: el.fill || '#fde047' }}
            />
          )
        return (
          <div
            key={el.id}
            className="absolute rounded-sm bg-slate-400/70"
            style={style}
          />
        )
      }),
    [visible, bounds, scale, offsetX, offsetY],
  )

  const viewportWorld = {
    x: -view.x / view.scale,
    y: -view.y / view.scale,
    width: size.width / view.scale,
    height: size.height / view.scale,
  }
  const viewRectTL = toMapPoint(viewportWorld.x, viewportWorld.y)
  const viewRectBR = toMapPoint(
    viewportWorld.x + viewportWorld.width,
    viewportWorld.y + viewportWorld.height,
  )

  // Center the canvas viewport on the world point under the click.
  const handleClick = (e) => {
    if (!onViewChange) return
    const rect = mapRef.current.getBoundingClientRect()
    const worldX = bounds.minX + (e.clientX - rect.left - offsetX) / scale
    const worldY = bounds.minY + (e.clientY - rect.top - offsetY) / scale
    onViewChange((v) => ({
      ...v,
      x: size.width / 2 - worldX * v.scale,
      y: size.height / 2 - worldY * v.scale,
    }))
  }

  if (!elements.length) return null

  return (
    <div
      ref={mapRef}
      onClick={handleClick}
      className="absolute bottom-4 right-4 cursor-pointer overflow-hidden rounded-md border border-slate-300 bg-white/85 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80"
      style={{ width: MM_WIDTH, height: MM_HEIGHT }}
      title="Click to jump here"
    >
      {dots}
      <div
        className="absolute rounded-sm border border-indigo-400 bg-indigo-400/20"
        style={{
          left: viewRectTL.x,
          top: viewRectTL.y,
          width: Math.max(4, viewRectBR.x - viewRectTL.x),
          height: Math.max(4, viewRectBR.y - viewRectTL.y),
        }}
      />
    </div>
  )
}
