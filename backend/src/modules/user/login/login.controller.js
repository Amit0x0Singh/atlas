import bcrypt from "bcryptjs";
import prisma from "../../../db.js";
import { signJwt } from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";
import { resolveEffectivePermissions } from "../../../services/permission-resolver.js";

// Dummy hash compared against when no account matches, so a nonexistent
// email takes roughly the same time as a wrong-password attempt on a real
// account — mitigates trivial email-enumeration via response timing.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8Q4dLB0MgIS4rMdXOZLUqfNlt5xB0S";

// Database-backed login (Prisma `User`, bcrypt-hashed passwords). Same
// generic "Invalid credentials" message for unknown email, wrong password,
// and a disabled account — deliberately not distinguishing them, to avoid
// account-enumeration.
export const login = async (req, res) => {
  const { email, password } = req.body;
  // Relies on User.email's write-time lowercase normalization (Prisma
  // Client Extension, see config/db.js) plus the ci_users_email_idx
  // functional index — pre-lowercasing the input keeps this a plain
  // equality match instead of a case-insensitive scan.
  const needle = String(email || "").trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: needle, isActive: true } });
  const ok = await bcrypt.compare(password || "", user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    return res.status(401).json({ success: false, error: "Invalid credentials", code: "UNAUTHORIZED" });
  }

  const token = signJwt({ sub: user.userId });
  const { roles, permissions } = await resolveEffectivePermissions(user.userId, { fresh: true });

  await writeAudit({
    userId: user.userId,
    username: user.username,
    action: "LOGIN",
    tableName: "users",
    recordId: user.userId,
    ip: req.ip,
  });

  return res.json({
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
};
