/**
 * Plant-scope enforcement — this app's one real "scope" concept (there is
 * no multi-tenant/organization concept anywhere in the schema). A User with
 * a non-empty `plants[]` is restricted to those plant tags; an empty array
 * means unscoped (sees/acts on every plant). Only applied to
 * production/microbial/planning resources that actually carry a
 * plant/section column — never to Gate/Store/Sales, which have none.
 */
import prisma from "../db.js";

// List/aggregate queries: silently narrow to the caller's plant(s) instead
// of erroring — a scoped user's plain "list all" call should just show
// their own plants, not fail.
export function scopeWhereByPlant(req, where = {}, field = "plant") {
  const scope = req.user?.plants;
  if (!scope?.length) return where;
  return { ...where, [field]: { in: scope } };
}

// Write endpoints where the plant is client-supplied (body/query): explicit
// mismatch -> 403. Unscoped users and requests with no plant specified pass
// through untouched.
export function requirePlantInScope(field = "plant") {
  return function (req, res, next) {
    const scope = req.user?.plants;
    if (!scope?.length) return next();
    const requested = req.body?.[field] || req.query?.[field];
    if (requested && !scope.includes(requested)) {
      return res.status(403).json({
        success: false,
        error: `Plant '${requested}' is outside your assigned scope.`,
        code: "FORBIDDEN",
      });
    }
    next();
  };
}

// ID-based routes: fetch just the record's plant column before letting the
// controller touch it. This is the concrete "ID-based bypass" fix — knowing
// another plant's record ID no longer lets a scoped account read/mutate it.
export function requireRecordPlantInScope({ model, idParam = "id", idField, plantField = "plant" }) {
  const dbIdField = idField || idParam;
  return async function (req, res, next) {
    const scope = req.user?.plants;
    if (!scope?.length) return next();
    try {
      const record = await prisma[model].findUnique({
        where: { [dbIdField]: req.params[idParam] },
        select: { [plantField]: true },
      });
      if (record && !scope.includes(record[plantField])) {
        return res.status(403).json({
          success: false,
          error: "This record belongs to a plant outside your scope.",
          code: "FORBIDDEN",
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
