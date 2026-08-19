import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "../../../../../components/ui";
import { Can } from "../../../../../components/common/Can.jsx";
import { COMPANIES } from "../../data/companies.js";
import "./OutwardForm.css";

const EMPTY = { receiver_name: "", invoice_no: "", vehicle_no: "", company: "" };

// All four fields are required — mirrors InwardForm so both gate forms
// enforce the same completeness rules.
const FIELDS = [
  { key: "company",       label: "Company",       type: "select", options: COMPANIES, placeholder: "Select company", required: true },
  { key: "receiver_name", label: "Receiver Name", placeholder: "Person receiving goods", required: true },
  { key: "invoice_no",    label: "Invoice No.",   placeholder: "e.g. INV-2024-001", uppercase: true, required: true },
  { key: "vehicle_no",    label: "Vehicle No.",   placeholder: "e.g. MH-12-AB-1234", uppercase: true, required: true },
];

export default function OutwardForm({ onSubmit, onCancel, mode = "create", initialValues = null, embedded = false }) {
  const [form, setForm] = useState(initialValues ? { ...EMPTY, ...initialValues } : EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});

  // Both are business codes the backend always stores uppercase — matching
  // it live avoids the "typed lowercase, saved uppercase" surprise.
  const set = (key, uppercase) => (e) => {
    setForm((f) => ({ ...f, [key]: uppercase ? e.target.value.toUpperCase() : e.target.value }));
    setFieldErrors((fe) => (fe[key] ? { ...fe, [key]: undefined } : fe));
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
    <div className={`of-wrap${embedded ? " of-wrap--embedded" : ""}`}>
      <div className="of-header">
        <ArrowUp size={18} className="of-header-icon" />
        <h3 className="of-title">{mode === "edit" ? "Edit Gate Outward" : "New Gate Outward"}</h3>
      </div>

      <div className="of-grid">
        {FIELDS.map(({ key, label, placeholder, type, options, uppercase, required }) => (
          <div key={key}>
            <label className="of-label">{label}{required && " *"}</label>
            {type === "select" ? (
              <select
                value={form[key]}
                onChange={set(key)}
                className={`of-input${fieldErrors[key] ? " of-input--error" : ""}`}
              >
                <option value="">{placeholder}</option>
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                value={form[key]}
                onChange={set(key, uppercase)}
                placeholder={placeholder}
                className={`of-input${fieldErrors[key] ? " of-input--error" : ""}`}
              />
            )}
            {fieldErrors[key] && <p className="of-field-error">{fieldErrors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="of-actions">
        <Can permission={mode === "edit" ? "gate.outward.update" : "gate.outward.create"}>
          <Button variant="warning" onClick={handleSubmit}>
            {mode === "edit" ? "Save Changes" : "Record Outward"}
          </Button>
        </Can>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
