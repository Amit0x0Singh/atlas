// Prisma Client Extension — the universal enforcement point for the text-
// normalization standard. Wraps create/update/upsert/createMany/updateMany
// on every model, so every controller, the Excel importer, backup restore,
// and the bulk-transform feature all get the same rules with zero
// per-module wiring. See backend/src/config/field-normalization-rules.js
// for what gets normalized and how.

import { Prisma } from '@prisma/client'
import { FIELD_RULES } from '../config/field-normalization-rules.js'
import { applyRule } from './text-normalize.js'

// Prisma always derives a model's Client accessor by lowercasing the first
// letter of the model name — the same fact already relied on in reverse
// elsewhere in this codebase (e.g. bulk-transform.util.js's
// dmmfModelName()) — but the extension's `model` hook argument is already
// the PascalCase DMMF name directly, so no conversion is needed here; kept
// only as a lookup table below for relation-field resolution.
const modelByName = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]))

/**
 * Normalizes one write-data node (object or array) for `modelName`,
 * applying FIELD_RULES to top-level string keys and recursing into any
 * nested relation-write objects (create/update/upsert/createMany.data on
 * a related model). Never touches `where`, `connect`, `disconnect`, `set`
 * — those reference existing rows, not new data.
 */
function normalizeNode(modelName, node) {
  if (Array.isArray(node)) {
    return node.map((item) => normalizeNode(modelName, item))
  }
  if (node === null || typeof node !== 'object') return node

  const rules = FIELD_RULES[modelName] || {}
  const model = modelByName.get(modelName)
  const out = { ...node }

  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && rules[key]) {
      out[key] = applyRule(rules[key], value)
      continue
    }
    if (value !== null && typeof value === 'object' && model) {
      const relationField = model.fields.find((f) => f.kind === 'object' && f.name === key)
      if (relationField) {
        out[key] = normalizeRelationWrite(relationField.type, value)
      }
      // Non-relation nested objects (arbitrary JSON columns, filter
      // fragments) are intentionally left untouched.
    }
  }
  return out
}

/**
 * `relValue` is a relation sub-object, e.g. { create: [...] },
 * { create: {...}, connect: {...} }, { createMany: { data: [...] } }, or
 * { upsert: { create: {...}, update: {...} } }. Only the nested-WRITE
 * shapes are normalized.
 */
function normalizeRelationWrite(childModelName, relValue) {
  const out = { ...relValue }

  if ('create' in out) out.create = normalizeNode(childModelName, out.create)
  if ('update' in out) out.update = normalizeNode(childModelName, out.update)

  if (out.upsert) {
    if (Array.isArray(out.upsert)) {
      out.upsert = out.upsert.map((u) => normalizeUpsertItem(childModelName, u))
    } else {
      out.upsert = normalizeUpsertItem(childModelName, out.upsert)
    }
  }

  if (out.createMany && Array.isArray(out.createMany.data)) {
    out.createMany = { ...out.createMany, data: normalizeNode(childModelName, out.createMany.data) }
  }

  if (out.connectOrCreate) {
    out.connectOrCreate = Array.isArray(out.connectOrCreate)
      ? out.connectOrCreate.map((item) => normalizeConnectOrCreateItem(childModelName, item))
      : normalizeConnectOrCreateItem(childModelName, out.connectOrCreate)
  }

  return out
}

function normalizeUpsertItem(childModelName, item) {
  const out = { ...item }
  if ('create' in out) out.create = normalizeNode(childModelName, out.create)
  if ('update' in out) out.update = normalizeNode(childModelName, out.update)
  return out
}

function normalizeConnectOrCreateItem(childModelName, item) {
  // `where` references an existing row and must not be touched; only
  // `create` is new data.
  if (!item || typeof item !== 'object' || !('create' in item)) return item
  return { ...item, create: normalizeNode(childModelName, item.create) }
}

/**
 * The $extends() config object — passed straight to basePrisma.$extends().
 * Defensive by construction: normalizeNode only ever touches
 * typeof value === 'string' keys present in the registry, or object/array
 * values that resolve to an actual DMMF relation field, so `where` clauses
 * and unrelated nested objects are never touched.
 */
export const normalizeExtension = {
  name: 'text-normalize',
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (args.data) args.data = normalizeNode(model, args.data)
        return query(args)
      },
      async update({ model, args, query }) {
        if (args.data) args.data = normalizeNode(model, args.data)
        return query(args)
      },
      async upsert({ model, args, query }) {
        if (args.create) args.create = normalizeNode(model, args.create)
        if (args.update) args.update = normalizeNode(model, args.update)
        return query(args)
      },
      async createMany({ model, args, query }) {
        if (Array.isArray(args.data)) args.data = args.data.map((row) => normalizeNode(model, row))
        return query(args)
      },
      async updateMany({ model, args, query }) {
        if (args.data) args.data = normalizeNode(model, args.data)
        return query(args)
      },
    },
  },
}
