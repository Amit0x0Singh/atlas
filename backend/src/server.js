import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import path from "path"; 
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { startCronJobs } from "./services/cron-jobs.js";
import { runAutoSeed } from "./services/auto-seed.js";
import router from "./routers/routers.js";
import { connectDb, disconnectDb } from "../config/db.js";
import { globalApiLimiter } from "./middleware/rate-limit.js";
import { toSafeErrorMessage } from "./utils/safe-error.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// If this app is ever deployed behind a reverse proxy (nginx/ALB/etc.),
// `app.set('trust proxy', 1)` (or the correct hop count) must be added —
// otherwise express-rate-limit and req.ip (used by audit logging) will see
// the proxy's IP for every client. Left unset here deliberately: enabling
// it incorrectly (e.g. blanket `true`) lets any client spoof its own IP via
// X-Forwarded-For, which is worse than not having it. No reverse proxy is
// in front of this app in the current deployment shape.

app.set("trust proxy", 1);

// ── Security headers ────────────────────────────────────────────────────────────
app.use(helmet());

// ── Body parsing ───────────────────────────────────────────────────────────────
// Replaces Fastify's built-in body parser + bodyLimit option
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// ── CORS ───────────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = (process.env.FRONTEND_URLS || "").split(",").map((s) => s.trim()).filter(Boolean);
// app.use(
//   cors({
//     // Dev: allow any localhost port (main ERP 5173, admin panel 5175, etc.)
//     // Prod: only origins explicitly listed in FRONTEND_URLS (comma-separated).
//     origin: isDev
//       ? (origin, cb) => {
//           if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) cb(null, true);
//           else cb(new Error("CORS: origin not allowed"));
//         }
//       : (origin, cb) => {
//           if (!origin || allowedOrigins.includes(origin)) cb(null, true);
//           else cb(new Error("CORS: origin not allowed"));
//         },
//     credentials: true,
//   }),
// );

app.use(cors())

// ── File uploads ───────────────────────────────────────────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => cb(null, /\.(xlsx|xls|csv|json|gz)$/i.test(file.originalname)),
});

// ── Health check ───────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Register all API routes ────────────────────────────────────────────────────
app.use(
  "/api",
  globalApiLimiter,
  (req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    }
    next();
  },
  router,
);

// ── Serve built frontend in production ────────────────────────────────────────
const publicDir = path.join(__dirname, "..", "public");
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.use((req, res, next) => {
    if (!req.url.startsWith("/api")) {
      return res.sendFile(path.join(publicDir, "index.html"));
    }
    next();
  });
}

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// ── Global error handler ───────────────────────────────────────────────────────
// NOTE: Express requires exactly 4 arguments (err, req, res, next)
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: toSafeErrorMessage(err),
    code: err.code || "INTERNAL_ERROR",
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
await connectDb();

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`SOM ERP Backend running on port ${PORT}`);
  runAutoSeed((msg) => console.log(msg));
  startCronJobs(app);
});

const shutdown = async () => {
  console.log("Shutting down backend...");
  await disconnectDb();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
