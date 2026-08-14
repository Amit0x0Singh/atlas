export const inp = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: "8px",
  padding: "8px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box",
};
export const lbl = {
  display: "block", fontSize: "12px", fontWeight: 600,
  color: "#4b5563", marginBottom: "4px",
};

// Applies a red border/ring on top of any input style object when a
// field-level validation error is present for that input.
export function withError(style, hasError) {
  return hasError ? { ...style, borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626" } : style;
}
