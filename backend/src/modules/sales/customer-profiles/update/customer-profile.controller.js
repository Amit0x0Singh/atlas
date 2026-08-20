import prisma from "../../../../db.js";
import { toSafeErrorMessage } from "../../../../utils/safe-error.js";

// POST /api/customer-profiles/upsert
const upsertCustomerProfile = async (req, res) => {
  try {
    const { customerName, company, orderType } = req.body;
    if (!customerName?.trim())
      return res
        .status(400)
        .json({ success: false, error: "customerName required" });

    // customerName is stored lowercase (RULES.LOWER, applied on create/update
    // by the Prisma extension) — this manual findUnique lookup happens
    // before that, so it must already match storage case itself, or an
    // existing row's differently-cased duplicate would go undetected and
    // this would attempt a second `create` that violates the unique
    // constraint on every repeat order for the same customer.
    const name = customerName.trim().toLowerCase();
    const existing = await prisma.customerProfile.findUnique({
      where: { customerName: name },
    });

    if (existing) {
      await prisma.customerProfile.update({
        where: { customerName: name },
        data: {
          company:    company   || existing.company,
          orderType:  orderType || existing.orderType,
          orderCount: { increment: 1 },
        },
      });
    } else {
      await prisma.customerProfile.create({
        data: {
          customerName: name,
          company:   company   || "",
          orderType: orderType || "DOMESTIC",
          orderCount: 1,
        },
      });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
};

export { upsertCustomerProfile };
