// Prisma Client Extension — universal enforcement point for the audit-field
// standard (createdBy/updatedBy). Wraps create/update/upsert/createMany/
// updateMany on every model, so any model that carries these columns gets
// them auto-stamped from the current request's authenticated user with zero
// per-controller wiring — mirrors prisma-normalize-extension.js's approach
// for the text-normalization standard.
//
// Stamps with the actor's phone number, falling back to email when the
// account has no phone on file yet (most pre-existing accounts, since phone
// only recently became required for new/edited users — see User.phone in
// system.prisma). Historical rows already carry an email in these columns;
// useUserDisplayNames.js resolves both phone- and email-stamped values back
// to a display name, so old and new data both render correctly.
//
// createdAt/updatedAt are NOT handled here — every in-scope model declares
// them with Prisma's own `@default(now())` / `@updatedAt`, which Prisma
// already populates natively without any extension involvement.
//
// Scope is driven entirely by the schema itself (via hasField below): any
// model without a createdBy/updatedBy column is left untouched, and any
// future model that adds one is covered automatically the moment it's
// added — no registry file to keep in sync.
//
// Known limitation: only top-level create/update/upsert/createMany/
// updateMany calls are stamped, not writes nested inside a relation (e.g.
// `prisma.printMaster.create({ data: { bags: { createMany: {...} } } })`).
// Every current write path in this codebase issues flat top-level calls per
// model (mirrors how PackDetail rows are actually created — see
// services/pack-generator.js), so this covers real usage; a future nested
// write path would just leave that row's audit columns null rather than
// stamp incorrectly.

import { Prisma } from '@prisma/client'
import { getCurrentUserEmail, getCurrentUserPhone } from './request-context.js'

// Phone is the primary actor identifier now; email is only a fallback for
// accounts that don't have a phone on file yet.
function getCurrentActor() {
  return getCurrentUserPhone() || getCurrentUserEmail()
}

const modelByName = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]))

// One pre-existing field predates this extension and is incompatible with
// it: ErpProductionPlan.createdBy is @db.Uuid (the legacy auth system's user
// id), not the email string every createdBy/updatedBy field added for this
// standard actually holds — stamping it here would hand Postgres an email
// where it expects a UUID and the insert/update would fail outright. The
// Prisma Client's public DMMF doesn't expose @db.* native types at runtime,
// so this can't be detected generically; it's called out explicitly instead.
const INCOMPATIBLE_FIELDS = new Set(['ErpProductionPlan.createdBy'])

function hasField(modelName, fieldName) {
  if (INCOMPATIBLE_FIELDS.has(`${modelName}.${fieldName}`)) return false
  return !!modelByName.get(modelName)?.fields.some((f) => f.name === fieldName)
}

function stampCreate(model, data) {
  if (data === null || typeof data !== 'object') return data
  const actor = getCurrentActor()
  if (!actor) return data
  const out = { ...data }
  if (hasField(model, 'createdBy') && out.createdBy === undefined) out.createdBy = actor
  if (hasField(model, 'updatedBy') && out.updatedBy === undefined) out.updatedBy = actor
  return out
}

function stampCreateManyData(model, data) {
  return Array.isArray(data) ? data.map((row) => stampCreate(model, row)) : data
}

function stampUpdate(model, data) {
  if (data === null || typeof data !== 'object') return data
  if (!hasField(model, 'updatedBy')) return data
  if (data.updatedBy !== undefined) return data
  const actor = getCurrentActor()
  if (!actor) return data
  return { ...data, updatedBy: actor }
}

export const auditStampExtension = {
  name: 'audit-stamp',
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (args.data) args.data = stampCreate(model, args.data)
        return query(args)
      },
      async update({ model, args, query }) {
        if (args.data) args.data = stampUpdate(model, args.data)
        return query(args)
      },
      async upsert({ model, args, query }) {
        if (args.create) args.create = stampCreate(model, args.create)
        if (args.update) args.update = stampUpdate(model, args.update)
        return query(args)
      },
      async createMany({ model, args, query }) {
        if (Array.isArray(args.data)) args.data = stampCreateManyData(model, args.data)
        return query(args)
      },
      async updateMany({ model, args, query }) {
        if (args.data) args.data = stampUpdate(model, args.data)
        return query(args)
      },
    },
  },
}
