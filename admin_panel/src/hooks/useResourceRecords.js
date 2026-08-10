import { useCallback, useEffect, useState } from 'react';
import { createRecord, deleteAllRecords, deleteRecord, listRecords, updateRecord } from '../api/http.js';
import { useToast } from '../components/common/Toast.jsx';

// Extracts the load/create/update/delete/deleteAll state that ResourcePage.jsx
// used to own directly, and wires up the backend's page/limit/total contract
// (previously called with no params, so tables over the backend's default
// 200-row limit were silently truncated with no way to reach the rest).
//
// `search` (already-debounced string) and `filters` (plain object) are sent
// straight through to the backend, which now does the actual searching/
// filtering — `records`/`total` returned here are already narrowed, so the
// caller never needs to filter client-side.
export function useResourceRecords(resource, { search = '', filters = {} } = {}) {
  const showToast = useToast();
  const [records, setRecords] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [limit, setLimit]     = useState(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const filtersJson = JSON.stringify(filters);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listRecords(resource, { page, limit, search, filters: filtersJson });
      setRecords(result.data ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to load records.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, page, limit, search, filtersJson]);

  useEffect(() => {
    setPage(1);
  }, [resource.key]);

  // A new search term or filter selection invalidates whatever page you
  // were on — e.g. page 3 of the unfiltered set is almost never page 3 of
  // the filtered set.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filtersJson]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.key, page, limit, search, filtersJson]);

  async function save(mode, record, payload) {
    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        await createRecord(resource, payload);
        showToast(`${resource.title} record created.`);
      } else {
        await updateRecord(resource, record, payload);
        showToast(`${resource.title} record updated.`);
      }
      await loadData();
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to save record.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(record) {
    setError('');
    try {
      await deleteRecord(resource, record);
      showToast(`${resource.title} record deleted.`);
      await loadData();
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to delete record.');
      return false;
    }
  }

  async function removeAll() {
    setError('');
    try {
      await deleteAllRecords(resource);
      showToast(`All ${resource.title} records deleted.`);
      if (page !== 1) setPage(1); else await loadData();
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unable to delete all records.');
      return false;
    }
  }

  return {
    records, total, page, limit, loading, saving, error,
    setPage, setLimit, reload: loadData, save, remove, removeAll,
  };
}
