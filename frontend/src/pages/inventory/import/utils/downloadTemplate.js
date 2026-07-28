import * as XLSX from 'xlsx'

// Column headers here must match what backend/src/modules/inventory/import/create/import.controller.js
// actually reads for each sheet (see the FormatGuide component for the same
// source of truth) — keep the two in sync if the importer's accepted columns
// ever change. Sheet tab names also need to satisfy each sheet's detection
// pattern so a template filled in and re-uploaded is recognized automatically.
// Note: Excel forbids "/" in sheet tab names, hence "Recipe BOM" not "Recipe / BOM".
const TEMPLATE_SHEETS = [
  { name: 'Supplier Master',  columns: ['Supplier Name', 'GSTIN', 'Phone', 'Email', 'Address'] },
  { name: 'Microbe Master',   columns: ['Microbe Name', 'UOM'] },
  { name: 'Product Master',   columns: ['Product Name', 'Plant Name'] },
  { name: 'Equipment Master', columns: ['Equipment Name', 'Working Volume', 'Operation', 'Plant'] },
  { name: 'RM Master',        columns: ['Item Name', 'Item Code', 'Category', 'Sub-Category', 'Inventory UOM', 'Operational UOM', 'Conversion Required', 'Conversion Factor'] },
  { name: 'Recipe BOM',       columns: ['Plant', 'Product UOM', 'Product Name', 'Recipe Items', 'Qty (Per Kg of Product)', 'Recipe UOM', 'Microbe', 'CFU/g'] },
]

export function downloadImportTemplate() {
  const wb = XLSX.utils.book_new()
  for (const sheet of TEMPLATE_SHEETS) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.columns])
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  XLSX.writeFile(wb, 'SOM-ERP-Import-Template.xlsx')
}
