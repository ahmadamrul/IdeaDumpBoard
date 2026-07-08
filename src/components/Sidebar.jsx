import { useState } from 'react'

const svgProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const SunIcon = (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const MoonIcon = (
  <svg {...svgProps}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
  </svg>
)
// Kanban-style columns — the "boards" glyph for the panel header.
const BoardsIcon = (
  <svg {...svgProps} width="15" height="15">
    <rect x="3" y="4" width="7" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="10" rx="1.5" />
  </svg>
)

export default function Sidebar({
  boards,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  collapsed,
  onToggleCollapsed,
  confirmAction,
  theme,
  onToggleTheme,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  const startRename = (board) => {
    setEditingId(board.id)
    setDraft(board.name)
  }

  const commitRename = () => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim())
    setEditingId(null)
  }

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-slate-300 bg-white pt-3 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onToggleCollapsed}
          title="Show boards panel"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          »
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-300 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600/15 text-indigo-600 dark:bg-indigo-600/25 dark:text-indigo-300">
            {BoardsIcon}
          </span>
          Boards
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreate()}
            title="New board"
            className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500"
          >
            + New
          </button>
          <button
            onClick={onToggleCollapsed}
            title="Hide boards panel"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            «
          </button>
        </div>
      </div>

      {/* Theme toggle, next to the board controls. */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {theme === 'dark' ? SunIcon : MoonIcon}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {boards.map((board) => {
          const isActive = board.id === activeId
          return (
            <div
              key={board.id}
              onClick={() => onSelect(board.id)}
              className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-200'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {editingId === board.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded bg-slate-100 px-1 py-0.5 text-slate-900 outline-none ring-1 ring-indigo-500 dark:bg-slate-950 dark:text-slate-100"
                />
              ) : (
                <>
                  <span
                    className="flex-1 truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      startRename(board)
                    }}
                    title={board.name}
                  >
                    {board.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {board.elements.length}
                  </span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const ok = await confirmAction(`Delete "${board.name}"?`, {
                        confirmLabel: 'Delete',
                        danger: true,
                      })
                      if (ok) onDelete(board.id)
                    }}
                    title="Delete board"
                    className="opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <p className="border-t border-slate-300 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Double-click a name to rename. Auto-saved locally.
      </p>
    </aside>
  )
}
