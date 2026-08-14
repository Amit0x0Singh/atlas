import bcrypt from "bcryptjs";
import prisma from "../../../db.js";
import { signJwt } from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";
import { resolveEffectivePermissions } from "../../../services/permission-resolver.js";

// Database-backed login (Prisma `User`, bcrypt-hashed passwords). Same
// generic "Invalid credentials" message for unknown email, wrong password,
// and a disabled account — deliberately not distinguishing them, to avoid
// account-enumeration.
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
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
