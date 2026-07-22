export function exportCsv(filename, rows, columns) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',')
  const lines = rows.map((r) => columns.map((c) => {
    const v = c.value(r)
    return `"${String(v ?? '').replace(/"/g, '""')}"`
  }).join(','))
  const csv = [header, ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
