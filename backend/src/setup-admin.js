/**
 * One-time admin bootstrap script.
 * Run ONCE from the backend folder:
 *   node src/setup-admin.js
 *
 * Creates / resets the admin user with a proper PBKDF2 hash.
 */
import "dotenv/config";
import { hashPassword } from "./middleware/auth.js";
import prisma from "./db.js";

const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "Admin@2026!";
const ADMIN_NAME = "System Administrator";
const ADMIN_EMAIL = "admin@somphytopharma.com";

async function main() {
  console.log("Generating password hash…");
  const hash = hashPassword(ADMIN_PASSWORD);

  const existing = await prisma.user.findFirst({ where: { username: ADMIN_USER } });

  if (existing) {
    await prisma.user.update({
      where: { userId: existing.userId },
      data: { passwordHash: hash, fullName: ADMIN_NAME, role: 'admin', isActive: true },
    });
    console.log("✅ Admin user password updated.");
  } else {
    await prisma.user.create({
      data: { username: ADMIN_USER, passwordHash: hash, fullName: ADMIN_NAME, role: 'admin', email: ADMIN_EMAIL, isActive: true },
    });
    console.log("✅ Admin user created.");
  }

  console.log("");
  console.log("  Username : admin");
  console.log("  Password : Admin@2026!");
  console.log("");
  console.log("Login at: http://localhost:5173/login");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
