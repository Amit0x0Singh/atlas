import rateLimit from "express-rate-limit";

// Strict — brute-force mitigation on the two credential-checking endpoints.
// 10 attempts / 15 min per IP: generous enough that a legitimate user who
// mistypes a password a few times is never blocked, tight enough to make
// online brute-forcing any of this app's known accounts impractical.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts. Please try again later." },
});

// Generous, defense-in-depth-only global limiter — this is an internal ERP
// tool with polling UI (e.g. useJobPolling at 1.5s intervals for
// backup/restore/bulk-transform job status ~= 40 req/min) and bulk list/
// import operations, not a public-facing consumer API. 600 req/min per IP
// comfortably covers normal multi-tab/bulk usage with wide margin, while
// still bounding worst-case abuse from a single IP.
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please slow down." },
});
