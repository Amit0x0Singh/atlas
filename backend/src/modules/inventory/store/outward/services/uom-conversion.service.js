import prisma from '../../../../../db.js'
import { convertByDensity } from '../../../../../utils/uom.js'

// Resolves how much to actually deduct from inventory when a store person
// issues `enteredQty` of `rmCode` to production. The operator always enters
// the qty in the item's Operational UOM (falls back to Inventory UOM when
// unset — same unit, no conversion) — this is the server-side authority for
// that conversion, never trusting a client-computed figure. Throws a plain
// Error (caller wraps as VALIDATION_ERROR) when conversion is needed but the
// item isn't configured for it.
export async function resolveIssueQty(rmCode, enteredQty) {
  const rm = await prisma.rmMaster.findUnique({ where: { itemCode: rmCode } })
  if (!rm) throw new Error(`RM item ${rmCode} not found`)

  const operationalUom = rm.operationalUom || rm.inventoryUom
  if (operationalUom !== rm.inventoryUom && !rm.conversionRequired)
    throw new Error(`Item ${rmCode} has different Inventory/Operational UOM but is not flagged Conversion Required`)

  const { qty: inventoryQty } = convertByDensity(enteredQty, operationalUom, rm.inventoryUom, rm.density)
  return { rm, inventoryQty, operationalQty: Number(enteredQty), operationalUom }
}

// Inverse — for a fully-automatic deduction (no operator-entered qty, e.g.
// bomScan's auto-issue), converts the inventory-uom qty that was actually
// deducted back into Operational UOM, purely for the Outward record's
// display fields.
export function toOperationalDisplay(rm, inventoryQty) {
  const operationalUom = rm.operationalUom || rm.inventoryUom
  const { qty: operationalQty } = convertByDensity(inventoryQty, rm.inventoryUom, operationalUom, rm.density)
  return { operationalQty, operationalUom }
}
