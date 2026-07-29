import { X, KeyRound } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import { NAV_GROUPS } from '../../data/navGroups.js';

// Renders the resource's own field config (name/label/type/options/readOnly)
// as a schema reference — lets the user inspect a table's structure without
// leaving the admin panel or opening the Prisma schema files directly.
export default function SchemaModal({ open, onClose, resource }) {
  if (!resource) return null;

  const pkFields = Array.isArray(resource.idField) ? resource.idField : [resource.idField];
  const group = NAV_GROUPS.find((g) => g.key === resource.group);

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
            Schema — {resource.model}
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{resource.title}</h2>
          {resource.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{resource.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Prisma Model</dt>
            <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">{resource.model}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">API Path</dt>
            <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">/{resource.path}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Primary Key</dt>
            <dd className="mt-0.5 font-mono text-slate-800 dark:text-slate-200">{pkFields.join(' + ')}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Module</dt>
            <dd className="mt-0.5" style={{ color: group?.color }}>{group?.label ?? resource.group}</dd>
          </div>
        </dl>

        <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Field</th>
                <th className="text-left font-semibold px-3 py-2">Label</th>
                <th className="text-left font-semibold px-3 py-2">Type</th>
                <th className="text-left font-semibold px-3 py-2">Values</th>
                <th className="text-left font-semibold px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {resource.fields.map((f) => {
                const isPk = pkFields.includes(f.name);
                return (
                  <tr key={f.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {isPk && <KeyRound size={12} className="text-amber-500 flex-shrink-0" />}
                        {f.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{f.label}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono">
                        {f.type ?? 'text'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {f.options?.length ? f.options.join(' | ') : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs">
                      {isPk ? 'Primary key' : f.readOnly ? 'System-managed (read-only)' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          {resource.fields.length} field{resource.fields.length === 1 ? '' : 's'} — reflects the current
          admin-panel resource config, which mirrors this model's Prisma schema.
        </p>
      </div>
    </Modal>
  );
}
