import { ShieldAlert, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui'

/**
 * Standard "you can't do that" experience — used both as a full route-level
 * page (variant="page", e.g. a permission-mismatched URL) and inline
 * wherever a single blocked action needs explaining (variant="inline", e.g.
 * as <Can>'s fallback).
 *
 * `requiredPermission` is shown in a muted mono badge purely for
 * debuggability ("why am I blocked?") — not a security-sensitive detail,
 * the backend already rejected the request before this ever renders.
 */
export default function AccessDenied({ variant = 'page', requiredPermission, homePath = '/', message }) {
  const navigate = useNavigate()

  const body = (
    <>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldAlert size={28} className="text-red-500" />
      </div>
      <h2 className="text-base font-bold text-slate-900 mb-1.5">Access Restricted</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        {message || "You don't have permission to access this resource. If you believe you should have access, contact your administrator."}
      </p>
      {requiredPermission && (
        <div className="mt-3 inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-400">
          {requiredPermission}
        </div>
      )}
      {variant === 'page' && (
        <div className="mt-6">
          <Button variant="outline-gray" size="sm" icon={Home} onClick={() => navigate(homePath)}>
            Go to my dashboard
          </Button>
        </div>
      )}
    </>
  )

  if (variant === 'inline') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-8 text-center">
        {body}
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        {body}
      </div>
    </div>
  )
}
