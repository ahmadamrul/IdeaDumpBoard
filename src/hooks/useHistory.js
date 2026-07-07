import { useCallback, useEffect, useRef } from 'react'

// Lightweight undo/redo stack keyed by board id. Stores snapshots of the
// elements array. Call `record(prev)` right before a mutation, then `undo`
// restores the last snapshot and `redo` re-applies it.
export function useHistory(boardId, applyElements) {
  const undoStacks = useRef({}) // { [boardId]: elements[][] }
  const redoStacks = useRef({}) // { [boardId]: elements[][] }
  const MAX = 20

  // Drop history when switching boards is unnecessary — we key by id — but
  // guard against unbounded growth for the active board.
  const record = useCallback(
    (snapshot) => {
      if (!boardId) return
      const stack = undoStacks.current[boardId] || []
      stack.push(snapshot)
      if (stack.length > MAX) stack.shift()
      undoStacks.current[boardId] = stack
      // A fresh mutation invalidates whatever was previously undone.
      redoStacks.current[boardId] = []
    },
    [boardId],
  )

  const undo = useCallback(() => {
    if (!boardId) return
    const stack = undoStacks.current[boardId]
    if (!stack || !stack.length) return
    applyElements((current) => {
      const redoStack = redoStacks.current[boardId] || []
      redoStack.push(current)
      if (redoStack.length > MAX) redoStack.shift()
      redoStacks.current[boardId] = redoStack
      return stack.pop()
    })
  }, [boardId, applyElements])

  const redo = useCallback(() => {
    if (!boardId) return
    const redoStack = redoStacks.current[boardId]
    if (!redoStack || !redoStack.length) return
    applyElements((current) => {
      const stack = undoStacks.current[boardId] || []
      stack.push(current)
      if (stack.length > MAX) stack.shift()
      undoStacks.current[boardId] = stack
      return redoStack.pop()
    })
  }, [boardId, applyElements])

  const clear = useCallback(() => {
    if (boardId) {
      undoStacks.current[boardId] = []
      redoStacks.current[boardId] = []
    }
  }, [boardId])

  // Keep the ref objects from leaking across unmounts of the app.
  useEffect(
    () => () => {
      undoStacks.current = {}
      redoStacks.current = {}
    },
    [],
  )

  return { record, undo, redo, clear }
}
