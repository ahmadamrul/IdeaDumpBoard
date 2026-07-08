import { useMemo } from 'react'
import { Shape } from 'react-konva'

// Konva's Text can only paint one fill per node, so multi-colored text
// (colored via selection while editing) is stored as `spans` on the element
// and rendered by this custom Shape: plain uniform layout, colors applied
// per character run.

const measureCtx = document.createElement('canvas').getContext('2d')

function fontString(fontStyle, fontSize, fontFamily) {
  const style = fontStyle && fontStyle !== 'normal' ? `${fontStyle} ` : ''
  return `${style}${fontSize}px ${fontFamily}`
}

// spans [{text, fill}] -> one fill per character, padded with `fallback`.
export function spansToFills(spans, text, fallback) {
  const fills = []
  spans?.forEach((s) => {
    for (const ch of s.text) fills.push(s.fill)
  })
  while (fills.length < text.length) fills.push(fallback)
  fills.length = text.length
  return fills
}

// One fill per character -> compact spans [{text, fill}].
export function fillsToSpans(text, fills) {
  const spans = []
  for (let i = 0; i < text.length; i++) {
    const fill = fills[i]
    const last = spans[spans.length - 1]
    if (last && last.fill === fill) last.text += text[i]
    else spans.push({ text: text[i], fill })
  }
  return spans
}

// Keep the per-char fills aligned with the text across an arbitrary textarea
// edit: diff old/new by common prefix+suffix, splice the middle. Inserted
// characters inherit the fill at the insertion point.
export function remapFills(fills, oldText, newText, fallback) {
  let p = 0
  const maxP = Math.min(oldText.length, newText.length)
  while (p < maxP && oldText[p] === newText[p]) p++
  let s = 0
  while (
    s < oldText.length - p &&
    s < newText.length - p &&
    oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]
  )
    s++
  const removed = oldText.length - p - s
  const insertedLen = newText.length - p - s
  const insertFill = fills[p - 1] ?? fills[p + removed] ?? fallback
  const next = [...fills]
  next.splice(p, removed, ...Array(insertedLen).fill(insertFill))
  return next
}

// Greedy word wrap producing lines with their global char offsets, so color
// runs can be looked up per line while drawing.
export function layoutLines(text, { fontStyle, fontSize, fontFamily, width, padding = 0 }) {
  measureCtx.font = fontString(fontStyle, fontSize, fontFamily)
  const maxW = Math.max(10, width - padding * 2)
  const measure = (str) => measureCtx.measureText(str).width
  const lines = []
  let global = 0
  for (const para of text.split('\n')) {
    if (para === '') {
      lines.push({ start: global, text: '' })
    } else {
      let start = 0
      while (start < para.length) {
        let end = start + 1
        while (
          end < para.length &&
          measure(para.slice(start, end + 1)) <= maxW
        )
          end++
        if (end >= para.length) {
          lines.push({ start: global + start, text: para.slice(start) })
          break
        }
        const sp = para.lastIndexOf(' ', end - 1)
        if (sp > start) {
          lines.push({ start: global + start, text: para.slice(start, sp) })
          start = sp + 1
        } else {
          lines.push({ start: global + start, text: para.slice(start, end) })
          start = end
        }
      }
    }
    global += para.length + 1 // account for the newline
  }
  return lines
}

export default function RichText({
  text,
  spans,
  fill,
  width,
  height,
  padding = 0,
  fontSize,
  fontFamily,
  fontStyle = 'normal',
  align = 'left',
  verticalAlign = 'top',
  lineHeight = 1.2,
  ...shapeProps
}) {
  const fills = useMemo(
    () => spansToFills(spans, text, fill),
    [spans, text, fill],
  )
  const lines = useMemo(
    () => layoutLines(text, { fontStyle, fontSize, fontFamily, width, padding }),
    [text, fontStyle, fontSize, fontFamily, width, padding],
  )
  const lineH = fontSize * lineHeight
  const contentH = lines.length * lineH

  const sceneFunc = (ctx, shape) => {
    ctx.font = fontString(fontStyle, fontSize, fontFamily)
    ctx.textBaseline = 'middle'
    const maxW = shape.width() - padding * 2
    let y = padding
    if (verticalAlign === 'middle')
      y += Math.max(0, (shape.height() - padding * 2 - contentH) / 2)
    for (const line of lines) {
      const lineW = ctx.measureText(line.text).width
      let x =
        padding +
        (align === 'center'
          ? (maxW - lineW) / 2
          : align === 'right'
            ? maxW - lineW
            : 0)
      let i = 0
      while (i < line.text.length) {
        const f = fills[line.start + i] || fill
        let j = i + 1
        while (j < line.text.length && (fills[line.start + j] || fill) === f)
          j++
        const run = line.text.slice(i, j)
        ctx.fillStyle = f
        ctx.fillText(run, x, y + lineH / 2)
        x += ctx.measureText(run).width
        i = j
      }
      y += lineH
    }
  }

  // A plain-rect hitFunc (plus the fill attr enabling hit paint) keeps the
  // shape clickable/draggable — the sceneFunc never calls fillStrokeShape.
  const hitFunc = (ctx, shape) => {
    ctx.beginPath()
    ctx.rect(0, 0, shape.width(), shape.height())
    ctx.closePath()
    ctx.fillStrokeShape(shape)
  }

  return (
    <Shape
      {...shapeProps}
      fill={fill}
      width={width}
      height={height ?? contentH + padding * 2}
      sceneFunc={sceneFunc}
      hitFunc={hitFunc}
    />
  )
}
