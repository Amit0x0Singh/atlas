import prisma from '../db.js'

// AuditLog.userId is @db.Uuid, but this app's identity is always an email
// string (req.user.user_id === req.user.email, by design — see
// middleware/auth.js's toReqUser). Every caller that spreads
// `...auditUser(req)` straight into writeAudit(...) was passing that email
// through, which failed the Uuid cast on every single write — silently,
// since the catch block below swallows it. Confirmed via audit: ~30 call
// sites across the app were affected. Validating the shape here (rather
// than at every call site) fixes all of them at once and can't regress the
// handful of *other* callers that deliberately destructure userId out of
// auditUser() to use as a plain string identifier elsewhere (that usage is
// untouched — this only governs what actually reaches this Prisma call).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// AuditLog's VarChar columns (see prisma/model/system/system.prisma) — some
// callers pass values that can legitimately outgrow these, e.g.
// data-management's delete-execution.service.js writes tables.join(',') into
// tableName, which for a MODULE-scope delete with cascade-expansion can run
// to 1000+ chars against a VarChar(100) column. Truncating here (rather than
// at every call site) fixes all of them at once, same rationale as the
// safeUserId check below — a write that would otherwise silently fail
// (writeAudit swallows its own errors) is far worse than a truncated note.
function truncate(value, maxLen) {
  if (value == null) return null
  const s = String(value)
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s
}

export async function writeAudit({ userId, username, action, tableName, recordId, oldValue, newValue, notes, ip } = {}) {
  try {
    const safeUserId = typeof userId === 'string' && UUID_RE.test(userId) ? userId : null
    await prisma.auditLog.create({
      data: {
        userId:    safeUserId,
        username:  truncate(username, 100),
        action:    truncate(action, 50),
        tableName: truncate(tableName, 100),
        recordId:  truncate(recordId, 200),
        oldValue:  oldValue  || undefined,
        newValue:  newValue  || undefined,
        ipAddress: truncate(ip, 50),
        notes:     notes     || null,
      },
    })
  } catch (err) {
    // Audit failures must never crash the main flow — log and continue
    console.error('[AUDIT LOG ERROR]', err.message)
  }
}

// Kept as the email string on purpose — several callers (backup/restore/
// delete job creation) destructure just `userId` from this and store it in
// a plain String "startedBy"/"createdBy"/"deletedBy" column, where the
// email is exactly the right value. `writeAudit` below is what actually
// writes to the @db.Uuid AuditLog.userId column, and it validates the
// shape itself rather than trusting every caller to know not to pass this
// straight through — see its own comment.
export function auditUser(request) {
  return {
    userId:   request.user?.user_id  || null,
    username: request.user?.username || 'unknown',
    ip:       request.ip             || null,
  }
}
