import express from "express";

import { authenticate } from "../../middleware/auth.js";
import { validateLogin } from "./login/login.middleware.js";
import { login } from "./login/login.controller.js";
import { verifyPassword } from "./verify-password/verify-password.controller.js";

const UserRouter = express.Router();

UserRouter.post("/login", validateLogin, login);

UserRouter.get("/me", authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

UserRouter.post("/verify-password", authenticate, verifyPassword);

export default UserRouter;
