import { useCallback, useState } from 'react';

const STORAGE_KEY = 'admin-panel-recent';
const MAX_RECENT = 5;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function useRecentPages() {
  const [recent, setRecent] = useState(load);

  const visit = useCallback((key) => {
    setRecent((current) => {
      const next = [key, ...current.filter((k) => k !== key)].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recent, visit };
}
