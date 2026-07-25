import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import FormSection from './FormSection.jsx';

function toInputValue(value, type) {
  if (value === null || value === undefined) return '';
  if (type === 'datetime-local') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  }
  if (type === 'date') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }
  if (type === 'tags') return Array.isArray(value) ? value.join(', ') : value;
  if (type === 'json') return JSON.stringify(value, null, 2);
  return value ?? '';
}

function normalizeValue(value, type) {
  if (value === '') return null;
  if (type === 'number') return Number(value);
  if (type === 'tags') return String(value).split(',').map((s) => s.trim()).filter(Boolean);
  if (type === 'json') return JSON.parse(value);
  if (type === 'datetime-local') return new Date(value).toISOString();
  if (type === 'date') return new Date(`${value}T00:00:00`).toISOString();
  return value;
}

export default function DataFormModal({ mode, resource, record, onClose, onSubmit, saving }) {
  const editableFields = useMemo(
    () => resource.fields.filter((field) => !(mode === 'create' && field.readOnly)),
    [mode, resource.fields]
  );
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const next = {};
    editableFields.forEach((field) => { next[field.name] = toInputValue(record?.[field.name], field.type); });
    setForm(next);
    setDirty(false);
  }, [editableFields, record]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setDirty(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {};
    editableFields.forEach((field) => {
      if (field.readOnly) return;
      payload[field.name] = normalizeValue(form[field.name], field.type);
    });
    onSubmit(payload);
  }

  return (
    <Modal open onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[88vh]">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {mode === 'create' ? 'Add' : 'Edit'} {resource.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{resource.model}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          <FormSection columns={2}>
            {editableFields.map((field) => {
              if (field.type === 'select') {
                return (
                  <Select
                    key={field.name}
                    label={field.label}
                    required={!field.readOnly}
                    disabled={field.readOnly}
                    placeholder="Select…"
                    options={field.options}
                    value={form[field.name] ?? ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                  />
                );
              }
              if (field.type === 'textarea') {
                return (
                  <div key={field.name} className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{field.label}</label>
                    <textarea
                      rows={3}
                      disabled={field.readOnly}
                      value={form[field.name] ?? ''}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>
                );
              }
              if (field.type === 'json') {
                return (
                  <div key={field.name} className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{field.label}</label>
                    <textarea
                      rows={10}
                      disabled={field.readOnly}
                      value={form[field.name] ?? ''}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>
                );
              }
              return (
                <Input
                  key={field.name}
                  label={field.label}
                  required={!field.readOnly}
                  disabled={field.readOnly}
                  type={field.type === 'tags' ? 'text' : field.type}
                  step={field.type === 'number' ? 'any' : undefined}
                  placeholder={field.type === 'tags' ? 'Comma separated values' : undefined}
                  value={form[field.name] ?? ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                />
              );
            })}
          </FormSection>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
          {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">● Unsaved changes</span>}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
