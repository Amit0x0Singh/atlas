/**
 * ERP Auth Middleware — JWT verify + operation/role guard
 * Backed by the `User` table (bcrypt-hashed passwords) — migrated off the
 * flat-file plaintext accounts formerly in backend/access.js. Uses Node.js
 * built-in crypto for JWT signing (no external JWT library needed).
 */
import { createHmac } from "crypto";
import prisma from "../db.js";
import { runWithRequestContext } from "../utils/request-context.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not defined. Please set it in backend/.env or your environment variables.",
  );
}
const JWT_EXPIRES_SEC = 8 * 60 * 60; // 8 hours

// ─── JWT helpers ────────────────────────────────────────────────────────────

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

// Shapes a matched User row into the req.user object the rest of the app
// expects (many controllers read req.user?.user_id / .role as a plain
// string to stamp createdBy/issuedBy/etc columns — email fills that role,
// exactly as it did under the old access.js-backed system, so nothing
// downstream needed to change).
function toReqUser(user) {
  return {
    user_id: user.email,
    email: user.email,
    username: user.email,
    full_name: user.fullName,
    role: user.role,       // 'admin' (full access) | 'employee' (read-only)
    operation: user.operation, // 'gate' | 'store' | 'production' | 'admin'
    plant: user.plant,     // set for production accounts only
  };
}

// Case-insensitive lookup — relies on User.email's write-time lowercase
// normalization (Prisma Client Extension, see config/db.js) plus the
// ci_users_email_idx functional index; pre-lowercasing the input keeps this
// a plain equality match.
async function findActiveUserByEmail(email) {
  const needle = String(email || "").trim().toLowerCase();
  if (!needle) return null;
  return prisma.user.findFirst({ where: { email: needle, isActive: true } });
}

// ─── Dev bypass ─────────────────────────────────────────────────────────────
// Set BYPASS_AUTH=true in .env to skip token checks during development.
// Never set this in production — the guard below prevents it, but that
// guard only holds if NODE_ENV is explicitly "production" in the deployed
// environment; an unset NODE_ENV behaves like dev.
const BYPASS_AUTH =
  process.env.BYPASS_AUTH === "true" &&
  process.env.NODE_ENV !== "production";

const DEV_USER = toReqUser({
  email: "dev@agrilife.com",
  fullName: "Dev Super Admin",
  role: "admin",
  operation: "admin",
  plant: null,
});

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ─── Express middleware: authenticate ────────────────────────────────────────
// Verifies the token, sets req.user, and enforces the blanket "employees are
// read-only" rule on every route this is applied to.

export async function authenticate(req, res, next) {
  if (BYPASS_AUTH) {
    req.user = DEV_USER;
    // Rest of this request's middleware/controller chain runs inside this
    // context — see request-context.js — so the audit-stamp Prisma
    // extension can attribute any write it makes to this account.
    return runWithRequestContext({ userEmail: req.user.email }, next);
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header",
      });
    }
    const token = authHeader.slice(7);
    const payload = verifyJwt(token);
    const user = await findActiveUserByEmail(payload.email);
    if (!user) {
      return res.status(401).json({ success: false, error: "Account no longer exists" });
    }
    req.user = toReqUser(user);

    if (MUTATING_METHODS.has(req.method) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Read-only account — this operation requires an administrator account.",
      });
    }
    return runWithRequestContext({ userEmail: req.user.email }, next);
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: err.message || "Unauthorized" });
  }
}

// ─── Express middleware factory: authorize(operations[]) ─────────────────────
// Restricts a route to accounts belonging to one of the given operations.
// The 'admin' operation is a super-admin and always passes. Also runs
// authenticate() first, so the read-only-for-employees rule still applies.

export function authorize(operations = []) {
  return function (req, res, next) {
    authenticate(req, res, () => {
      const op = req.user?.operation;
      if (op !== "admin" && operations.length && !operations.includes(op)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. This module requires: ${operations.join(" or ")}. Your operation: ${op}`,
        });
      }
      next();
    });
  };
}

// Alias for admin-operation only (super-admin)
export const adminOnly = authorize(["admin"]);

export const storeOrAbove = authorize(["store"]);

export const managerOrAbove = authorize(["store"]);
