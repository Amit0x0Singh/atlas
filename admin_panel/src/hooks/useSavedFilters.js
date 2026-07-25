import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'admin-panel-saved-filters:';

function load(resourceKey) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + resourceKey)) || [];
  } catch {
    return [];
  }
}

export function useSavedFilters(resourceKey) {
  const [savedFilters, setSavedFilters] = useState(() => load(resourceKey));

  useEffect(() => {
    setSavedFilters(load(resourceKey));
  }, [resourceKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + resourceKey, JSON.stringify(savedFilters));
  }, [resourceKey, savedFilters]);

  const saveFilter = useCallback((name, filter) => {
    setSavedFilters((current) => [...current.filter((f) => f.name !== name), { name, ...filter }]);
  }, []);

  const removeFilter = useCallback((name) => {
    setSavedFilters((current) => current.filter((f) => f.name !== name));
  }, []);

  return { savedFilters, saveFilter, removeFilter };
}
