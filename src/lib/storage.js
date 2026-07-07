// LocalStorage persistence for boards.

const BOARDS_KEY = 'mpp:boards'
const ACTIVE_KEY = 'mpp:activeBoardId'

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function loadBoards() {
  try {
    const raw = localStorage.getItem(BOARDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Failed to load boards', err)
    return []
  }
}

export function saveBoards(boards) {
  try {
    localStorage.setItem(BOARDS_KEY, JSON.stringify(boards))
  } catch (err) {
    // Most likely QuotaExceededError from large base64 images.
    console.error('Failed to save boards', err)
    alert('Could not save — storage is full. Try deleting some images or boards.')
  }
}

export function loadActiveId() {
  return localStorage.getItem(ACTIVE_KEY)
}

export function saveActiveId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

export function createBoard(name = 'Untitled Board') {
  const now = Date.now()
  return {
    id: uid('board'),
    name,
    elements: [],
    createdAt: now,
    updatedAt: now,
  }
}
