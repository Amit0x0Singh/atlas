import { useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "../../../../../components/ui";
import { COMPANIES } from "../../data/companies.js";
import { useSuppliers } from "../../../../../hooks/masters/useSuppliers.js";
import "./InwardForm.css";

const EMPTY = { supplier_name: "", invoice_no: "", vehicle_no: "", company: "" };

export default function InwardForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const { data: suppliers = [] } = useSuppliers();
  const supplierNames = suppliers.map((s) => s.supplierName);

  // Supplier Name is a strict select — only names from Supplier Master, no
  // free typing — so add new suppliers there first if one is missing.
  const FIELDS = [
    { key: "company", label: "Company *", type: "select", options: COMPANIES, placeholder: "Select company" },
    { key: "supplier_name", label: "Supplier Name *", type: "select", options: supplierNames, placeholder: "Select supplier" },
    { key: "invoice_no", label: "Invoice No.", placeholder: "e.g. INV-2024-001" },
    { key: "vehicle_no", label: "Vehicle No.", placeholder: "e.g. MH-12-AB-1234" },
  ];

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.supplier_name.trim()) return alert("Supplier name is required");
    if (!form.company) return alert("Company is required");
    await onSubmit(form);
    setForm(EMPTY);
  };

  return (
    <div className="if-wrap">
      <div className="if-header">
        <ArrowDown size={18} className="if-header-icon" />
        <h3 className="if-title">New Gate Inward</h3>
      </div>

      <div className="if-grid">
        {FIELDS.map(({ key, label, placeholder, type, options }) => (
          <div key={key}>
            <label className="if-label">{label}</label>
            {type === "select" ? (
              <select value={form[key]} onChange={set(key)} className="if-input">
                <option value="">{placeholder}</option>
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="if-input"
              />
            )}
          </div>
        ))}
      </div>

      <div className="if-actions">
        <Button variant="primary" onClick={handleSubmit}>
          Create Inward Entry
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
