import { useState } from 'react'

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
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-slate-800 bg-slate-900 pt-3">
        <button
          onClick={onToggleCollapsed}
          title="Show boards panel"
          className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          »
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-slate-100">
          📌 Boards
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
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            «
          </button>
        </div>
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
                  ? 'bg-indigo-600/20 text-indigo-200'
                  : 'hover:bg-slate-800 text-slate-300'
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
                  className="w-full rounded bg-slate-950 px-1 py-0.5 text-slate-100 outline-none ring-1 ring-indigo-500"
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
                  <span className="text-[10px] text-slate-500">
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

      <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-500">
        Double-click a name to rename. Auto-saved locally.
      </p>
    </aside>
  )
}
