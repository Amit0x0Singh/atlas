import express from "express";

import { authenticate } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rate-limit.js";
import { validateLogin } from "./login/login.middleware.js";
import { login } from "./login/login.controller.js";
import { validateSetup } from "./setup/setup.middleware.js";
import { getSetupStatus, bootstrapAdmin } from "./setup/setup.controller.js";
import { verifyPassword } from "./verify-password/verify-password.controller.js";
import { resolveEffectivePermissions } from "../../services/permission-resolver.js";
import { writeAudit, auditUser } from "../../middleware/audit.js";

const UserRouter = express.Router();

UserRouter.post("/login", authLimiter, validateLogin, login);

// First-run bootstrap — only usable while the users table is empty (see
// setup.controller.js). Rate-limited the same as login since it also
// verifies a secret/checks credentials-adjacent state.
UserRouter.get("/setup-status", getSetupStatus);
UserRouter.post("/setup", authLimiter, validateSetup, bootstrapAdmin);

// Stateless JWT — there's no server-side session to invalidate, so this
// route's only job is recording the action; the frontend calls it right
// before discarding the token.
UserRouter.post("/logout", authenticate, async (req, res) => {
  await writeAudit({ ...auditUser(req), action: "LOGOUT", module: "admin", tableName: "users", recordId: req.user.userId });
  res.json({ success: true });
});

// The client's explicit "check for a permission change" poll (called on app
// load + tab-focus) — always resolves fresh (bypasses the TTL cache) so an
// admin's just-made change is visible immediately, not after a stale window.
UserRouter.get("/me", authenticate, async (req, res) => {
  const { roles, permissions } = await resolveEffectivePermissions(req.user.userId, { fresh: true });
  res.json({
    success: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      username: req.user.username,
      fullName: req.user.full_name,
      plants: req.user.plants,
      roles,
      permissions,
    },
  });
});

UserRouter.post("/verify-password", authLimiter, authenticate, verifyPassword);

export default UserRouter;
