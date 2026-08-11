import { AlertCircle } from "lucide-react";

// Red, icon-prefixed message shown directly below an individual input
// when that specific field fails validation.
export default function FieldError({ message }) {
  if (!message) return null;
  return (
    <p style={{
      display: "flex", alignItems: "center", gap: "4px",
      margin: "4px 0 0", fontSize: "11px", fontWeight: 600, color: "#dc2626",
    }}>
      <AlertCircle size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      {message}
    </p>
  );
}
