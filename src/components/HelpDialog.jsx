import { useEffect } from 'react'

// Keyboard shortcuts grouped by theme, rendered as <kbd> rows.
const SHORTCUTS = [
  {
    title: 'Tools',
    items: [
      { keys: ['P'], desc: 'Draw / pencil (also D)' },
      { keys: ['E'], desc: 'Eraser (click/drag a drawing to remove it)' },
      { keys: ['V'], desc: 'Back to the select tool' },
      { keys: ['Esc'], desc: 'Cancel connect / exit the current tool' },
    ],
  },
  {
    title: 'Edit',
    items: [
      { keys: ['Ctrl', 'Z'], desc: 'Undo' },
      { keys: ['Ctrl', 'Y'], desc: 'Redo (or Ctrl+Shift+Z)' },
      { keys: ['Ctrl', 'C'], desc: 'Copy selection' },
      { keys: ['Ctrl', 'V'], desc: 'Paste (image or copied elements)' },
      { keys: ['Ctrl', 'D'], desc: 'Duplicate selection' },
      { keys: ['Del'], desc: 'Delete selection (also Backspace)' },
    ],
  },
  {
    title: 'Canvas',
    items: [
      { keys: ['Wheel'], desc: 'Zoom toward the cursor' },
      { keys: ['Middle-drag'], desc: 'Pan the canvas' },
      { keys: ['Right-drag'], desc: 'Pan from empty canvas' },
      { keys: ['Drag'], desc: 'Rubber-band select from empty canvas' },
      { keys: ['Shift', 'Click'], desc: 'Add / remove from selection' },
      { keys: ['Double-click'], desc: 'Edit text, sticky, or frame title' },
      { keys: ['Right-click'], desc: 'Context menu (layer, lock, comment…)' },
    ],
  },
]

const TIPS = [
  'Draw mode: pick color, stroke width, and opacity in the toolbar, then click & drag.',
  'Grab a frame by its dashed border or its title.',
  'Paste a screenshot straight onto the board with Ctrl+V.',
]

function Kbd({ children }) {
  return (
    <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
      {children}
    </kbd>
  )
}

// Help overlay listing keyboard shortcuts and quick tips. Opened from the "!"
// button in the top-right corner.
export default function HelpDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-300 bg-white p-5 text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Help &amp; Shortcuts
          </h2>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {SHORTCUTS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.desc}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.desc}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
            Tips
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
