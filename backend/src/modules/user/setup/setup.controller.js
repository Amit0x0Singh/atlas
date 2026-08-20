/**
 * Auth › Setup — the one-time "create the first admin account" bootstrap
 * flow.
 *
 * Problem it solves: a freshly deployed environment (new server, empty
 * database) has no users at all, and every other way to create a user
 * (POST /api/admin/rbac/users) requires already being logged in as an
 * admin — a chicken-and-egg problem with no UI path out of it.
 *
 * Safety model: this endpoint works ONLY while `User` table is completely
 * empty (`prisma.user.count() === 0`), re-checked on every request rather
 * than tracked via a one-time flag — the instant a first user exists
 * (through this flow or any other), it permanently 403s. Optionally
 * hardened further with a `SETUP_SECRET` env var (see below) as
 * defense-in-depth against a race where an attacker reaches this endpoint
 * before the legitimate deployer does.
 *
 * It does not assume `npx prisma db seed` has ever been run: it upserts the
 * full Permission catalog and a "Super Admin" Role with every permission
 * attached from scratch if they don't already exist, exactly like
 * prisma/seed.js's seedPermissions()/seedRoles() do — so it also works on a
 * database that only ever had `prisma migrate deploy` run against it.
 */
import bcrypt from "bcryptjs";
import prisma from "../../../db.js";
import { signJwt } from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";
import { resolveEffectivePermissions } from "../../../services/permission-resolver.js";
import { PERMISSIONS, PERMISSION_KEYS } from "../../../constants/permissions.catalog.js";

const SUPER_ADMIN_ROLE_NAME = "Super Admin";

export const getSetupStatus = async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    return res.json({
      success: true,
      needsSetup: userCount === 0,
      requiresSecret: Boolean(process.env.SETUP_SECRET),
    });
  } catch (err) {
    console.error("getSetupStatus error:", err.message);
    return res.status(500).json({ success: false, error: err.message, code: "INTERNAL_ERROR" });
  }
};

async function ensureSuperAdminRole() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  const role = await prisma.role.upsert({
    where: { name: SUPER_ADMIN_ROLE_NAME },
    update: {},
    create: {
      name: SUPER_ADMIN_ROLE_NAME,
      description: "Full, unrestricted access to every module and action.",
      isSystem: true,
    },
  });

  const perms = await prisma.permission.findMany({ where: { key: { in: PERMISSION_KEYS } }, select: { permissionId: true } });
  await prisma.rolePermissionMap.createMany({
    data: perms.map((p) => ({ roleId: role.roleId, permissionId: p.permissionId })),
    skipDuplicates: true,
  });

  return role;
}

export const bootstrapAdmin = async (req, res) => {
  const { fullName, email, password, setupSecret } = req.body || {};
  try {
    const requiredSecret = process.env.SETUP_SECRET;
    if (requiredSecret && setupSecret !== requiredSecret) {
      return res.status(403).json({ success: false, error: "Invalid setup secret", code: "FORBIDDEN" });
    }

    // Re-checked here, not just trusted from getSetupStatus — the whole
    // point is this can never create a second account.
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({ success: false, error: "Setup has already been completed — log in instead.", code: "FORBIDDEN" });
    }

    const needle = String(email).trim().toLowerCase();
    const role = await ensureSuperAdminRole();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: needle,
        email: needle,
        passwordHash,
        fullName: String(fullName).trim(),
        isActive: true,
        roles: { create: [{ roleId: role.roleId }] },
      },
    });

    const token = signJwt({ sub: user.userId });
    const { roles, permissions } = await resolveEffectivePermissions(user.userId, { fresh: true });

    await writeAudit({
      userId: user.userId,
      username: user.username,
      fullName: user.fullName,
      action: "CREATE",
      module: "admin",
      tableName: "users",
      recordId: user.userId,
      newValue: { email: user.email, fullName: user.fullName, role: SUPER_ADMIN_ROLE_NAME },
      notes: "initial admin account created via first-run setup",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        plants: user.plants,
        roles,
        permissions,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, error: "An account with that email already exists.", code: "CONFLICT" });
    }
    console.error("bootstrapAdmin error:", err.message);
    return res.status(500).json({ success: false, error: err.message, code: "INTERNAL_ERROR" });
  }
};
