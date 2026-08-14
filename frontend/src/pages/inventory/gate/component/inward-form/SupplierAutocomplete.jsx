import { useEffect, useRef, useState } from "react";

import { toTitleCase } from '../../../../../utils/textDisplay.js'
// Type-to-search supplier field: suggestions filter from Supplier Master as
// you type, but the committed value (what onChange reports to the parent
// form) only ever becomes a real supplier name — either by clicking a
// suggestion, or by typing one out exactly. Typing something that matches
// no supplier leaves the committed value empty, even though the input still
// shows whatever text was typed.
export default function SupplierAutocomplete({ value, suppliers, onChange, placeholder, hasError }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const lastCommitted = useRef(value || "");

  // Re-sync from the parent only when it changed for a reason other than our
  // own onChange call (e.g. the form was reset after a successful submit) —
  // otherwise committing "" while the user is mid-typing a non-match would
  // wipe out what they just typed.
  useEffect(() => {
    if ((value || "") !== lastCommitted.current) {
      setQuery(value || "");
      lastCommitted.current = value || "";
    }
  }, [value]);

  const commit = (v) => {
    lastCommitted.current = v;
    onChange(v);
  };

  const matches = query.trim()
    ? suppliers.filter((s) => s.supplierName.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const handleChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    setOpen(true);
    const exact = suppliers.find((s) => s.supplierName.toLowerCase() === text.trim().toLowerCase());
    commit(exact ? exact.supplierName : "");
  };

  const pick = (name) => {
    setQuery(name);
    commit(name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`if-input${hasError ? " if-input--error" : ""}`}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {matches.map((s) => (
            <button
              key={s.supplierId}
              type="button"
              onMouseDown={() => pick(s.supplierName)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
            >
              {toTitleCase(s.supplierName)}
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && matches.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs text-gray-400">
          No matching supplier — add it in Supplier Master first
        </div>
      )}
    </div>
  );
}
