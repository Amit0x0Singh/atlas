import prisma from "../../../db.js";
import {
  signJwt,
  verifyPassword,
  verifyPin,
} from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";

export const login = async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      userId: true,
      username: true,
      fullName: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive)
    return res.status(401).json({ success: false, error: "Invalid credentials", code: 'UNAUTHORIZED' });

  if (!verifyPassword(password, user.passwordHash))
    return res.status(401).json({ success: false, error: "Invalid credentials", code: 'UNAUTHORIZED' });

  const token = signJwt({
    user_id: user.userId,
    username: user.username,
    full_name: user.fullName,
    role: user.role,
  });

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
      user_id: user.userId,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
    },
  });
}

export const pinLogin = async (req, res) => {
  const { username, pin } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      userId: true,
      username: true,
      fullName: true,
      role: true,
      pinHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive)
    return res.status(401).json({ success: false, error: "Invalid credentials", code: 'UNAUTHORIZED' });

  if (!user.pinHash)
    return res.status(401).json({ success: false, error: "PIN not set for this user", code: 'UNAUTHORIZED' });

  if (!verifyPin(pin, user.pinHash))
    return res.status(401).json({ success: false, error: "Invalid PIN", code: 'UNAUTHORIZED' });

  const token = signJwt(
    {
      user_id: user.userId,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
      pin_session: true,
    },
    30 * 60,
  );

  await writeAudit({
    userId: user.userId,
    username: user.username,
    action: "PIN_LOGIN",
    tableName: "users",
    recordId: user.userId,
    ip: req.ip,
  });

  return res.json({
    success: true,
    token,
    user: {
      user_id: user.userId,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
    },
  });
}
