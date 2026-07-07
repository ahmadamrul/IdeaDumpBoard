import { useEffect, useRef } from 'react'

// Small right-click menu anchored at a screen position.
export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="absolute z-50 min-w-44 rounded-md border border-slate-700 bg-slate-800 py-1 text-sm text-slate-200 shadow-xl"
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="my-1 h-px bg-slate-700" />
        ) : (
          <button
            key={item.label}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            disabled={item.disabled}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <span className="w-4 text-center text-slate-400">{item.icon}</span>
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
