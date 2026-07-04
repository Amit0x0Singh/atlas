import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'admin-panel-pinned:';

function load(resourceKey) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + resourceKey)) || [];
  } catch {
    return [];
  }
}

export function usePinnedRecords(resourceKey) {
  const [pinned, setPinned] = useState(() => load(resourceKey));

  useEffect(() => {
    setPinned(load(resourceKey));
  }, [resourceKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + resourceKey, JSON.stringify(pinned));
  }, [resourceKey, pinned]);

  const isPinned = useCallback((id) => pinned.includes(id), [pinned]);

  const togglePin = useCallback((id) => {
    setPinned((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));
  }, []);

  return { pinned, isPinned, togglePin };
}
