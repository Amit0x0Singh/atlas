import prisma from '../../../../../db.js'
import {
  conversionActive,
  convertOperationToInventory,
  convertInventoryToOperation,
} from '../../../../../utils/uom.js'

// Resolves how much to actually deduct from inventory when a store person
// issues `enteredQty` of `rmCode` to production. The operator always enters
// the qty in the item's Operational UOM (falls back to Inventory UOM when
// unset — same unit, no conversion) — this is the server-side authority for
// that conversion, never trusting a client-computed figure. Throws a plain
// Error (caller wraps as VALIDATION_ERROR) when conversion is needed but the
// item isn't configured for it (differing UOMs with no Conversion Required
// flag, or a missing/invalid Conversion Factor).
export async function resolveIssueQty(rmCode, enteredQty) {
  const rm = await prisma.rmMaster.findUnique({ where: { itemCode: rmCode } })
  if (!rm) throw new Error(`RM item ${rmCode} not found`)

  const operationalUom = rm.operationalUom || rm.inventoryUom
  if (operationalUom !== rm.inventoryUom && !rm.conversionRequired)
    throw new Error(`Item ${rmCode} has different Inventory/Operational UOM but is not flagged Conversion Required`)

  // operation → inventory : × conversionFactor (validated > 0 by the helper).
  const inventoryQty = convertOperationToInventory(enteredQty, rm)
  return { rm, inventoryQty, operationalQty: Number(enteredQty), operationalUom }
}

// Inverse — for a fully-automatic deduction (no operator-entered qty, e.g.
// bomScan's auto-issue), converts the inventory-uom qty that was actually
// deducted back into Operational UOM, purely for the Outward record's
// display fields.
export function toOperationalDisplay(rm, inventoryQty) {
  const operationalUom = rm.operationalUom || rm.inventoryUom
  // inventory → operation : ÷ conversionFactor.
  const operationalQty = convertInventoryToOperation(inventoryQty, rm)
  return { operationalQty, operationalUom }
}

// Re-export so callers that only need the predicate don't reach into utils.
export { conversionActive }
