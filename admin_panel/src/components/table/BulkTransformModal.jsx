import { useEffect, useMemo, useState } from 'react';
import { Type, ArrowRight, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Select from '../common/Select.jsx';
import Input from '../common/Input.jsx';
import ProgressBar from '../backup/ProgressBar.jsx';
import { useToast } from '../common/Toast.jsx';
import { useJobPolling } from '../../hooks/useJobPolling.js';
import { previewTransform, createTransform, getTransformStatus } from '../../api/bulk-transform.js';

// Mirrors backend/src/utils/text-transforms.js — kept as a small parallel
// list (not fetched) since transform *types* change rarely, unlike the
// per-table field lists resources.js exists to keep in sync.
const TRANSFORM_TYPES = [
  { value: 'UPPERCASE', label: 'UPPERCASE' },
  { value: 'LOWERCASE', label: 'lowercase' },
  { value: 'TITLE_CASE', label: 'Capitalize Each Word (Title Case)' },
  { value: 'CAPITALIZE_FIRST', label: 'Capitalize First Letter' },
  { value: 'SENTENCE_CASE', label: 'Sentence case' },
  { value: 'TRIM', label: 'Trim Leading & Trailing Spaces' },
  { value: 'COLLAPSE_SPACES', label: 'Remove Multiple Spaces' },
  { value: 'FIND_REPLACE', label: 'Find & Replace', requiresParams: true },
  { value: 'ADD_PREFIX', label: 'Add Prefix', requiresParams: true },
  { value: 'ADD_SUFFIX', label: 'Add Suffix', requiresParams: true },
];

function isTransformableField(resource, field) {
  const isText = field.type === 'text' || !field.type;
  const isPk = Array.isArray(resource.idField) ? resource.idField.includes(field.name) : resource.idField === field.name;
  return isText && !field.readOnly && !isPk;
}

// Wizard: pick column(s) + transformation → preview (Current Value / New
// Value) → apply as a background job with polled progress. Mirrors
// StartDeleteModal's step-machine shape, minus the destructive-action
// password gate (a text transform isn't as dangerous as a delete, and the
// preview step is itself the confirmation).
export default function BulkTransformModal({ open, onClose, onDone, resource, ids }) {
  const showToast = useToast();
  const [step, setStep] = useState('pick'); // pick | preview | progress
  const [columns, setColumns] = useState([]);
  const [transformType, setTransformType] = useState('UPPERCASE');
  const [params, setParams] = useState({ find: '', replace: '', matchCase: false, prefix: '', suffix: '' });

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [formError, setFormError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const job = useJobPolling(jobId, getTransformStatus);

  const fields = useMemo(
    () => resource.fields.filter((f) => isTransformableField(resource, f)),
    [resource],
  );
  const transform = TRANSFORM_TYPES.find((t) => t.value === transformType);

  useEffect(() => {
    if (!open) return;
    setStep('pick'); setColumns([]); setTransformType('UPPERCASE');
    setParams({ find: '', replace: '', matchCase: false, prefix: '', suffix: '' });
    setPreview(null); setPreviewing(false); setFormError('');
    setSubmitting(false); setJobId(null);
  }, [open]);

  function toggleColumn(name) {
    setColumns((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }

  function buildPayload() {
    return {
      resource: resource.path,
      ids,
      columns,
      transformType,
      params: transform?.requiresParams
        ? transformType === 'FIND_REPLACE'
          ? { find: params.find, replace: params.replace, matchCase: params.matchCase }
          : transformType === 'ADD_PREFIX'
            ? { prefix: params.prefix }
            : { suffix: params.suffix }
        : undefined,
    };
  }

  async function handlePreview() {
    setFormError('');
    if (columns.length === 0) return setFormError('Pick at least one target column.');
    if (transformType === 'FIND_REPLACE' && !params.find) return setFormError('Enter text to find.');
    if (transformType === 'ADD_PREFIX' && !params.prefix) return setFormError('Enter a prefix.');
    if (transformType === 'ADD_SUFFIX' && !params.suffix) return setFormError('Enter a suffix.');

    setPreviewing(true);
    try {
      const res = await previewTransform(buildPayload());
      setPreview(res);
      setStep('preview');
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Unable to preview changes.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleApply() {
    setSubmitting(true);
    try {
      const res = await createTransform(buildPayload());
      setJobId(res.id);
      setStep('progress');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Unable to start transform.', 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (job?.status === 'COMPLETED') {
      showToast(`Transform complete — ${job.fieldsUpdated} field(s) updated across ${job.recordsDone} record(s).`);
      onDone();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  return (
    <Modal open={open} onClose={submitting ? undefined : onClose} size="lg">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Type size={18} className="text-blue-600" /> Transform Text
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {ids.length} record{ids.length !== 1 ? 's' : ''} selected in <span className="font-medium">{resource.title}</span>
        </p>

        {step === 'pick' && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">Target Columns</label>
              {fields.length === 0 ? (
                <p className="text-sm text-slate-500">No text columns are editable on this table.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto scrollbar-thin border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  {fields.map((f) => (
                    <label key={f.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={columns.includes(f.name)}
                        onChange={() => toggleColumn(f.name)}
                        className="accent-blue-600"
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Select
                label="Transformation"
                value={transformType}
                onChange={(e) => setTransformType(e.target.value)}
                options={TRANSFORM_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>

            {transformType === 'FIND_REPLACE' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Find" value={params.find} onChange={(e) => setParams((p) => ({ ...p, find: e.target.value }))} />
                  <Input label="Replace with" value={params.replace} onChange={(e) => setParams((p) => ({ ...p, replace: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.matchCase}
                    onChange={(e) => setParams((p) => ({ ...p, matchCase: e.target.checked }))}
                    className="accent-blue-600"
                  />
                  Match case
                </label>
              </div>
            )}
            {transformType === 'ADD_PREFIX' && (
              <Input label="Prefix" value={params.prefix} onChange={(e) => setParams((p) => ({ ...p, prefix: e.target.value }))} />
            )}
            {transformType === 'ADD_SUFFIX' && (
              <Input label="Suffix" value={params.suffix} onChange={(e) => setParams((p) => ({ ...p, suffix: e.target.value }))} />
            )}

            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button icon={ArrowRight} loading={previewing} onClick={handlePreview}>Preview Changes</Button>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {preview.changedCount.toLocaleString()} value(s) will change across {preview.recordsToUpdate.toLocaleString()} of {preview.recordsMatched.toLocaleString()} selected record(s).
              </p>
              {preview.skippedCount > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {preview.skippedCount.toLocaleString()} field value(s) skipped (not text).
                </p>
              )}
            </div>

            {preview.uniqueConflicts?.length > 0 && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 space-y-1.5">
                <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="flex-shrink-0" />
                  This would create duplicate values in a unique column — applying is blocked until resolved.
                </p>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5 pl-5 list-disc">
                  {preview.uniqueConflicts.map((c, i) => (
                    <li key={i}>
                      <span className="font-medium">{fields.find((f) => f.name === c.column)?.label || c.column}</span>:
                      {' '}"{c.value}" would apply to {c.count} records ({c.ids.join(', ')}{c.count > c.ids.length ? ', …' : ''})
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-red-500 dark:text-red-400/80">Deselect the conflicting records, or choose a transformation that keeps their values distinct.</p>
              </div>
            )}

            {preview.changedCount === 0 ? (
              <p className="text-sm text-slate-500">Nothing to change — every selected value is already in the target form.</p>
            ) : (
              <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Column</th>
                      <th className="text-left px-3 py-2 font-medium">Current Value</th>
                      <th className="text-left px-3 py-2 font-medium">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72">
                    {preview.sample.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{row.column}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.oldValue}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-medium">{row.newValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.sampleCapped && (
                  <p className="text-xs text-slate-400 px-3 py-2 border-t border-slate-100 dark:border-slate-800">
                    Showing first {preview.sample.length} of {preview.changedCount.toLocaleString()} changes.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setStep('pick')}>Back</Button>
              <Button
                loading={submitting}
                disabled={preview.changedCount === 0 || preview.uniqueConflicts?.length > 0}
                onClick={handleApply}
              >
                Apply to {preview.recordsToUpdate.toLocaleString()} Record(s)
              </Button>
            </div>
          </div>
        )}

        {step === 'progress' && (
          <div className="py-4 space-y-4">
            <ProgressBar
              value={job?.recordsDone ?? 0}
              max={job?.recordsTotal ?? ids.length}
              indeterminate={!job || job.status === 'PENDING'}
              label={
                job?.status === 'FAILED'
                  ? 'Transform failed'
                  : job?.status === 'RUNNING'
                    ? `Transforming — ${job.recordsDone} of ${job.recordsTotal} record(s)`
                    : 'Preparing…'
              }
            />
            {job?.status === 'FAILED' && (
              <>
                <p className="text-sm text-red-600 dark:text-red-400">{job.errorMessage}</p>
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
