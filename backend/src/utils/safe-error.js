// For NEW controller code to use going forward — the ~103 existing
// per-controller catch blocks that return raw err.message are a documented
// follow-up, not retrofitted in this pass (a next(err)-based refactor would
// require touching those same 103 files anyway, since each has custom
// per-error-type status codes). This is wired into server.js's global
// error handler (the one place that already safely catches everything).
const DB_ERROR_HINT_RE = /prisma|postgres|constraint|column|relation|syntax error|duplicate key/i

export function toSafeErrorMessage(err) {
  if (typeof err?.code === 'string' && err.code.startsWith('P')) return 'An internal error occurred.' // Prisma error codes (P2002, P2025, ...)
  if (DB_ERROR_HINT_RE.test(err?.message || '')) return 'An internal error occurred.'
  return err?.message || 'An internal error occurred.'
}
