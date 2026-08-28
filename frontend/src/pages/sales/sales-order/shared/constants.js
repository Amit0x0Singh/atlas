// ─────────────────────────────────────────────────────────────────────────────
// shared/constants.js
// Single source of truth for every constant in the Sales Order module.
// Import only what each component needs.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = "#22a037";
export const BRAND_LIGHT = "#f0fdf4";

// ── Companies & order config ──────────────────────────────────────────────────
// Company is now admin-managed — see the COMPANY option group (Settings >
// Select Options) and useOptionValues('COMPANY'), not a hardcoded list here.
export const ORDER_TYPES = ["DOMESTIC", "EXPORT", "ECOM", "SAMPLE"];
export const PRIORITIES = ["MODERATE", "URGENT", "VERY_URGENT"];
export const STATUSES = [
  "PENDING",
  "PLANNED",
  "UNDER_PRODUCTION",
  "IN_INVENTORY",
  "DISPATCHED",
];
export const SECTIONS = ["NANO", "BOTANICAL", "LIQUID", "POWDER", "GRANULES"];

export const UOMS = ["KG", "LTR", "GM", "ML", "Number"];

// ── Dropdown options ──────────────────────────────────────────────────────────
// Carrier suggestions are admin-managed — see the CARRIER option group
// (Settings > Select Options) and useOptionValues(), not a hardcoded list.
// Primary/Secondary Pack suggestions come from the Packing Item master
// (Settings > Packing Items) — see usePackingItems('PRIMARY' | 'SECONDARY')
// in line-item-row/components/PackingSection.jsx.

// Label Type options are now admin-managed — see the LABEL_TYPE option group
// (Settings > Select Options) and useOptionValues('LABEL_TYPE').

// Only these label types require batch / date / MRP fields — keyed to the
// same codes seeded in the LABEL_TYPE option group (CUSTOMER/COMPUTER/
// RETAIL/PACKING_SLIP); this stays hardcoded since it drives conditional
// form logic, not just display vocabulary.
export const LABEL_NEEDS_DETAILS = new Set(["CUSTOMER", "COMPUTER", "RETAIL"]);

// ── Style maps ────────────────────────────────────────────────────────────────
export const PRIORITY_STYLE = {
  MODERATE: "bg-gray-100 text-gray-600",
  URGENT: "bg-orange-100 text-orange-700",
  VERY_URGENT: "bg-red-100 text-red-700",
};

export const STATUS_STYLE = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PLANNED: "bg-blue-100 text-blue-700",
  UNDER_PRODUCTION: "bg-indigo-100 text-indigo-700",
  IN_INVENTORY: "bg-teal-100 text-teal-700",
  DISPATCHED: "bg-gray-100 text-gray-500",
};

export const STATUS_LABELS = {
  PENDING: "Pending",
  PLANNED: "Planned",
  UNDER_PRODUCTION: "Under Production",
  IN_INVENTORY: "Inventory",
  DISPATCHED: "Dispatch",
};

// ── Blank line item — default shape for a new product line ───────────────────
export const BLANK_ITEM = {
  customerProductName: "",
  inhouseProductName: "",
  inhouseProductCode: "",
  activeIngredient: "",
  activeSpecs: "",
  carrier: "",
  sectionName: "",
  totalQty: "",
  totalUom: "KG",
  unitQty: "",
  unitUom: "KG",
  unitsPerCS: "",
  totalCS: "",
  unitPackType: "",
  packingType: "",
  labelType: "",
  batchNo: "",
  mfgDate: "",
  expDate: "",
  mrp: "",
};
