import { cloneElement } from 'react'
import { useApp } from '../../context/context.jsx'

// Centralized permission-check hook — wraps the three functions the auth
// context already exposes, so components don't need to know they live on
// useApp()/useAuth().
export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useApp()
  return { hasPermission, hasAnyPermission, hasAllPermissions }
}

/**
 * Permission-gated render. Exactly one of `permission`/`anyOf`/`allOf`
 * should be given; omitting all three renders unconditionally (useful when
 * a parent already gated the surrounding block and this is just marking
 * intent).
 *
 *   <Can permission="inventory.inward.create">
 *     <Button onClick={submit}>Scan</Button>
 *   </Can>
 *
 * `mode="hide"` (default) drops the control entirely — use for actions
 * irrelevant to the user. `mode="disable"` renders it greyed out with a
 * reason instead — use on workflow pages (e.g. an Approve button) where
 * seeing *why* something is unavailable is more useful than it vanishing.
 */
export function Can({ permission, anyOf, allOf, mode = 'hide', fallback = null, children }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()
  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? hasAnyPermission(anyOf)
      : allOf
        ? hasAllPermissions(allOf)
        : true

  if (allowed) return children
  if (mode === 'disable') {
    return cloneElement(children, { disabled: true, title: 'You do not have permission to do this.' })
  }
  return fallback
}
