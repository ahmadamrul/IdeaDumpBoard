import { useCallback, useState } from 'react'

// Promise-based replacement for window.confirm/alert so popups can be
// styled to match the app instead of using the browser's native dialog.
export function useDialog() {
  const [dialog, setDialog] = useState(null) // { message, variant, resolve, confirmLabel, danger }

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({ message, variant: 'confirm', resolve, ...options })
    })
  }, [])

  const alertUser = useCallback((message) => {
    return new Promise((resolve) => {
      setDialog({ message, variant: 'alert', resolve })
    })
  }, [])

  const close = useCallback(
    (result) => {
      dialog?.resolve(result)
      setDialog(null)
    },
    [dialog],
  )

  return { dialog, confirm, alertUser, close }
}
