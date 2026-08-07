import { PrismaClient } from "@prisma/client";
import { normalizeExtension } from "../src/utils/prisma-normalize-extension.js";
import { auditStampExtension } from "../src/utils/prisma-audit-extension.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Please set it in backend/.env or your environment variables.",
  );
}

// basePrisma owns the actual connection ($connect/$disconnect live here —
// $extends() returns a new object that doesn't have those methods). Every
// other module in the app imports the extended `prisma` default export
// below, which transparently normalizes text on every write per the
// text-storage standard (see src/config/field-normalization-rules.js) and
// stamps createdBy/updatedBy per the audit-field standard (see
// src/utils/prisma-audit-extension.js).
const basePrisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

const prisma = basePrisma.$extends(normalizeExtension).$extends(auditStampExtension);

export async function connectDb() {
  console.log("Connecting to database...");
  await basePrisma.$connect();
  console.log("Database connected.");
  return prisma;
}

export async function disconnectDb() {
  await basePrisma.$disconnect();
  console.log("Database disconnected.");
}

export default prisma;
