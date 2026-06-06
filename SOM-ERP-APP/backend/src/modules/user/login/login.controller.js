import prisma from "../../../db.js";
import {
  signJwt,
  verifyPassword,
  verifyPin,
} from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";

export async function login(req, res) {
  const { username, password } = req.body;

  const rows = await prisma.$queryRaw`
    SELECT user_id, username, full_name, role, password_hash, is_active
    FROM users WHERE username = ${username} LIMIT 1
  `;
  const user = rows[0];
  if (!user || !user.is_active)
    return res
      .status(401)
      .json({ success: false, error: "Invalid credentials" });

  if (!verifyPassword(password, user.password_hash))
    return res
      .status(401)
      .json({ success: false, error: "Invalid credentials" });

  const token = signJwt({
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  });

  await writeAudit({
    userId: user.user_id,
    username: user.username,
    action: "LOGIN",
    tableName: "users",
    recordId: user.user_id,
    ip: req.ip,
  });

  return res.json({
    success: true,
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    },
  });
}

export async function pinLogin(req, res) {
  const { username, pin } = req.body;

  const rows = await prisma.$queryRaw`
    SELECT user_id, username, full_name, role, pin_hash, is_active
    FROM users WHERE username = ${username} LIMIT 1
  `;
  const user = rows[0];
  if (!user || !user.is_active)
    return res
      .status(401)
      .json({ success: false, error: "Invalid credentials" });
  if (!user.pin_hash)
    return res
      .status(401)
      .json({ success: false, error: "PIN not set for this user" });
  if (!verifyPin(pin, user.pin_hash))
    return res.status(401).json({ success: false, error: "Invalid PIN" });

  // Short-lived token (30 min), marked as pin_session
  const token = signJwt(
    {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      pin_session: true,
    },
    30 * 60,
  );

  await writeAudit({
    userId: user.user_id,
    username: user.username,
    action: "PIN_LOGIN",
    tableName: "users",
    recordId: user.user_id,
    ip: req.ip,
  });

  return res.json({
    success: true,
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    },
  });
}
