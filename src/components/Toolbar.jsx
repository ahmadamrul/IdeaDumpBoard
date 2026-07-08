const COLORS = ['#f8fafc', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc']

export default function Toolbar({
  boardName,
  color,
  onColorChange,
  onAddText,
  onAddSticky,
  onAddFrame,
  connecting,
  onToggleConnect,
  onUploadClick,
  onDeleteSelected,
  onClear,
  onUndo,
  onRedo,
  onExportPng,
  onExportJson,
  onImportClick,
  hasSelection,
  selectionCount,
  selected,
  hasTextSelected,
  onFontSize,
  onAlign,
  onToggleBold,
  onToggleItalic,
  onLayer,
  showGrid,
  onToggleGrid,
  showMinimap,
  onToggleMinimap,
  zoomPct,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isFullscreen,
  onToggleFullscreen,
}) {
  const btn =
    'rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'
  const iconBtn =
    'flex h-8 min-w-8 items-center justify-center rounded-md bg-slate-800 px-2 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'

  const isBold = (selected?.fontStyle || '').includes('bold')
  const isItalic = (selected?.fontStyle || '').includes('italic')
  const align = selected?.align || 'left'
  const alignBtn = (val) =>
    `${iconBtn} ${align === val ? 'ring-2 ring-indigo-400' : ''}`

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2 text-slate-200">
      <span className="mr-2 max-w-40 truncate text-sm font-semibold text-slate-100">
        {boardName}
      </span>
      {selectionCount > 1 && (
        <span className="mr-1 rounded-full bg-indigo-600/30 px-2 py-0.5 text-xs text-indigo-200">
          {selectionCount} selected
        </span>
      )}

      <button
        className={`${btn} bg-indigo-600 text-white hover:bg-indigo-500`}
        onClick={onAddText}
      >
        + Text
      </button>
      <button
        className={`${btn} bg-amber-400 text-slate-900 hover:bg-amber-300`}
        onClick={onAddSticky}
        title="Add sticky note"
      >
        🟨 Note
      </button>
      <button
        className={`${btn} bg-slate-800 hover:bg-slate-700`}
        onClick={onUploadClick}
      >
        ⬆ Image
      </button>
      <button
        className={`${btn} bg-slate-800 hover:bg-slate-700`}
        onClick={onAddFrame}
        title="Add frame to group ideas"
      >
        🖼 Frame
      </button>
      <button
        className={`${btn} ${
          connecting
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
        onClick={onToggleConnect}
        title="Connect two elements with an arrow (Esc to cancel)"
      >
        ↔ Connect
      </button>

      <div className="mx-1 flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            title={c}
            className={`h-6 w-6 rounded-full border-2 ${
              color === c ? 'border-indigo-400' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          title="Custom color"
          className="h-6 w-6 cursor-pointer rounded border border-slate-700 bg-transparent p-0"
        />
      </div>

      {/* Text formatting — active whenever at least one text element is selected */}
      {hasTextSelected && (
        <>
          <div className="mx-1 h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-1">
            <button
              className={iconBtn}
              onClick={() => onFontSize(-2)}
              title="Smaller text"
            >
              A−
            </button>
            <span className="w-6 text-center text-xs text-slate-400">
              {selected?.fontSize}
            </span>
            <button
              className={iconBtn}
              onClick={() => onFontSize(2)}
              title="Bigger text"
            >
              A+
            </button>
            <button
              className={`${iconBtn} ${isBold ? 'ring-2 ring-indigo-400' : ''}`}
              onClick={onToggleBold}
              title="Bold"
            >
              <span className="font-bold">B</span>
            </button>
            <button
              className={`${iconBtn} ${isItalic ? 'ring-2 ring-indigo-400' : ''}`}
              onClick={onToggleItalic}
              title="Italic"
            >
              <span className="italic">I</span>
            </button>
            <button
              className={alignBtn('left')}
              onClick={() => onAlign('left')}
              title="Align left"
            >
              ⇤
            </button>
            <button
              className={alignBtn('center')}
              onClick={() => onAlign('center')}
              title="Align center"
            >
              ↔
            </button>
            <button
              className={alignBtn('right')}
              onClick={() => onAlign('right')}
              title="Align right"
            >
              ⇥
            </button>
          </div>
        </>
      )}

      {/* Layer order — for any selected element */}
      {hasSelection && (
        <>
          <div className="mx-1 h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-1">
            <button
              className={iconBtn}
              onClick={() => onLayer('front')}
              title="Bring to front"
            >
              ⤒
            </button>
            <button
              className={iconBtn}
              onClick={() => onLayer('forward')}
              title="Bring forward"
            >
              ↑
            </button>
            <button
              className={iconBtn}
              onClick={() => onLayer('backward')}
              title="Send backward"
            >
              ↓
            </button>
            <button
              className={iconBtn}
              onClick={() => onLayer('back')}
              title="Send to back"
            >
              ⤓
            </button>
          </div>
        </>
      )}

      <div className="mx-1 h-6 w-px bg-slate-700" />

      <button
        className={`${btn} bg-slate-800 hover:bg-slate-700`}
        onClick={onUndo}
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>
      <button
        className={`${btn} bg-slate-800 hover:bg-slate-700`}
        onClick={onRedo}
        title="Redo (Ctrl+Y)"
      >
        ↷ Redo
      </button>
      <button
        className={`${btn} bg-slate-800 hover:bg-red-600`}
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        title="Delete selected (Del)"
      >
        🗑 Delete
      </button>
      <button
        className={`${btn} bg-slate-800 hover:bg-red-600`}
        onClick={onClear}
      >
        Clear
      </button>
      <button
        className={`${btn} ${
          showGrid
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
        onClick={onToggleGrid}
        title="Toggle grid"
      >
        # Grid
      </button>
      <button
        className={`${btn} ${
          showMinimap
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
        onClick={onToggleMinimap}
        title="Toggle mini-map"
      >
        🗺 Map
      </button>

      <div className="mx-1 h-6 w-px bg-slate-700" />

      <div className="flex items-center gap-1">
        <button className={iconBtn} onClick={onZoomOut} title="Zoom out">
          −
        </button>
        <button
          className="w-12 rounded-md bg-slate-800 px-1 py-1.5 text-center text-xs text-slate-300 hover:bg-slate-700"
          onClick={onZoomReset}
          title="Reset zoom"
        >
          {zoomPct}%
        </button>
        <button className={iconBtn} onClick={onZoomIn} title="Zoom in">
          +
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-slate-700" />

      <button
        className={`${btn} bg-slate-800 hover:bg-slate-700`}
        onClick={onExportPng}
      >
        PNG
      </button>
      <button
        className={`${btn} bg-slate-800 hover:bg-slate-700`}
        onClick={onExportJson}
      >
        Export
      </button>
      <button
        className={`${btn} bg-slate-800 hover:bg-slate-700`}
        onClick={onImportClick}
      >
        Import
      </button>

      <div className="mx-1 h-6 w-px bg-slate-700" />

      <button
        className={`${iconBtn} ${isFullscreen ? 'ring-2 ring-indigo-400' : ''}`}
        onClick={onToggleFullscreen}
        title="Toggle fullscreen"
      >
        ⛶
      </button>
    </header>
  )
}
