import bcrypt from "bcryptjs";
import prisma from "../../../db.js";

// "Prove you're still you" re-auth check before a destructive operation.
export const verifyPassword = async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) {
    return res.status(400).json({ success: false, error: "Password is required." });
  }

  const needle = String(req.user?.email || "").trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: needle, isActive: true } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    return res.status(401).json({ success: false, error: "Incorrect password." });
  }

  return res.json({ success: true });
};
