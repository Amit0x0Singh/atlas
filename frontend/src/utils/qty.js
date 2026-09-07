// Quantity helpers for issue/BOM flows.
//
// Recipe requirements (qtyPerUnit × batch) can legitimately be sub-gram —
// rounding them to 3 decimals used to floor tiny lines to exactly 0
// ("Required: 0 KG"). Round to 6 dp instead: fine enough for any real
// recipe (µg / µL scale) while still killing IEEE-754 float noise.

// "Line fully covered" tolerance. Absolute, in the line's own unit. At 1e-4
// a line only auto-completes when what's left is genuinely unweighable
// (<0.1 mg when the line is in g, <0.1 g when it's in kg).
export const QTY_EPS = 1e-4

export const roundQty = (n) => {
  const x = Number(n)
  return Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : 0
}

// Display string — up to 6 dp, trailing zeros trimmed: "0.15", "150", "0.0004".
export const fmtQty = (n) => String(Number(roundQty(n).toFixed(6)))
