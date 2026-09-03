import { useMemo } from 'react'
import { useUserDirectory } from './useUserRoles.js'
import { toTitleCase } from '../../utils/textDisplay.js'

// createdBy/updatedBy columns store the actor's email (stamped server-side
// by the Prisma audit-stamp extension) — this resolves that email to a
// readable display name using the auth-only staff directory (GET
// /auth/directory), so record lists/detail views can show "Amit Nano"
// instead of a raw email, for every account and not just admins. Falls back
// to the email itself if the user can't be found (e.g. account since
// deleted) — still more readable than a database id.
export function useUserDisplayNames() {
  const { data: users = [] } = useUserDirectory()
  return useMemo(() => {
    const map = new Map()
    // fullName is stored lowercase (e.g. "buddha") — Title Case it for
    // display the same way item/category names already are, elsewhere.
    for (const u of users) if (u.email) map.set(u.email.toLowerCase(), toTitleCase(u.fullName) || u.email)
    return (email) => (email ? map.get(email.toLowerCase()) || email : '—')
  }, [users])
}
