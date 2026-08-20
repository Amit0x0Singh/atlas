/**
 * ERP Auth Middleware — JWT verify + permission-based authorization.
 *
 * Login is database-backed (Prisma `User`, bcrypt-hashed passwords) — see
 * modules/user/login/login.controller.js. This replaces the old flat-file
 * access.js account list (retired) and the old two-axis role(admin/employee)
 * x operation(gate/store/production/admin) check with granular
 * `module.resource.action` permissions resolved via
 * User -> UserRole -> Role -> RolePermissionMap -> Permission. See
 * backend/docs/RBAC.md for the full architecture and how to add a new
 * protected route.
 *
 * Every authenticated request also runs inside a request-context (see
 * utils/request-context.js) carrying the caller's email, so the
 * audit-stamp Prisma Client Extension (utils/prisma-audit-extension.js) can
 * auto-populate createdBy/updatedBy on any write made during that request
 * with zero per-controller wiring.
 */
import { createHmac } from "crypto";
import prisma from "../db.js";
import { resolveEffectivePermissions } from "../services/permission-resolver.js";
import { runWithRequestContext } from "../utils/request-context.js";
import { toSafeErrorMessage } from '../utils/safe-error.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not defined. Please set it in backend/.env or your environment variables.",
  );
}
const JWT_EXPIRES_SEC = 8 * 60 * 60; // 8 hours

// ─── JWT helpers ────────────────────────────────────────────────────────────
// Payload stays minimal — { sub: userId } only, no roles/permissions baked
// in. That's deliberate: permissions are resolved fresh (or from the short
// TTL cache) on every request, so a role/permission change takes effect on
// the user's next request instead of requiring a token refresh.

export function signJwt(payload, expiresIn = JWT_EXPIRES_SEC) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }),
  ).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token) {
  const parts = token?.split(".");
  if (!parts || parts.length !== 3) throw new Error("Invalid token format");
  const [h, b, s] = parts;
  const expected = createHmac("sha256", JWT_SECRET)
    .update(`${h}.${b}`)
    .digest("base64url");
  if (s !== expected) throw new Error("Invalid token signature");
  const payload = JSON.parse(Buffer.from(b, "base64url").toString());
  if (payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  return payload;
}

// Shapes a User row + its resolved permissions into the req.user object the
// rest of the app reads. `user_id` (snake_case) is kept alongside `userId`
// for the many existing controllers that read req.user?.user_id to stamp
// createdBy/raisedBy/etc columns.
function toReqUser(user, { roles, permissions }) {
  return {
    userId: user.userId,
    user_id: user.userId,
    email: user.email,
    username: user.username,
    full_name: user.fullName,
    isActive: user.isActive,
    plants: user.plants,
    roles,
    permissions: new Set(permissions),
  };
}

// ─── Dev bypass ─────────────────────────────────────────────────────────────
// Set BYPASS_AUTH=true in .env to skip token checks during development.
// Never set this in production — the guard below prevents it. Resolves (and
// lazily creates, idempotently) a real Super Admin User row so dev-mode
// testing still exercises the real authenticate()/authorize() code path,
// not a synthetic shortcut.
const BYPASS_AUTH =
  process.env.BYPASS_AUTH === "true" &&
  process.env.NODE_ENV !== "production";

const DEV_USER_EMAIL = "dev@agrilife.local";
let devUserPromise = null;

async function getOrCreateDevUser() {
  if (!devUserPromise) {
    devUserPromise = (async () => {
      let user = await prisma.user.findUnique({ where: { email: DEV_USER_EMAIL } });
      if (!user) {
        const superAdmin = await prisma.role.findUnique({ where: { name: "Super Admin" } });
        user = await prisma.user.create({
          data: {
            username: DEV_USER_EMAIL,
            email: DEV_USER_EMAIL,
            passwordHash: "!", // never used for real login — BYPASS_AUTH skips password checks entirely
            fullName: "Dev Super Admin",
            plants: [],
            isActive: true,
            ...(superAdmin ? { roles: { create: [{ roleId: superAdmin.roleId }] } } : {}),
          },
        });
      }
      return user;
    })();
  }
  return devUserPromise;
}

// ─── Express middleware: authenticate ────────────────────────────────────────
// Verifies the token, loads the User row, resolves effective permissions,
// and sets req.user. 401 for missing/invalid/expired token, unknown user,
// or a disabled account — this is also how a just-disabled account gets
// force-logged-out on its very next request, with no session store needed.
// Runs the rest of the middleware/controller chain inside a request-context
// carrying req.user.email, so the audit-stamp Prisma extension can attribute
// any write made during this request to this account.

export async function authenticate(req, res, next) {
  try {
    let user;
    if (BYPASS_AUTH) {
      user = await getOrCreateDevUser();
    } else {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          error: "Missing or invalid Authorization header",
          code: "UNAUTHORIZED",
        });
      }
      const token = authHeader.slice(7);
      const payload = verifyJwt(token);
      user = await prisma.user.findUnique({ where: { userId: payload.sub } });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Account not found or disabled",
        code: "UNAUTHORIZED",
      });
    }

    const effective = await resolveEffectivePermissions(user.userId);
    req.user = toReqUser(user, effective);
    return runWithRequestContext({ userEmail: req.user.email }, next);
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: toSafeErrorMessage(err) || "Unauthorized", code: "UNAUTHORIZED" });
  }
}

// ─── Express middleware factory: authorize(permission) ───────────────────────
// Restricts a route to accounts holding at least one of the given
// permission keys. Runs authenticate() first — routes call authorize(...)
// alone, not authenticate() + authorize() as two separate steps. No
// operation==='admin' special-case anywhere: a "Super Admin" is simply a
// role holding every permission, so this middleware is uniform for every
// account.
export function authorize(permissionOrArray) {
  const required = Array.isArray(permissionOrArray) ? permissionOrArray : [permissionOrArray];
  return function (req, res, next) {
    authenticate(req, res, () => {
      if (required.length === 0) return next(); // authenticate-only, no specific permission required
      const has = required.some((p) => req.user.permissions.has(p));
      if (!has) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Requires permission: ${required.join(" or ")}`,
          code: "FORBIDDEN",
        });
      }
      next();
    });
  };
}
