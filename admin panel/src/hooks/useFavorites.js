import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'admin-panel-favorites';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = useCallback((key) => favorites.includes(key), [favorites]);

  const toggleFavorite = useCallback((key) => {
    setFavorites((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
