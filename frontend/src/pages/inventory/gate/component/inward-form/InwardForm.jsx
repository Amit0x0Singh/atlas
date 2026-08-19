import { useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "../../../../../components/ui";
import { Can } from "../../../../../components/common/Can.jsx";
import { COMPANIES } from "../../data/companies.js";
import { useSupplierSuggestions } from "../../../../../hooks/masters/useSuppliers.js";
import SupplierAutocomplete from "./SupplierAutocomplete.jsx";
import InvoiceDocumentField from "./InvoiceDocumentField.jsx";
import "./InwardForm.css";

const EMPTY = { supplier_name: "", invoice_no: "", vehicle_no: "", company: "", invoice_document: null };

// Supplier Name gets its own autocomplete widget, Invoice Document its own
// camera-first widget (below) — neither fits the generic select/input
// rendering. The four business fields are required — mirrors OutwardForm so
// both gate forms enforce the same completeness rules. Invoice Document is
// optional — not every supplier hands over a digital copy on the spot.
const FIELDS = [
  { key: "company", label: "Company", type: "select", options: COMPANIES, placeholder: "Select company", required: true },
  { key: "supplier_name", label: "Supplier Name", type: "supplier", placeholder: "Type to search supplier...", required: true },
  { key: "invoice_no", label: "Invoice No.", placeholder: "e.g. INV-2024-001", uppercase: true, required: true },
  { key: "vehicle_no", label: "Vehicle No.", placeholder: "e.g. MH-12-AB-1234", uppercase: true, required: true },
  { key: "invoice_document", label: "Invoice Document", type: "file", accept: ".pdf,.jpg,.jpeg,.png", required: false },
];

// `embedded` drops this component's own card border/shadow/margin — used
// when it's rendered inside the Edit modal, whose panel already draws that
// chrome; keeping both caused the two borders to visibly clash at the edges.
export default function InwardForm({ onSubmit, onCancel, mode = "create", initialValues = null, existingDocument = null, onViewDocument = null, embedded = false }) {
  const [form, setForm] = useState(initialValues ? { ...EMPTY, ...initialValues } : EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const { data: suppliersResult } = useSupplierSuggestions();
  const suppliers = suppliersResult?.items ?? [];

  // Both are business codes the backend always stores uppercase — matching
  // it live avoids the "typed lowercase, saved uppercase" surprise.
  const set = (key, uppercase) => (e) => {
    setForm((f) => ({ ...f, [key]: uppercase ? e.target.value.toUpperCase() : e.target.value }));
    setFieldErrors((fe) => (fe[key] ? { ...fe, [key]: undefined } : fe));
  };

  const setSupplier = (v) => {
    setForm((f) => ({ ...f, supplier_name: v }));
    setFieldErrors((fe) => (fe.supplier_name ? { ...fe, supplier_name: undefined } : fe));
  };

  const validate = () => {
    const errors = {};
    for (const { key, label, required } of FIELDS) {
      if (required && !String(form[key] || "").trim()) errors[key] = `${label} is required`;
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    await onSubmit(form);
    if (mode !== "edit") {
      setForm(EMPTY);
      setFieldErrors({});
    }
  };

  return (
    <div className={`if-wrap${embedded ? " if-wrap--embedded" : ""}`}>
      <div className="if-header">
        <ArrowDown size={18} className="if-header-icon" />
        <h3 className="if-title">{mode === "edit" ? "Edit Gate Inward" : "New Gate Inward"}</h3>
      </div>

      <div className="if-grid">
        {FIELDS.map(({ key, label, placeholder, type, options, uppercase, required, accept }) => (
          <div key={key} className={type === "file" ? "if-span-full" : undefined}>
            <label className="if-label">{label}{required && " *"}</label>
            {type === "select" ? (
              <select
                value={form[key]}
                onChange={set(key)}
                className={`if-input${fieldErrors[key] ? " if-input--error" : ""}`}
              >
                <option value="">{placeholder}</option>
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : type === "supplier" ? (
              <SupplierAutocomplete
                value={form[key]}
                suppliers={suppliers}
                onChange={setSupplier}
                placeholder={placeholder}
                hasError={!!fieldErrors[key]}
              />
            ) : type === "file" ? (
              <InvoiceDocumentField
                value={form[key]}
                onChange={(file) => setForm((f) => ({ ...f, [key]: file }))}
                accept={accept}
                existingDocument={existingDocument}
                onViewDocument={onViewDocument}
              />
            ) : (
              <input
                value={form[key]}
                onChange={set(key, uppercase)}
                placeholder={placeholder}
                className={`if-input${fieldErrors[key] ? " if-input--error" : ""}`}
                required
              />
            )}
            {fieldErrors[key] && <p className="if-field-error">{fieldErrors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="if-actions">
        <Can permission={mode === "edit" ? "gate.inward.update" : "gate.inward.create"}>
          <Button variant="primary" onClick={handleSubmit}>
            {mode === "edit" ? "Save Changes" : "Create Inward Entry"}
          </Button>
        </Can>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
