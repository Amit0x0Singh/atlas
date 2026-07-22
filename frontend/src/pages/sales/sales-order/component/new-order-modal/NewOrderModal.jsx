import { IconButton } from "../../../../../components/ui";
import { X } from "lucide-react";
import CreateSalesOrder from "../create-sales-order/create-sales-order.jsx";

export default function NewOrderModal({ editing, products, profiles, packingMaterials, onSave, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "min(920px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "20px 28px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
            borderRadius: "16px 16px 0 0",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "17px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {editing ? `Edit Order — ${editing.soId}` : "New Sales Order"}
            </h2>
            <p
              style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}
            >
              Fill in the order details below
            </p>
          </div>
          <IconButton icon={X} tooltip="Close" variant="secondary" onClick={onClose} />
        </div>

        {/* Form body */}
        <div style={{ padding: "24px 28px 28px" }}>
          <CreateSalesOrder
            initial={editing || undefined}
            products={products}
            profiles={profiles}
            packingMaterials={packingMaterials}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
