import { useMemo } from 'react'

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
// current viewport as a rectangle. Purely visual, like Miro/Figma's
// mini-map — it does not respond to clicks or drags.
export default function MiniMap({ elements, view, size }) {
  // Connectors have no position of their own — they follow their endpoints.
  const visible = useMemo(
    () => elements.filter((el) => el.type !== 'connector'),
    [elements],
  )

  const viewportWorld = useMemo(
    () => ({
      x: -view.x / view.scale,
      y: -view.y / view.scale,
      width: size.width / view.scale,
      height: size.height / view.scale,
    }),
    [view, size],
  )

  const bounds = useMemo(() => {
    let minX = viewportWorld.x
    let minY = viewportWorld.y
    let maxX = viewportWorld.x + viewportWorld.width
    let maxY = viewportWorld.y + viewportWorld.height

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
  }, [visible, viewportWorld])

  const scale = Math.min(MM_WIDTH / bounds.width, MM_HEIGHT / bounds.height)

  // Center the content within the fixed-size map.
  const offsetX = (MM_WIDTH - bounds.width * scale) / 2
  const offsetY = (MM_HEIGHT - bounds.height * scale) / 2

  const toMapPoint = (worldX, worldY) => ({
    x: offsetX + (worldX - bounds.minX) * scale,
    y: offsetY + (worldY - bounds.minY) * scale,
  })

  const viewRectTL = toMapPoint(viewportWorld.x, viewportWorld.y)
  const viewRectBR = toMapPoint(
    viewportWorld.x + viewportWorld.width,
    viewportWorld.y + viewportWorld.height,
  )

  if (!elements.length) return null

  return (
    <div
      className="pointer-events-none absolute bottom-4 right-4 overflow-hidden rounded-md border border-slate-700 bg-slate-900/80 shadow-lg backdrop-blur-sm"
      style={{ width: MM_WIDTH, height: MM_HEIGHT }}
    >
      {visible.map((el) => {
        const b = elementBounds(el)
        const p = toMapPoint(b.x, b.y)
        const style = {
          left: p.x,
          top: p.y,
          width: Math.max(2, b.width * scale),
          height: Math.max(2, b.height * scale),
        }
        if (el.type === 'frame') {
          return (
            <div
              key={el.id}
              className="absolute rounded-sm border border-slate-500/80"
              style={style}
            />
          )
        }
        if (el.type === 'sticky') {
          return (
            <div
              key={el.id}
              className="absolute rounded-sm"
              style={{ ...style, backgroundColor: el.fill || '#fde047' }}
            />
          )
        }
        return (
          <div
            key={el.id}
            className="absolute rounded-sm bg-slate-400/70"
            style={style}
          />
        )
      })}
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
