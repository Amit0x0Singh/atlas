import { useState } from "react";
import { Button } from "../../../../../components/ui";
import "./StoreConfirmForm.css";

export default function StoreConfirmForm({ detail, items, onConfirm }) {
  const [itemCode, setItemCode] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [itemFilter, setItemFilter] = useState("");

  const filtered = items
    .filter(
      (i) =>
        i.item_code.toLowerCase().includes(itemFilter.toLowerCase()) ||
        i.item_name.toLowerCase().includes(itemFilter.toLowerCase()),
    )
    .slice(0, 20);

  return (
    <div className="scf-wrap">
      <div className="scf-header">Store: Confirm Item Details</div>

      <div className="scf-grid">
        <div>
          <label className="scf-label">Search & Select Item *</label>
          <input
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
            placeholder="Type item name or code…"
            className="scf-input"
          />
          {itemFilter && (
            <div className="scf-dropdown">
              {filtered.map((item) => (
                <div
                  key={item.item_code}
                  onClick={() => {
                    setItemCode(item.item_code);
                    setItemFilter(`${item.item_name} (${item.item_code})`);
                  }}
                  className="scf-dropdown-item"
                >
                  <span className="scf-item-code">{item.item_code}</span> — {item.item_name}{" "}
                  <span className="scf-item-cat">({item.item_category})</span>
                </div>
              ))}
              {!filtered.length && (
                <div className="scf-no-items">No items found</div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="scf-label">Unit Price (₹)</label>
          <input
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="Optional"
            className="scf-input"
          />
        </div>
      </div>

      <Button
        variant="success"
        disabled={!itemCode}
        onClick={() => itemCode && onConfirm(detail.inward_id, itemCode, unitPrice)}
      >
        Generate Labels &amp; Start QR Confirmation
      </Button>
    </div>
  );
}
