import { Prisma } from '@prisma/client';
import { MODELS } from '../../admin_panel/get/admin_panel.controller.js';

// Derives FK-safe insert/delete ordering and cascade-dependent expansion
// straight from Prisma's own DMMF relation graph, rather than a hand-maintained
// array — this schema has changed shape mid-development more than once
// already (see PrintMaster/PackDetail), and a hand-typed order would silently
// go stale exactly when it matters most. Computed once at module load.

// Prisma's client accessor is always the model name with a lowercased first
// letter — the same transform already used everywhere in MODELS.
function accessorOf(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

const BUSINESS_ACCESSORS = new Set(Object.values(MODELS).map((m) => m.model));

const modelsByAccessor = new Map(
  Prisma.dmmf.datamodel.models
    .map((m) => [accessorOf(m.name), m])
    .filter(([accessor]) => BUSINESS_ACCESSORS.has(accessor)),
);

// Sanity check — every model MODELS points at must actually exist in the
// current schema, and vice versa; a mismatch here means a resource was added
// to MODELS without a matching Prisma model (or the schema moved on without
// MODELS catching up) and backup/restore would silently mis-handle it.
if (modelsByAccessor.size !== BUSINESS_ACCESSORS.size) {
  const missing = [...BUSINESS_ACCESSORS].filter((a) => !modelsByAccessor.has(a));
  throw new Error(`backup-order: MODELS references unknown Prisma models: ${missing.join(', ')}`);
}

// ─── Dependency graph: child -> [parent, parent, ...] ────────────────────────
// A field is a "child depends on parent" edge when it owns the FK
// (relationFromFields non-empty) and both sides are backup-eligible models.
const dependsOn = new Map([...modelsByAccessor.keys()].map((a) => [a, new Set()]));
// parentAccessor -> [childAccessor, ...] for onDelete: Cascade relations only.
export const CASCADE_DEPENDENTS = {};

for (const [childAccessor, model] of modelsByAccessor) {
  for (const field of model.fields) {
    if (field.kind !== 'object' || !field.relationFromFields?.length) continue;
    const parentAccessor = accessorOf(field.type);
    if (!modelsByAccessor.has(parentAccessor) || parentAccessor === childAccessor) continue;
    dependsOn.get(childAccessor).add(parentAccessor);
    if (field.relationOnDelete === 'Cascade') {
      (CASCADE_DEPENDENTS[parentAccessor] ??= []).push(childAccessor);
    }
  }
}

// ─── Topological sort (parents before children), alphabetical tie-break for
// determinism across runs/environments ────────────────────────────────────────
function topoSort(deps) {
  const order = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(node, chain) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      throw new Error(`backup-order: circular FK dependency detected: ${[...chain, node].join(' -> ')}`);
    }
    visiting.add(node);
    for (const parent of [...deps.get(node)].sort()) visit(parent, [...chain, node]);
    visiting.delete(node);
    visited.add(node);
    order.push(node);
  }

  for (const node of [...deps.keys()].sort()) visit(node, []);
  return order;
}

// Parent-before-child order for inserts; reverse it for deletes.
export const TABLE_ORDER = topoSort(dependsOn);

if (TABLE_ORDER.length !== BUSINESS_ACCESSORS.size) {
  throw new Error(
    `backup-order: TABLE_ORDER has ${TABLE_ORDER.length} entries, expected ${BUSINESS_ACCESSORS.size}`,
  );
}

export function insertOrderFor(tables) {
  const set = new Set(tables);
  return TABLE_ORDER.filter((m) => set.has(m));
}

export function deleteOrderFor(tables) {
  return [...insertOrderFor(tables)].reverse();
}

// accessor -> [fieldName, ...] for every BigInt-typed scalar field (AuditLog.id,
// NotificationEscalation.id, NotificationDeliveryLog.id today). JSON has no
// BigInt type, so the export writes these as strings — the restore side must
// coerce them back to real `bigint`s before handing rows to Prisma.
export const BIGINT_FIELDS = {};
for (const [accessor, model] of modelsByAccessor) {
  const fields = model.fields.filter((f) => f.kind === 'scalar' && f.type === 'BigInt').map((f) => f.name);
  if (fields.length) BIGINT_FIELDS[accessor] = fields;
}

// Given a requested table set, adds any table that would otherwise be
// silently cascade-deleted alongside a parent already in the set — used
// both when creating a backup (so the file actually contains those rows)
// and when restoring one (so the delete+reinsert set matches what Postgres
// will actually touch, regardless of what the user picked).
export function expandForCascades(tables) {
  const set = new Set(tables);
  let changed = true;
  while (changed) {
    changed = false;
    for (const parent of set) {
      for (const child of CASCADE_DEPENDENTS[parent] ?? []) {
        if (!set.has(child)) { set.add(child); changed = true; }
      }
    }
  }
  return [...set];
}
