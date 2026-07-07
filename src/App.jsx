import { useCallback, useEffect, useRef, useState } from 'react'
import Canvas from './components/Canvas'
import ConfirmDialog from './components/ConfirmDialog'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import { useBoards } from './hooks/useBoards'
import { useDialog } from './hooks/useDialog'
import { useHistory } from './hooks/useHistory'
import { uid } from './lib/storage'

// Cap pasted/dropped images so localStorage doesn't blow up instantly.
const MAX_IMG_DIM = 900
const PASTE_OFFSET = 24
const DEFAULT_TEXT_WIDTH = 240
const DEFAULT_FONT_SIZE = 24

function idPrefix(type) {
  return type === 'image' ? 'img' : 'txt'
}

function fileToScaledDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new window.Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        const scale = Math.min(1, MAX_IMG_DIM / Math.max(width, height))
        width = Math.round(width * scale)
        height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        // WebP beats both PNG (lossless, huge) and JPEG (no alpha support)
        // for our case: it compresses photos ~25-40% smaller than JPEG at
        // the same visual quality, while still preserving transparency.
        // Browsers without WebP encoding support silently fall back to PNG.
        resolve({ src: canvas.toDataURL('image/webp', 0.82), width, height })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const {
    boards,
    activeBoard,
    activeId,
    setActiveId,
    addBoard,
    deleteBoard,
    renameBoard,
    setElements,
    importBoard,
  } = useBoards()

  const [selectedIds, setSelectedIds] = useState([])
  const [color, setColor] = useState('#f8fafc')
  const [showGrid, setShowGrid] = useState(true)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const stageRef = useRef(null)
  const fileInputRef = useRef(null)
  const importInputRef = useRef(null)
  const clipboardRef = useRef(null) // in-app clipboard for element copy/paste
  const { dialog, confirm, alertUser, close } = useDialog()

  const { record, undo, redo } = useHistory(activeId, (snapshot) =>
    setElements(snapshot),
  )

  // Commit a new elements array while recording the previous one for undo.
  const commit = useCallback(
    (updater) => {
      setElements((prev) => {
        record(prev)
        return typeof updater === 'function' ? updater(prev) : updater
      })
    },
    [setElements, record],
  )

  const elements = activeBoard?.elements || []

  // Reset selection when switching boards.
  useEffect(() => {
    setSelectedIds([])
  }, [activeId])

  // Convert the screen-space viewport center into canvas (world) coordinates,
  // so new elements land wherever the user has currently panned/zoomed to.
  const centerPoint = () => {
    const stage = stageRef.current
    const screenCx = stage ? stage.width() / 2 : 200
    const screenCy = stage ? stage.height() / 2 : 150
    return {
      x: (screenCx - view.x) / view.scale - 60,
      y: (screenCy - view.y) / view.scale - 20,
    }
  }

  const zoomBy = useCallback((factor) => {
    setView((v) => {
      const stage = stageRef.current
      const cx = stage ? stage.width() / 2 : 400
      const cy = stage ? stage.height() / 2 : 300
      const newScale = Math.max(0.2, Math.min(4, v.scale * factor))
      const worldX = (cx - v.x) / v.scale
      const worldY = (cy - v.y) / v.scale
      return {
        scale: newScale,
        x: cx - worldX * newScale,
        y: cy - worldY * newScale,
      }
    })
  }, [])

  const resetView = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), [])

  const addImage = useCallback(
    async (file) => {
      try {
        const { src, width, height } = await fileToScaledDataURL(file)
        const { x, y } = centerPoint()
        const el = {
          id: uid('img'),
          type: 'image',
          src,
          x: x - width / 2 + 60,
          y: y - height / 2 + 20,
          width,
          height,
          origWidth: width,
          origHeight: height,
          rotation: 0,
        }
        commit((prev) => [...prev, el])
        setSelectedIds([el.id])
      } catch (err) {
        console.error('Could not load image', err)
      }
    },
    [commit],
  )

  const addText = useCallback(() => {
    const { x, y } = centerPoint()
    const el = {
      id: uid('txt'),
      type: 'text',
      text: 'Double-click to edit',
      x,
      y,
      fontSize: DEFAULT_FONT_SIZE,
      fill: color,
      align: 'left',
      fontStyle: 'normal',
      width: DEFAULT_TEXT_WIDTH,
      origWidth: DEFAULT_TEXT_WIDTH,
      origFontSize: DEFAULT_FONT_SIZE,
      rotation: 0,
    }
    commit((prev) => [...prev, el])
    setSelectedIds([el.id])
  }, [commit, color])

  // Patch a single element.
  const updateElement = useCallback(
    (id, patch) => {
      commit((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      )
    },
    [commit],
  )

  // Patch several elements at once as a single undo step (e.g. group drag).
  const updateElements = useCallback(
    (patches) => {
      commit((prev) =>
        prev.map((el) => {
          const p = patches.find((p) => p.id === el.id)
          return p ? { ...el, ...p } : el
        }),
      )
    },
    [commit],
  )

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id))
  const selectedTexts = selectedElements.filter((el) => el.type === 'text')
  const selected = selectedElements[0] || null

  // --- Text formatting — applies to every selected text element at once ---
  const changeFontSize = useCallback(
    (delta) => {
      if (!selectedTexts.length) return
      commit((prev) =>
        prev.map((el) =>
          selectedTexts.some((t) => t.id === el.id)
            ? { ...el, fontSize: Math.max(8, Math.min(200, el.fontSize + delta)) }
            : el,
        ),
      )
    },
    [selectedTexts, commit],
  )

  const setAlign = useCallback(
    (align) => {
      if (!selectedTexts.length) return
      commit((prev) =>
        prev.map((el) =>
          selectedTexts.some((t) => t.id === el.id) ? { ...el, align } : el,
        ),
      )
    },
    [selectedTexts, commit],
  )

  const toggleStyle = useCallback(
    (kind) => {
      // kind: 'bold' | 'italic'
      if (!selectedTexts.length) return
      commit((prev) =>
        prev.map((el) => {
          if (!selectedTexts.some((t) => t.id === el.id)) return el
          const parts = new Set((el.fontStyle || 'normal').split(' '))
          parts.delete('normal')
          if (parts.has(kind)) parts.delete(kind)
          else parts.add(kind)
          return { ...el, fontStyle: parts.size ? [...parts].join(' ') : 'normal' }
        }),
      )
    },
    [selectedTexts, commit],
  )

  // --- Layer ordering (z-index = position in the elements array) ---
  const moveLayer = useCallback(
    (id, dir) => {
      if (!id) return
      commit((prev) => {
        const idx = prev.findIndex((e) => e.id === id)
        if (idx < 0) return prev
        const arr = [...prev]
        const [item] = arr.splice(idx, 1)
        if (dir === 'front') arr.push(item)
        else if (dir === 'back') arr.unshift(item)
        else if (dir === 'forward')
          arr.splice(Math.min(arr.length, idx + 1), 0, item)
        else if (dir === 'backward') arr.splice(Math.max(0, idx - 1), 0, item)
        return arr
      })
    },
    [commit],
  )

  const deleteElements = useCallback(
    (ids) => {
      if (!ids.length) return
      commit((prev) => prev.filter((el) => !ids.includes(el.id)))
      setSelectedIds((cur) => cur.filter((id) => !ids.includes(id)))
    },
    [commit],
  )

  const deleteSelected = useCallback(() => {
    deleteElements(selectedIds)
  }, [selectedIds, deleteElements])

  const resetSize = useCallback(
    (id) => {
      const el = elements.find((e) => e.id === id)
      if (!el) return
      if (el.type === 'image') {
        // Older images (added before this feature) never recorded their
        // original dimensions, so there's nothing meaningful to reset to.
        updateElement(id, {
          width: el.origWidth ?? el.width,
          height: el.origHeight ?? el.height,
        })
      } else {
        // Text always has a sensible default size to fall back to.
        updateElement(id, {
          width: el.origWidth ?? DEFAULT_TEXT_WIDTH,
          fontSize: el.origFontSize ?? DEFAULT_FONT_SIZE,
        })
      }
    },
    [elements, updateElement],
  )

  const clearBoard = useCallback(async () => {
    if (!elements.length) return
    const ok = await confirm('Clear all elements on this board?', {
      confirmLabel: 'Clear',
      danger: true,
    })
    if (ok) {
      commit([])
      setSelectedIds([])
    }
  }, [elements.length, commit, confirm])

  // Apply the active color to every selected text element.
  const handleColorChange = useCallback(
    (c) => {
      setColor(c)
      if (!selectedTexts.length) return
      commit((prev) =>
        prev.map((el) =>
          selectedTexts.some((t) => t.id === el.id) ? { ...el, fill: c } : el,
        ),
      )
    },
    [selectedTexts, commit],
  )

  // --- Lock (prevents drag/resize until unlocked) ---
  const toggleLock = useCallback(
    (ids) => {
      if (!ids || !ids.length) return
      const shouldLock = ids.some((id) => {
        const el = elements.find((e) => e.id === id)
        return el && !el.locked
      })
      commit((prev) =>
        prev.map((el) =>
          ids.includes(el.id) ? { ...el, locked: shouldLock } : el,
        ),
      )
    },
    [elements, commit],
  )

  // --- Comments — attached to an object (not a standalone element), added
  // via its right-click menu. Position is derived from the parent's x/y/width
  // at render time, so it always follows the object when moved.
  const setComment = useCallback(
    (id, patch) => {
      commit((prev) =>
        prev.map((el) =>
          el.id === id
            ? {
                ...el,
                comment: {
                  ...el.comment,
                  ...patch,
                  hidden: el.comment?.hidden ?? false,
                },
              }
            : el,
        ),
      )
    },
    [commit],
  )

  const toggleCommentVisibility = useCallback(
    (id) => {
      commit((prev) =>
        prev.map((el) =>
          el.id === id && el.comment
            ? { ...el, comment: { ...el.comment, hidden: !el.comment.hidden } }
            : el,
        ),
      )
    },
    [commit],
  )

  const deleteComment = useCallback(
    (id) => {
      commit((prev) =>
        prev.map((el) => {
          if (el.id !== id || !el.comment) return el
          const { comment, ...rest } = el
          return rest
        }),
      )
    },
    [commit],
  )

  // --- Duplicate (Ctrl+D / right-click menu) — offsets so copies don't stack ---
  const duplicateSelected = useCallback(
    (ids) => {
      const targetIds = ids && ids.length ? ids : selectedIds
      if (!targetIds.length) return
      const toDuplicate = elements.filter((el) => targetIds.includes(el.id))
      if (!toDuplicate.length) return
      const duplicated = toDuplicate.map((el) => ({
        ...el,
        id: uid(idPrefix(el.type)),
        x: el.x + PASTE_OFFSET,
        y: el.y + PASTE_OFFSET,
        locked: false,
      }))
      commit((prev) => [...prev, ...duplicated])
      setSelectedIds(duplicated.map((el) => el.id))
    },
    [elements, selectedIds, commit],
  )

  // --- Copy / paste (in-app clipboard, distinct from OS image paste) ---
  const copySelected = useCallback(() => {
    if (!selectedElements.length) return
    clipboardRef.current = selectedElements.map((el) => ({ ...el }))
  }, [selectedElements])

  const pasteClipboard = useCallback(() => {
    const clip = clipboardRef.current
    if (!clip || !clip.length) return false
    const idMap = new Map()
    const pasted = clip.map((el) => {
      const newId = uid(idPrefix(el.type))
      idMap.set(el.id, newId)
      return { ...el, id: newId, x: el.x + PASTE_OFFSET, y: el.y + PASTE_OFFSET }
    })
    commit((prev) => [...prev, ...pasted])
    setSelectedIds(pasted.map((el) => el.id))
    // Re-copy the pasted set so repeated Ctrl+V keeps cascading offsets.
    clipboardRef.current = pasted.map((el) => ({ ...el }))
    return true
  }, [commit])

  // ---- Export / import ----
  const exportPng = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    setSelectedIds([])
    // Defer so the transformer detaches before capture.
    requestAnimationFrame(() => {
      const uri = stage.toDataURL({ pixelRatio: 2 })
      const a = document.createElement('a')
      a.download = `${activeBoard?.name || 'board'}.png`
      a.href = uri
      a.click()
    })
  }, [activeBoard])

  const exportJson = useCallback(() => {
    if (!activeBoard) return
    const blob = new Blob([JSON.stringify(activeBoard, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.download = `${activeBoard.name || 'board'}.json`
    a.href = URL.createObjectURL(blob)
    a.click()
    URL.revokeObjectURL(a.href)
  }, [activeBoard])

  const handleImportFile = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          importBoard(JSON.parse(reader.result))
        } catch {
          alertUser('Invalid JSON file.')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [importBoard, alertUser],
  )

  // ---- Global keyboard + paste + drop ----
  useEffect(() => {
    const onKeyDown = (e) => {
      const typing =
        e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
      if (typing) return

      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (mod && e.key.toLowerCase() === 'c') {
        if (selectedIds.length) {
          e.preventDefault()
          copySelected()
        }
      } else if (mod && e.key.toLowerCase() === 'd') {
        if (selectedIds.length) {
          e.preventDefault()
          duplicateSelected(selectedIds)
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length) {
          e.preventDefault()
          deleteSelected()
        }
      }
    }

    const onPaste = (e) => {
      const items = e.clipboardData?.items
      let handledImage = false
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) addImage(file)
            handledImage = true
          }
        }
      }
      if (!handledImage) pasteClipboard()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('paste', onPaste)
    }
  }, [
    undo,
    redo,
    deleteSelected,
    selectedIds,
    addImage,
    copySelected,
    pasteClipboard,
    duplicateSelected,
  ])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/'),
      )
      files.forEach(addImage)
    },
    [addImage],
  )

  return (
    <div className="flex h-full w-full bg-slate-950">
      <Sidebar
        boards={boards}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={() => addBoard('Untitled Board')}
        onRename={renameBoard}
        onDelete={deleteBoard}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        confirmAction={confirm}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          boardName={activeBoard?.name || ''}
          color={color}
          onColorChange={handleColorChange}
          onAddText={addText}
          onUploadClick={() => fileInputRef.current?.click()}
          onDeleteSelected={deleteSelected}
          onClear={clearBoard}
          onUndo={undo}
          onRedo={redo}
          onExportPng={exportPng}
          onExportJson={exportJson}
          onImportClick={() => importInputRef.current?.click()}
          hasSelection={!!selectedIds.length}
          selectionCount={selectedIds.length}
          selected={selected}
          hasTextSelected={!!selectedTexts.length}
          onFontSize={changeFontSize}
          onAlign={setAlign}
          onToggleBold={() => toggleStyle('bold')}
          onToggleItalic={() => toggleStyle('italic')}
          onLayer={(dir) => moveLayer(selected?.id, dir)}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((v) => !v)}
          zoomPct={Math.round(view.scale * 100)}
          onZoomIn={() => zoomBy(1.2)}
          onZoomOut={() => zoomBy(1 / 1.2)}
          onZoomReset={resetView}
        />

        <div
          className="relative min-h-0 flex-1 bg-slate-100 dark:bg-slate-800"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Canvas
            stageRef={stageRef}
            elements={elements}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onChange={updateElement}
            onBatchChange={updateElements}
            showGrid={showGrid}
            view={view}
            onViewChange={setView}
            onLayer={moveLayer}
            onDeleteElement={deleteElements}
            onResetSize={resetSize}
            onDuplicate={duplicateSelected}
            onToggleLock={toggleLock}
            onCommentChange={setComment}
            onToggleComment={toggleCommentVisibility}
            onDeleteComment={deleteComment}
          />
          {elements.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
              <p className="text-lg font-medium">Empty board</p>
              <p className="text-sm">
                Paste a screenshot (Ctrl+V), drop an image, or add text.
              </p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          Array.from(e.target.files || []).forEach(addImage)
          e.target.value = ''
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={handleImportFile}
      />

      <ConfirmDialog dialog={dialog} onClose={close} />
    </div>
  )
}
