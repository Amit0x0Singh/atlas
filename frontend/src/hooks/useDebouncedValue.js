import { useEffect, useState } from 'react'

// Delays reflecting `value` until it's stopped changing for `delay` ms —
// for filter inputs, this keeps the query key (and network request) from
// firing on every keystroke while the field itself stays instantly responsive.
//
// Keyed off JSON.stringify(value) rather than `value` itself: several
// callers pass a fresh object literal on every render (e.g.
// useDebouncedValue({ ...filters, search }, 300)), which is a new reference
// even when its content hasn't changed. Depending on `value` directly made
// the timer restart on every render of the parent, so it never actually
// settled on a genuinely-unchanged value from a callback's perspective — any
// unrelated re-render (like clicking "Next" on a paginated table) kept
// producing a "new" debounced value a moment later, which then tripped a
// "reset page to 1 when filters change" effect downstream and made Next
// silently snap back to page 1.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  const key = JSON.stringify(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the intentional content-based dependency; `value` itself must stay out of this array
  }, [key, delay])

  return debounced
}
