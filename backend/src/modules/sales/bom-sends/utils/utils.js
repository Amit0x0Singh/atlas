import prisma from "../../../../db.js";

// Accepts an optional Prisma client so callers running inside a
// $transaction can pass `tx` and see their own uncommitted writes.
const getIssuedQty = async (sendId, rmCode, client = prisma) => {
  const rows = await client.stockLedger.findMany({
    where: {
      transactionType: "BOM_ISSUANCE",
      reference: { contains: sendId, mode: "insensitive" },
      itemCode: rmCode,
    },
  });
  return rows.reduce((s, r) => s + (r.outQty || 0), 0);
};

export default getIssuedQty;
