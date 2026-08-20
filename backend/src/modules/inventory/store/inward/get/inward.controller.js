import prisma from "../../../../../db.js";
import { generatePackBatch } from "../../../../../services/pack-generator.js";
import { generateLabelBuffer, generateBatchLabelBuffer } from "../../../../../services/label-service.js";
import { toCanonical } from "../../../../../utils/uom.js";
import { flattenPack, packDetailInclude } from "../../../../../services/pack-view.js";
import { getLotsInProgress, getLotProgress } from "../../../../../services/inward-service.js";
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js';

const getPendingInwardGroups = async (req, res) => {
  try {
    // Bags stay listed here through the whole pre-submit lifecycle — not
    // just AWAITING_INWARD. Once every bag in a lot has been scanned (moved
    // to SCANNED) but the lot hasn't been submitted yet, filtering on
    // AWAITING_INWARD alone would drop it from this list entirely, making
    // an in-progress-but-fully-scanned lot impossible to select and submit.
    const groups = await prisma.packDetail.groupBy({
      by: ["printMasterId"],
      where: { status: { in: ["AWAITING_INWARD", "SCANNED"] } },
      _count: { packId: true },
    });

    if (groups.length === 0) return res.json({ success: true, data: [] });

    const headers = await prisma.printMaster.findMany({
      where: { id: { in: groups.map((g) => g.printMasterId) } },
    });
    const headerById = new Map(headers.map((h) => [h.id, h]));

    return res.json({
      success: true,
      data: groups.map((g) => {
        const h = headerById.get(g.printMasterId);
        return { itemCode: h.itemCode, itemName: h.itemName, lotNo: h.lotNo, bagCount: g._count.packId };
      }),
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

const getNextLotNumber = async (req, res) => {

  const { itemCode } = req.params;
  try {
    const year = new Date().getFullYear();
    const existing = await prisma.lotSequence.findUnique({
      where: { itemCode_year: { itemCode: itemCode, year } },
    });
    const nextSeq = (existing?.seq || 0) + 1;
    return res.json({ success: true, data: { lotNo: `${year}-${String(nextSeq).padStart(3, "0")}` } });
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

const listPacks = async (req, res) => {
  const { itemCode, lotNo, status, page = 1, limit = 50 } = req.query;

  try {
    const where = {};
    if (itemCode) where.itemCode = itemCode;
    if (status) where.status = status;
    if (lotNo) where.printMaster = { lotNo };

    // `limit=all` bypasses paging entirely — pages like Print Master's Pack
    // Records list need every group (pending ones can't be dropped just
    // because they're older than the newest 500 bag rows), and do their own
    // client-side pagination over the grouped result.
    const noLimit = limit === "all";

    const [total, bags] = await Promise.all([
      prisma.packDetail.count({ where }),
      prisma.packDetail.findMany({
        where, include: packDetailInclude,
        orderBy: { printMaster: { createdAt: "desc" } },
        ...(noLimit ? {} : { skip: (page - 1) * limit, take: parseInt(limit) }),
      }),
    ]);

    return res.json({ success: true, data: bags.map(flattenPack), total, page: parseInt(page), limit: noLimit ? total : parseInt(limit) });

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

const getPackById = async (req, res) => {
  const { packId } = req.params;
  try {
    const pack = await prisma.packDetail.findUnique({
      where: { packId: decodeURIComponent(packId) }, include: packDetailInclude,
    });
    if (!pack)
      return res.status(404).json({ success: false, error: "Pack not found", code: 'NOT_FOUND' });

    return res.json({ success: true, data: flattenPack(pack) });

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

const getPackLabel = async (req, res) => {
  const { packId } = req.params;
  try {

    const pack = await prisma.packDetail.findUnique({
      where: { packId: decodeURIComponent(packId) }, include: packDetailInclude,
    });
    if (!pack)
       return res.status(404).json({ success: false, error: "Pack not found", code: 'NOT_FOUND' });

    const flat = flattenPack(pack);
    const buf = await generateLabelBuffer(flat);
    const safeName = (flat.itemName || flat.itemCode).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `${safeName}-${flat.itemCode}-${flat.lotNo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buf);

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

const getBatchLabels = async (req, res) => {
  const { itemCode, lotNo } = req.params;
  try {
    const bags = await prisma.packDetail.findMany({
      where: { itemCode: decodeURIComponent(itemCode), printMaster: { lotNo: decodeURIComponent(lotNo) } },
      include: packDetailInclude,
      orderBy: { bagNo: "asc" },
    });

    if (!bags.length)
      return res.status(404).json({ success: false, error: "No packs found", code: 'NOT_FOUND' });

    const flatPacks = bags.map(flattenPack);
    const buf = await generateBatchLabelBuffer(flatPacks);
    const sample = flatPacks[0];
    const safeName = (sample.itemName || sample.itemCode).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `labels-${safeName}-${sample.itemCode}-${sample.lotNo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buf);

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

// Same as getBatchLabels but spans multiple (itemCode, lotNo) lots merged
// into one PDF — used by Print Master's post-generation dialog when a single
// submission produced several items/lots at once. `pairs` is a JSON-encoded
// array of { itemCode, lotNo }. This route requires auth like the rest of
// the app; the frontend fetches it with the Bearer token and opens the
// resulting blob (see frontend/src/utils/authedFile.js) since a plain
// window.open/<a href> can't carry an Authorization header.
const getBatchLabelsMulti = async (req, res) => {
  const { pairs, download } = req.query;
  try {
    let groups;
    try { groups = JSON.parse(pairs); } catch { groups = null; }
    if (!Array.isArray(groups) || groups.length === 0)
      return res.status(400).json({ success: false, error: "pairs must be a JSON array of {itemCode, lotNo}", code: 'VALIDATION_ERROR' });

    const bags = await prisma.packDetail.findMany({
      where: {
        OR: groups.map((g) => ({
          itemCode: String(g.itemCode),
          printMaster: { lotNo: String(g.lotNo) },
        })),
      },
      include: packDetailInclude,
      orderBy: [{ printMaster: { createdAt: "asc" } }, { bagNo: "asc" }],
    });

    if (!bags.length)
      return res.status(404).json({ success: false, error: "No packs found", code: 'NOT_FOUND' });

    const flatPacks = bags.map(flattenPack);
    const buf = await generateBatchLabelBuffer(flatPacks);
    const filename = `qr-labels-${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${filename}"`);
    return res.send(buf);

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

const generatePacks = async (req, res) => {
  // `batches` — one or more { numberOfBags, packQty, customerBatchCode?,
  // expiryDate? } groups, so different bag ranges within the same lot can
  // carry different supplier batch codes / expiry dates / qty per bag — a
  // single invoice line/lot can arrive packed at different bag sizes across
  // its supplier batches (e.g. bags 1-10 at 25kg/bag, bags 11-18 at
  // 20kg/bag). `uom` stays lot-level (the entry unit the qty was typed in);
  // each batch group's own packQty is canonicalized individually since bag
  // sizes can differ within the same lot.
  const { gateInwardId, itemCode, itemName, batches, uom } = req.body;
  try {
    if (!itemCode || !itemName || !uom)
      return res.status(400).json({ success: false, error: "itemCode, itemName, uom are required", code: 'VALIDATION_ERROR' });

    if (!Array.isArray(batches) || batches.length === 0)
      return res.status(400).json({ success: false, error: "At least one batch group with numberOfBags is required", code: 'VALIDATION_ERROR' });

    const parsedBatches = [];
    let canonicalUom;
    for (const b of batches) {
      const n = parseInt(b.numberOfBags);
      if (!n || n < 1)
        return res.status(400).json({ success: false, error: "Each batch group needs a valid number of bags", code: 'VALIDATION_ERROR' });
      if (!b.packQty || parseFloat(b.packQty) <= 0)
        return res.status(400).json({ success: false, error: "Each batch group needs a valid qty per bag", code: 'VALIDATION_ERROR' });

      let canonical;
      try {
        canonical = toCanonical(parseFloat(b.packQty), uom);
      } catch (e) {
        return res.status(400).json({ success: false, error: toSafeErrorMessage(e), code: 'VALIDATION_ERROR' });
      }
      canonicalUom = canonical.uom;
      parsedBatches.push({
        numberOfBags: n, packQty: canonical.qty,
        customerBatchCode: b.customerBatchCode || null, expiryDate: b.expiryDate || null,
      });
    }

    // Every pack must be linked to the Gate Inward entry it physically
    // arrived on — supplier/invoice/received-date are read through this FK
    // rather than being typed in again here.
    if (!gateInwardId)
      return res.status(400).json({ success: false, error: "gateInwardId is required", code: 'VALIDATION_ERROR' });

    const gateInward = await prisma.gateInward.findUnique({ where: { inwardId: gateInwardId } });
    if (!gateInward)
      return res.status(404).json({ success: false, error: "Gate Inward entry not found", code: 'NOT_FOUND' });

    const result = await generatePackBatch({
      gateInwardId, itemCode, itemName, batches: parsedBatches, uom: canonicalUom,
    });
    return res.status(201).json({ success: true, data: result });

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
  }
}

const listInward = async (req, res) => {
  const { itemCode, page = 1, limit = 50 } = req.query

  try {

    const where = { status: 'INWARDED', ...(itemCode !== undefined ? { itemCode } : {}) }
    const [total, records] = await Promise.all([
      prisma.packDetail.count({ where }),
      prisma.packDetail.findMany({ where, include: packDetailInclude, orderBy: { inwardedAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) })
    ])

    return res.json({ success: true, data: records.map(flattenPack), total })

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

const listActiveSessions = async (req, res) => {
  try {
    const lots = await getLotsInProgress()
    return res.json({ success: true, data: lots })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

const getSession = async (req, res) => {
  const { itemCode, lotNo } = req.params
  try {
    const progress = await getLotProgress(itemCode, lotNo)
    return res.json({ success: true, data: { ...progress, bags: progress.bags.map(flattenPack) } })
  } catch (e) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(e), code: 'VALIDATION_ERROR' })
  }
}

export {
  getPendingInwardGroups,
  getNextLotNumber,
  listPacks,
  getPackById,
  getPackLabel,
  getBatchLabels,
  getBatchLabelsMulti,
  generatePacks,
  listInward,
  listActiveSessions,
  getSession
}
