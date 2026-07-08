import { useEffect } from 'react'

// Minimal modal for confirm()/alert() replacements, styled to match the
// rest of the app's dark UI instead of the browser's native popup.
export default function ConfirmDialog({ dialog, onClose }) {
  useEffect(() => {
    if (!dialog) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose(false)
      if (e.key === 'Enter') onClose(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, onClose])

  if (!dialog) return null
  const isConfirm = dialog.variant === 'confirm'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(false)
      }}
    >
      <div className="w-80 rounded-md border border-slate-300 bg-white p-4 text-sm text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <p className="mb-4">{dialog.message}</p>
        <div className="flex justify-end gap-2">
          {isConfirm && (
            <button
              onClick={() => onClose(false)}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          )}
          <button
            autoFocus
            onClick={() => onClose(true)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              dialog.danger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {isConfirm ? dialog.confirmLabel || 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
