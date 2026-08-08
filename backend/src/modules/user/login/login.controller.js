import bcrypt from "bcryptjs";
import prisma from "../../../db.js";
import { signJwt } from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";

// Dummy hash compared against when no account matches, so a nonexistent
// email takes roughly the same time as a wrong-password attempt on a real
// account — mitigates trivial email-enumeration via response timing.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8Q4dLB0MgIS4rMdXOZLUqfNlt5xB0S";

export const login = async (req, res) => {
  const { email, password } = req.body;
  const needle = String(email || "").trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: needle, isActive: true } });
  const ok = await bcrypt.compare(password || "", user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    return res.status(401).json({ success: false, error: "Invalid credentials", code: "UNAUTHORIZED" });
  }

  const token = signJwt({ email: user.email });

  await writeAudit({
    userId: user.userId, // now a real UUID — access.js accounts never had one, so this was always null before
    username: user.email,
    action: "LOGIN",
    tableName: "users",
    recordId: user.email,
    ip: req.ip,
  });

  return res.json({
    success: true,
    token,
    user: {
      user_id: user.email,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      operation: user.operation,
      plant: user.plant,
    },
  });
};
