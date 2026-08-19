import { useEffect, useState } from 'react'

const MIN_COL_WIDTH = 60

function load(storageKey, defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (saved && typeof saved === 'object') {
      return {
        widths: { ...defaults.widths, ...saved.widths },
        visibility: { ...defaults.visibility, ...saved.visibility },
      }
    }
  } catch { /* corrupt/unavailable storage — fall back to defaults */ }
  return defaults
}

/**
 * Column width + visibility state for a resizable table, persisted to
 * localStorage per table so a user's layout survives a refresh/next visit.
 * `columns` is the table's COLUMN_DEFS array: [{ key, label, defaultWidth }].
 * `tableId` must be a stable, unique string per table (used as the storage
 * key) — e.g. 'equipment-master', 'stock-ledger'.
 *
 * Defaults are merged UNDER any saved values on load, so adding a new
 * column to COLUMN_DEFS later doesn't require clearing existing users'
 * saved preferences — the new column just falls back to its own default.
 */
export function useColumnPreferences(tableId, columns) {
  const storageKey = `erp_columns_${tableId}`

  const [state, setState] = useState(() => load(storageKey, {
    widths: Object.fromEntries(columns.map((c) => [c.key, c.defaultWidth])),
    visibility: Object.fromEntries(columns.map((c) => [c.key, true])),
  }))

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* storage full/unavailable — preference just won't persist */ }
  }, [state, storageKey])

  function startResize(key) {
    return (e) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = state.widths[key]
      function onMove(ev) {
        setState((s) => ({ ...s, widths: { ...s.widths, [key]: Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX)) } }))
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }
  }

  const toggleColumn = (key) => setState((s) => ({ ...s, visibility: { ...s.visibility, [key]: !s.visibility[key] } }))

  const visibleColumns = columns.filter((c) => state.visibility[c.key])

  return { columnWidths: state.widths, columnVisibility: state.visibility, visibleColumns, startResize, toggleColumn }
}

export { MIN_COL_WIDTH }
