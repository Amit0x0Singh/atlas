// Client-side CSV helpers — no backend endpoint exists for bulk export/import,
// so Export loops over already-loaded records and Import loops the existing
// per-record createRecord API. Simple comma-split parser is sufficient since
// every resource here is a flat (non-nested) field list.

export function exportToCsv(resource, records) {
  const headers = resource.fields.map((f) => f.name);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = Array.isArray(val)
      ? (val.some((v) => v !== null && typeof v === 'object') ? JSON.stringify(val) : val.join('|'))
      : typeof val === 'object' ? JSON.stringify(val) : String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [
    headers.join(','),
    ...records.map((rec) => headers.map((h) => escape(rec[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resource.path}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

// Returns an array of plain field-name -> raw-string-value objects.
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}
