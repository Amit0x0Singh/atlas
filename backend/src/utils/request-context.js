// Per-request context — lets code with no access to `req` (in particular the
// audit-stamp Prisma Client Extension, see prisma-audit-extension.js) read
// "who is making this request" without req/res being threaded through every
// controller/service call down to the database layer.
//
// Only ever populated by auth.js's authenticate() once it has verified the
// token and resolved req.user. Anything running outside a request (seed
// scripts, cron jobs, the backup/restore background worker's own progress
// ticks) sees no store and getCurrentUserEmail() returns null — audit
// columns are correctly left null there instead of guessing at an actor.

import { AsyncLocalStorage } from 'node:async_hooks'

const requestContext = new AsyncLocalStorage()

// Runs `fn` with `context` attached to the current async execution chain —
// every Promise/callback/await originating from within `fn` (including deep
// inside a Prisma call several layers of async functions later) can read it
// back via getCurrentUserEmail(), even though none of those layers were
// passed `context` directly.
export function runWithRequestContext(context, fn) {
  return requestContext.run(context, fn)
}

export function getCurrentUserEmail() {
  return requestContext.getStore()?.userEmail ?? null
}
