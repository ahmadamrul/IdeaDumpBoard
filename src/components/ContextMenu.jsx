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
      className="absolute z-50 min-w-44 rounded-md border border-slate-300 bg-white py-1 text-sm text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
        ) : (
          <button
            key={item.label}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            disabled={item.disabled}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-slate-700"
          >
            <span className="w-4 text-center text-slate-400">{item.icon}</span>
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
