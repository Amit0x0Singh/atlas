import { useState } from 'react';
import { Upload, FileText, CheckCircle2, XCircle } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import { parseCsv } from '../table/csv.js';
import { createRecord } from '../../api/http.js';

// Frontend-only CSV import — there's no bulk-import endpoint, so each row
// loops the existing single-record createRecord API.
export default function ImportDialog({ open, resource, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { ok, fail }

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const text = await f.text();
    setRows(parseCsv(text));
  }

  async function handleImport() {
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      const payload = {};
      resource.fields.forEach((field) => {
        if (field.readOnly) return;
        const raw = row[field.name];
        if (raw === undefined || raw === '') { payload[field.name] = null; return; }
        payload[field.name] = field.type === 'number'
          ? Number(raw)
          : field.type === 'tags'
            ? raw.split('|').map((s) => s.trim()).filter(Boolean)
            : raw;
      });
      try {
        await createRecord(resource, payload);
        ok++;
      } catch {
        fail++;
      }
    }
    setImporting(false);
    setResult({ ok, fail });
    if (ok > 0) onDone?.();
  }

  function handleClose() {
    setFile(null);
    setRows([]);
    setResult(null);
    onClose();
  }

  const requiredHeaders = resource.fields.filter((f) => !f.readOnly).map((f) => f.name).join(', ');

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import {resource.title}</h2>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Upload a CSV with a header row matching field names ({requiredHeaders}).
          Each row calls the existing create API one at a time — nothing is created until you confirm.
        </p>

        <label className="mt-5 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-8 cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
          <Upload size={22} className="text-slate-400" />
          <span className="text-sm text-slate-500 dark:text-slate-400">{file ? file.name : 'Click to choose a CSV file'}</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </label>

        {rows.length > 0 && !result && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <FileText size={15} /> {rows.length} row{rows.length === 1 ? '' : 's'} ready to import
          </div>
        )}

        {result && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400"><CheckCircle2 size={15} /> {result.ok} created</span>
            {result.fail > 0 && <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400"><XCircle size={15} /> {result.fail} failed</span>}
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <Button variant="secondary" onClick={handleClose} fullWidth>{result ? 'Close' : 'Cancel'}</Button>
          {!result && (
            <Button onClick={handleImport} loading={importing} disabled={!rows.length} fullWidth>
              Import{rows.length > 0 ? ` ${rows.length} rows` : ''}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
