import { useEffect, useState } from 'react';

// Returns `value`, but only updates after `delay` ms of no further changes —
// used to turn the search box's every-keystroke updates into a much smaller
// number of actual server requests.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
