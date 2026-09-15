import { useMemo } from 'react'
import { useUserDirectory } from './useUserRoles.js'
import { toTitleCase } from '../../utils/textDisplay.js'

// createdBy/updatedBy columns store the actor's phone number (stamped
// server-side by the Prisma audit-stamp extension) — or, for accounts with
// no phone on file, their email as a fallback; and every row written before
// this switch still has the old actor's email in it regardless. This
// resolves either shape to a readable display name using the auth-only
// staff directory (GET /auth/directory), so record lists/detail views can
// show "Amit Nano" instead of a raw phone/email, for every account and not
// just admins. Falls back to the raw value itself if the user can't be
// found (e.g. account since deleted) — still more readable than a database id.
export function useUserDisplayNames() {
  const { data: users = [] } = useUserDirectory()
  return useMemo(() => {
    const map = new Map()
    // fullName is stored lowercase (e.g. "buddha") — Title Case it for
    // display the same way item/category names already are, elsewhere.
    for (const u of users) {
      const label = toTitleCase(u.fullName) || u.email || u.phone
      if (u.email) map.set(u.email.toLowerCase(), label)
      if (u.phone) map.set(u.phone.toLowerCase(), label)
    }
    return (value) => (value ? map.get(String(value).toLowerCase()) || value : '—')
  }, [users])
}
