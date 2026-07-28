import { useCallback } from 'react'
import { formatMeasurement } from '../utils/measurement/formatMeasurement.js'

// NOT where any conversion/formatting logic lives — that's entirely in
// utils/measurement/formatMeasurement.js (a plain function usable from
// backend/PDF/Excel/notifications too, none of which can call a React
// hook). This exists only so a component that wants the same default
// options (e.g. a fixed locale) on every call in a render doesn't have to
// repeat them, and gets a referentially-stable callback for dep arrays.
export function useMeasurementFormatter(defaultOptions) {
  return useCallback(
    (value, unit, options) => formatMeasurement(value, unit, { ...defaultOptions, ...options }),
    [defaultOptions],
  )
}
