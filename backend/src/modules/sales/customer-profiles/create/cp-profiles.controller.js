import prisma from "../../../../db.js";

// POST /api/customer-profiles/seed
const seedCustomerProfiles = async (req, res) => {
  try {
    const { profiles } = req.body;
    if (!Array.isArray(profiles))
      return res
        .status(400)
        .json({ success: false, error: "profiles array required" });

    let created = 0, updated = 0;
    for (const p of profiles) {
      if (!p.customerName?.trim()) continue;
      const name = p.customerName.trim();
      const existing = await prisma.customerProfile.findFirst({
        where: { customerName: { equals: name, mode: "insensitive" } },
      });
      if (existing) {
        if (p.orderCount > existing.orderCount) {
          await prisma.customerProfile.update({
            where: { customerName: existing.customerName },
            data: {
              company:    p.company   || existing.company,
              orderType:  p.orderType || existing.orderType,
              orderCount: p.orderCount,
            },
          });
          updated++;
        }
      } else {
        await prisma.customerProfile.create({
          data: {
            customerName: name,
            company:    p.company   || "",
            orderType:  p.orderType || "DOMESTIC",
            orderCount: p.orderCount || 1,
          },
        });
        created++;
      }
    }
    return res.json({ success: true, created, updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

// POST /api/customer-profiles/upsert-many
const upsertManyCpProfiles = async (req, res) => {
  try {
    const { customerName, items } = req.body;
    if (!customerName || !Array.isArray(items))
      return res
        .status(400)
        .json({ success: false, error: "customerName and items[] required" });

    const name = customerName.trim();
    let saved = 0;

    for (const it of items) {
      const pname = (it.customerProductName || it.productName || "").trim();
      if (!pname) continue;

      let shelfLifeDays = null;
      if (it.mfgDate && it.expDate) {
        const diff = Math.round(
          (new Date(it.expDate) - new Date(it.mfgDate)) / 86400000,
        );
        if (diff > 0) shelfLifeDays = diff;
      }

      const update = {
        productCode:   it.inhouseProductCode || it.productCode || null,
        inhouseName:   it.inhouseProductName || null,
        activeSpecs:   it.activeSpecs        || null,
        carrier:       it.carrier            || null,
        sectionName:   it.sectionName        || null,
        unitQty:       it.unitQty       ? parseFloat(it.unitQty)   : null,
        unitUom:       it.unitUom            || null,
        unitPackType:  it.unitPackType       || null,
        primaryPack:   it.primaryPack  || it.unitPackType  || null,
        secondaryPack: it.secondaryPack || it.packingType  || null,
        unitsPerCS:    it.unitsPerCS    ? parseInt(it.unitsPerCS)   : null,
        totalUom:      it.totalUom           || "KG",
        labelType:     it.labelType          || null,
        mrp:           it.mrp           ? parseFloat(it.mrp)        : null,
        lastBatchNo:   it.batchNo            || null,
        ...(shelfLifeDays ? { shelfLifeDays } : {}),
        orderCount:    { increment: 1 },
        lastOrderedAt: new Date(),
      };

      // Compound-unique lookups can't take `mode: 'insensitive'` directly on
      // a findUnique's composite-key object, so match case/whitespace-
      // insensitively via findFirst first, then build the exact compound
      // key from the found row's actual stored values for the update.
      const existing = await prisma.customerProductProfile.findFirst({
        where: {
          customerName: { equals: name, mode: "insensitive" },
          productName: { equals: pname, mode: "insensitive" },
        },
      });

      if (existing) {
        await prisma.customerProductProfile.update({
          where: {
            customerName_productName: {
              customerName: existing.customerName,
              productName: existing.productName,
            },
          },
          data: update,
        });
      } else {
        await prisma.customerProductProfile.create({
          data: {
            customerName:  name,
            productName:   pname,
            productCode:   it.inhouseProductCode || it.productCode || null,
            inhouseName:   it.inhouseProductName || null,
            activeSpecs:   it.activeSpecs        || null,
            carrier:       it.carrier            || null,
            sectionName:   it.sectionName        || null,
            unitQty:       it.unitQty       ? parseFloat(it.unitQty)  : null,
            unitUom:       it.unitUom            || null,
            unitPackType:  it.unitPackType       || null,
            primaryPack:   it.primaryPack  || it.unitPackType  || null,
            secondaryPack: it.secondaryPack || it.packingType  || null,
            unitsPerCS:    it.unitsPerCS    ? parseInt(it.unitsPerCS)  : null,
            totalUom:      it.totalUom           || "KG",
            labelType:     it.labelType          || null,
            mrp:           it.mrp           ? parseFloat(it.mrp)       : null,
            lastBatchNo:   it.batchNo            || null,
            shelfLifeDays,
            orderCount:    1,
          },
        });
      }
      saved++;
    }
    return res.json({ success: true, saved });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
};

export { seedCustomerProfiles, upsertManyCpProfiles };
