/**
 * In-process TTL cache for a user's resolved effective permissions.
 *
 * This is the concrete answer to "a permission change should take effect
 * soon, not require re-login": every RBAC-mutating service call
 * (rbac.service.js) invalidates the affected user (role/plants changed) or
 * every cached entry (a role's own permission set changed) as its last
 * step, so the change is visible on that user's very next request. Absent
 * an explicit invalidation, an entry naturally expires after TTL_MS.
 *
 * In-process only — correct for this app's single-instance deployment. If
 * it's ever run as multiple Node instances behind a load balancer, this
 * needs to move to a shared store (Redis) with pub/sub invalidation.
 */
const TTL_MS = 45_000

const cache = new Map() // userId -> { value, expiresAt }

export function getCached(userId) {
  const entry = cache.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(userId)
    return null
  }
  return entry.value
}

export function setCached(userId, value) {
  cache.set(userId, { value, expiresAt: Date.now() + TTL_MS })
}

export function invalidateUser(userId) {
  cache.delete(userId)
}

export function invalidateAll() {
  cache.clear()
}
