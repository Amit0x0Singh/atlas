/**
 * Auth › Setup — Local Middleware
 * Validates POST /api/auth/setup request body — the one-time "create the
 * first admin account" bootstrap flow (see setup.controller.js for why this
 * exists and how it stays safe once real users exist).
 */
import { isRequired, validationError } from "../../../middleware/validators/common.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSetup(req, res, next) {
  const { fullName, email, password } = req.body || {};
  const errors = [
    ...isRequired("fullName", fullName),
    ...isRequired("email", email),
    ...isRequired("password", password),
  ];
  if (email && !EMAIL_RE.test(String(email).trim())) {
    errors.push("email must be a valid email address");
  }
  if (password && String(password).length < 8) {
    errors.push("password must be at least 8 characters");
  }
  if (errors.length) return res.status(400).json(validationError(errors));
  next();
}
