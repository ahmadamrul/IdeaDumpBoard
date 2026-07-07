import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createBoard,
  loadActiveId,
  loadBoards,
  saveActiveId,
  saveBoards,
} from '../lib/storage'

// Central store for all boards + which one is active.
// Persists to localStorage automatically (debounced) whenever boards change.
export function useBoards() {
  const [boards, setBoards] = useState(() => {
    const existing = loadBoards()
    if (existing.length) return existing
    return [createBoard('My First Board')]
  })

  const [activeId, setActiveId] = useState(() => {
    const saved = loadActiveId()
    return saved || null
  })

  // Ensure activeId always points at a real board.
  useEffect(() => {
    if (!boards.length) return
    if (!activeId || !boards.some((b) => b.id === activeId)) {
      setActiveId(boards[0].id)
    }
  }, [boards, activeId])

  // Debounced persistence.
  useEffect(() => {
    const t = setTimeout(() => saveBoards(boards), 300)
    return () => clearTimeout(t)
  }, [boards])

  useEffect(() => {
    saveActiveId(activeId)
  }, [activeId])

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeId) || boards[0] || null,
    [boards, activeId],
  )

  const addBoard = useCallback((name) => {
    const board = createBoard(name || 'Untitled Board')
    setBoards((prev) => [board, ...prev])
    setActiveId(board.id)
    return board
  }, [])

  const deleteBoard = useCallback((id) => {
    setBoards((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const renameBoard = useCallback((id, name) => {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, name, updatedAt: Date.now() } : b,
      ),
    )
  }, [])

  // Replace the elements array of the active board.
  const setElements = useCallback(
    (updater) => {
      setBoards((prev) =>
        prev.map((b) => {
          if (b.id !== (activeBoard && activeBoard.id)) return b
          const elements =
            typeof updater === 'function' ? updater(b.elements) : updater
          return { ...b, elements, updatedAt: Date.now() }
        }),
      )
    },
    [activeBoard],
  )

  const importBoard = useCallback((board) => {
    // Accept either a single board object or {boards:[...]}
    const incoming = Array.isArray(board?.boards) ? board.boards : [board]
    const normalized = incoming
      .filter((b) => b && Array.isArray(b.elements))
      .map((b) => ({ ...createBoard(b.name || 'Imported'), ...b, id: createBoard().id }))
    if (!normalized.length) {
      alert('That file does not look like a valid board export.')
      return
    }
    setBoards((prev) => [...normalized, ...prev])
    setActiveId(normalized[0].id)
  }, [])

  return {
    boards,
    activeBoard,
    activeId: activeBoard ? activeBoard.id : null,
    setActiveId,
    addBoard,
    deleteBoard,
    renameBoard,
    setElements,
    importBoard,
  }
}
