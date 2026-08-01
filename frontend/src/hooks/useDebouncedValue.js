import { useEffect, useState } from 'react'

// Delays reflecting `value` until it's stopped changing for `delay` ms —
// for filter inputs, this keeps the query key (and network request) from
// firing on every keystroke while the field itself stays instantly responsive.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
