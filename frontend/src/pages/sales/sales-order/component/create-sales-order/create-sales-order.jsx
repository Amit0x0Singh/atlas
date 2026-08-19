import { useState, useEffect } from "react";
import { cpProfileApi } from "../../../../../api/sales.js";
import { BLANK_ITEM, UOMS } from "../../shared/constants.js";
import { suggestNextBatch, addDays, calcTotalCS } from "../../shared/utils.js";
import { toTitleCase } from "../../../../../utils/textDisplay.js";

// totalUom/unitUom are stored lowercase (RULES.LOWER) but the UOMS <select>
// options are a fixed mixed-case list (KG/LTR/GM/ML/Number, not uniformly
// uppercase) — match case-insensitively to find the canonical option form
// instead of assuming a blind .toUpperCase() would match ("number" -> "Number").
const matchUom = (raw) => UOMS.find((u) => u.toLowerCase() === (raw || "").toLowerCase()) || raw || "KG";
import OrderHeaderFields from "./components/OrderHeaderFields.jsx";
import LineItemRow from "../line-item-row/LineItemRow.jsx";
import { Button } from "../../../../../components/ui";
import { Can } from "../../../../../components/common/Can.jsx";
import { Plus, Save } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CreateSalesOrder
// The booking form used by the sales team to create or edit a sales order.
// Responsibilities:
//   - Order header state (DI No., customer, company, dates…)
//   - Dynamic product lines (add / edit / remove)
//   - Customer-product memory: loads cpProfiles per customer, auto-fills lines
//   - Validation and submission
//
// Props:
//   initial  {object|undefined}  pre-filled data when editing an existing order
//   products {array}             product master list
//   profiles {array}             customer profiles (for CustomerNamePicker)
//   onSave   {fn}                async (formData) => void
//   onCancel {fn}                () => void
// ─────────────────────────────────────────────────────────────────────────────
export default function CreateSalesOrder({
  initial,
  products,
  profiles,
  onSave,
  onCancel,
}) {
  const today = new Date().toISOString().split("T")[0];

  const [hdr, setHdr] = useState({
    // Just a sensible default for a brand-new order — the actual selectable
    // list comes from the COMPANY option group via OrderHeaderFields.jsx.
    company: "som",
    diNo: "",
    customerName: "",
    orderType: "DOMESTIC",
    salesStaff: "",
    orderReceivedDate: today,
    remarks: "",
    ...initial,
    ...(initial && {
      customerName: toTitleCase(initial.customerName),
      // company is a small code/abbreviation list (SOM/DVS/AL-IPL/…), not a
      // display name — lowercased to match the <select>'s lowercase option
      // values (see OrderHeaderFields.jsx), not Title-Cased.
      company: (initial.company || "").toLowerCase(),
      transportName: toTitleCase(initial.transportName),
    }),
  });

  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map((it) => ({
          ...BLANK_ITEM,
          ...it,
          customerProductName: toTitleCase(it.customerProductName),
          inhouseProductName: toTitleCase(it.inhouseProductName),
          carrier: toTitleCase(it.carrier),
          totalUom: matchUom(it.totalUom),
          unitUom: matchUom(it.unitUom),
          mfgDate: it.mfgDate
            ? new Date(it.mfgDate).toISOString().split("T")[0]
            : "",
          expDate: it.expDate
            ? new Date(it.expDate).toISOString().split("T")[0]
            : "",
        }))
      : [{ ...BLANK_ITEM }],
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [cpProfiles, setCpProfiles] = useState([]);

  const setH = (k, v) => setHdr((h) => ({ ...h, [k]: v }));

  // ── Load customer-product profiles whenever the customer name changes ───────
  useEffect(() => {
    if (!hdr.customerName?.trim()) {
      setCpProfiles([]);
      return;
    }
    cpProfileApi
      .forCustomer(hdr.customerName.trim())
      .then((res) => setCpProfiles(res.data || []))
      .catch(() => setCpProfiles([]));
  }, [hdr.customerName]);

  // ── Memory apply — shared by both picker paths ────────────────────────────
  function applyMemoryProfile(idx, mem) {
    if (!mem) return;
    const suggested = mem.lastBatchNo ? suggestNextBatch(mem.lastBatchNo) : "";
    setItems((its) =>
      its.map((it, i) => {
        if (i !== idx) return it;
        const newUnitQty = mem.unitQty ? String(mem.unitQty) : it.unitQty;
        const newUnitUom = mem.unitUom ? matchUom(mem.unitUom) : it.unitUom;
        const newUnitsPerCS = mem.unitsPerCS
          ? String(mem.unitsPerCS)
          : it.unitsPerCS;
        const newTotalCS = calcTotalCS(it.totalQty, newUnitQty, newUnitsPerCS);
        const mfgDate = it.mfgDate || today;
        return {
          ...it,
          activeSpecs: mem.activeSpecs || it.activeSpecs,
          carrier: mem.carrier ? toTitleCase(mem.carrier) : it.carrier,
          sectionName: mem.sectionName || it.sectionName,
          unitQty: newUnitQty,
          unitUom: newUnitUom,
          unitPackType: mem.primaryPack || it.unitPackType,
          packingType: mem.secondaryPack || it.packingType,
          unitsPerCS: newUnitsPerCS,
          totalCS: newTotalCS || it.totalCS,
          totalUom: mem.totalUom ? matchUom(mem.totalUom) : it.totalUom,
          labelType: mem.labelType || it.labelType,
          mrp: mem.mrp ? String(mem.mrp) : it.mrp,
          batchNo: suggested || it.batchNo,
          mfgDate,
          expDate: mem.shelfLifeDays
            ? addDays(mfgDate, mem.shelfLifeDays)
            : it.expDate,
          _shelfLifeDays: mem.shelfLifeDays || null,
          _memApplied: true,
        };
      }),
    );
  }

  // Called when user picks from InhouseProductPicker (resolves to productCode)
  function applyProductMemory(idx, productCode) {
    const mem =
      cpProfiles.find((p) => p.productCode === productCode) ||
      cpProfiles.find((p) => p.inhouseName === productCode);
    applyMemoryProfile(idx, mem);
  }

  // Called when user picks from CustomerProductPicker (full profile object)
  function applyCpProductMemory(idx, profile) {
    applyMemoryProfile(idx, profile);
    if (profile.inhouseName || profile.productCode) {
      setItems((its) =>
        its.map((it, i) =>
          i !== idx
            ? it
            : {
                ...it,
                inhouseProductName:
                  profile.inhouseName || it.inhouseProductName,
                inhouseProductCode:
                  profile.productCode || it.inhouseProductCode,
              },
        ),
      );
    }
  }

  // ── Validation + submit ───────────────────────────────────────────────────
  async function submit(e) {
    e.preventDefault();
    if (!hdr.diNo.trim()) return setErr("DI No. is required");
    if (!hdr.customerName.trim()) return setErr("Customer Name is required");
    if (items.some((it) => !it.customerProductName || !it.totalQty))
      return setErr("Each line needs a Customer Product Name and Quantity");
    setSaving(true);
    setErr("");
    try {
      await onSave({ ...hdr, items });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {err && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
          {err}
        </div>
      )}

      {/* ── Order header ───────────────────────────────────────────────── */}
      <OrderHeaderFields hdr={hdr} setH={setH} profiles={profiles} />

      {/* ── Product lines ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Product Lines
          </h3>
          <Button
            type="button"
            variant="outline"
            size="xs"
            icon={Plus}
            onClick={() => setItems((it) => [...it, { ...BLANK_ITEM }])}
          >
            Add Line
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <LineItemRow
              key={idx}
              item={item}
              idx={idx}
              products={products}
              cpProfiles={cpProfiles}
              onChange={(i, u) =>
                setItems((it) => it.map((x, j) => (j === i ? u : x)))
              }
              onRemove={(i) => setItems((it) => it.filter((_, j) => j !== i))}
              onProductPicked={applyProductMemory}
              onCpProductPicked={applyCpProductMemory}
            />
          ))}
        </div>
      </div>

      {/* ── Submit / Cancel ───────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Can anyOf={['sales.order.create', 'sales.order.update']}>
          <Button
            type="submit"
            variant="success"
            icon={Save}
            fullWidth
            loading={saving}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : initial?.id
                ? "Update Order"
                : "Create Sales Order"}
          </Button>
        </Can>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
