import { QueryClient } from '@tanstack/react-query'

// ─── Cache-time presets ────────────────────────────────────────────────────
// Centralized so every hook picks a tier instead of hand-rolling a number.
// staleTime  — how long cached data is considered fresh (no refetch on
//              mount/remount while fresh, even across page navigation).
// gcTime     — how long unused data stays in cache after the last
//              component using it unmounts, before being garbage collected.
export const CACHE = {
  // Master data — rarely changes within a session (employees, customers,
  // vendors, products, departments, RM/packing masters, recipes…).
  MASTER:      { staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000 },
  // Operational data that changes over the course of a shift (inventory
  // levels, production/sales orders, planning tasks).
  OPERATIONAL: { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 },
  // Attendance — near-real-time but not sub-minute.
  ATTENDANCE:  { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 },
  // Dashboards — summary numbers people expect to look "live".
  DASHBOARD:   { staleTime: 15 * 1000, gcTime: 2 * 60 * 1000 },
  // Notification/badge counts — the shortest tier, polled implicitly by
  // remounts/refetches rather than a background interval.
  NOTIFICATIONS: { staleTime: 10 * 1000, gcTime: 60 * 1000 },
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The backend is same-origin and cheap to re-hit, but re-fetching
      // every list on every window focus was exactly the "re-fetch on every
      // visit" behavior this migration is meant to remove — opt in per-query
      // (e.g. dashboards) instead of defaulting it on everywhere.
      refetchOnWindowFocus: false,
      // One retry — enough to absorb a transient blip without masking a
      // real backend error behind a long silent retry loop.
      retry: 1,
      staleTime: CACHE.OPERATIONAL.staleTime,
      gcTime: CACHE.OPERATIONAL.gcTime,
    },
    mutations: {
      retry: 0,
    },
  },
})
