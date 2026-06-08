import prisma from "../../../db.js";

// GET /api/customer-profiles
export async function getCustomerProfiles(req, res) {
  try {
    const profiles = await prisma.customerProfile.findMany({
      orderBy: [{ orderCount: "desc" }, { customerName: "asc" }],
    });
    return res.json({ success: true, data: profiles });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/customer-profiles/upsert
export async function upsertCustomerProfile(req, res) {
  try {
    const { customerName, company, orderType } = req.body;
    if (!customerName?.trim())
      return res.status(400).json({ success: false, error: "customerName required" });

    const existing = await prisma.customerProfile.findUnique({
      where: { customerName: customerName.trim().toUpperCase() },
    });

    if (existing) {
      await prisma.customerProfile.update({
        where: { customerName: customerName.trim().toUpperCase() },
        data: {
          company: company || existing.company,
          orderType: orderType || existing.orderType,
          orderCount: { increment: 1 },
        },
      });
    } else {
      await prisma.customerProfile.create({
        data: {
          customerName: customerName.trim().toUpperCase(),
          company: company || "",
          orderType: orderType || "DOMESTIC",
          orderCount: 1,
        },
      });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/customer-profiles/seed
export async function seedCustomerProfiles(req, res) {
  try {
    const { profiles } = req.body;
    if (!Array.isArray(profiles))
      return res.status(400).json({ success: false, error: "profiles array required" });

    let created = 0,
      updated = 0;
    for (const p of profiles) {
      if (!p.customerName?.trim()) continue;
      const name = p.customerName.trim().toUpperCase();
      const existing = await prisma.customerProfile.findUnique({
        where: { customerName: name },
      });
      if (existing) {
        if (p.orderCount > existing.orderCount) {
          await prisma.customerProfile.update({
            where: { customerName: name },
            data: {
              company: p.company || existing.company,
              orderType: p.orderType || existing.orderType,
              orderCount: p.orderCount,
            },
          });
          updated++;
        }
      } else {
        await prisma.customerProfile.create({
          data: {
            customerName: name,
            company: p.company || "",
            orderType: p.orderType || "DOMESTIC",
            orderCount: p.orderCount || 1,
          },
        });
        created++;
      }
    }
    return res.json({ success: true, created, updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
