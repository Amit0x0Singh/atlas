import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "../../../../../components/ui";
import { COMPANIES } from "../../data/companies.js";
import "./OutwardForm.css";

const EMPTY = { receiver_name: "", invoice_no: "", vehicle_no: "", company: "" };

const FIELDS = [
  { key: "company", label: "Company *", type: "select", options: COMPANIES, placeholder: "Select company" },
  { key: "receiver_name", label: "Receiver Name", placeholder: "Person receiving goods" },
  { key: "invoice_no",    label: "Invoice No.",   placeholder: "e.g. INV-2024-001", uppercase: true },
  { key: "vehicle_no",    label: "Vehicle No.",   placeholder: "e.g. MH-12-AB-1234", uppercase: true },
];

export default function OutwardForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);

  // Both are business codes the backend always stores uppercase — matching
  // it live avoids the "typed lowercase, saved uppercase" surprise.
  const set = (key, uppercase) => (e) =>
    setForm((f) => ({ ...f, [key]: uppercase ? e.target.value.toUpperCase() : e.target.value }));

  const handleSubmit = async () => {
    if (!form.company) return alert("Company is required");
    await onSubmit(form);
    setForm(EMPTY);
  };

  return (
    <div className="of-wrap">
      <div className="of-header">
        <ArrowUp size={18} className="of-header-icon" />
        <h3 className="of-title">New Gate Outward</h3>
      </div>

      <div className="of-grid">
        {FIELDS.map(({ key, label, placeholder, type, options, uppercase }) => (
          <div key={key}>
            <label className="of-label">{label}</label>
            {type === "select" ? (
              <select value={form[key]} onChange={set(key)} className="of-input">
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
                className="of-input"
              />
            )}
          </div>
        ))}
      </div>

      <div className="of-actions">
        <Button variant="warning" onClick={handleSubmit}>
          Record Outward
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
