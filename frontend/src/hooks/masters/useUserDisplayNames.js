import { useMemo } from 'react'
import { useUsers } from './useUserRoles.js'
import { toTitleCase } from '../../utils/textDisplay.js'

// createdBy/updatedBy columns store the actor's email (stamped server-side
// by the Prisma audit-stamp extension) — this resolves that email to a
// readable display name using the same users list the User Roles page
// already fetches, so record-detail views can show "Amit" instead of a
// raw email/id. Falls back to the email itself if the user can't be found
// (e.g. account since deleted) — still more readable than a database id.
export function useUserDisplayNames() {
  const { data: users = [] } = useUsers()
  return useMemo(() => {
    const map = new Map()
    // fullName is stored lowercase (e.g. "buddha") — Title Case it for
    // display the same way item/category names already are, elsewhere.
    for (const u of users) if (u.email) map.set(u.email.toLowerCase(), toTitleCase(u.fullName) || u.email)
    return (email) => (email ? map.get(email.toLowerCase()) || email : '—')
  }, [users])
}
