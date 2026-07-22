export const todayStr = () => new Date().toISOString().split("T")[0];

// Most raw materials carry a manufacturer-stated shelf life (e.g. "2 years
// from manufacturing date") rather than a printed expiry date — so instead
// of asking the operator to do that date math by hand, they enter however
// much shelf life is *remaining* (years + months) and the system adds that
// to the received date itself.
//
// Formats using local getters (not toISOString, which converts through UTC)
// — the date math above is done in local time, so converting back via UTC
// can silently shift the result a day in either direction depending on the
// browser's timezone offset.
function toISODateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcExpiryDate(receivedDate, years, months) {
  const y = parseInt(years) || 0;
  const m = parseInt(months) || 0;
  if (!receivedDate || (!y && !m)) return "";
  const d = new Date(receivedDate + "T00:00:00");
  d.setFullYear(d.getFullYear() + y);
  d.setMonth(d.getMonth() + m);
  return toISODateLocal(d);
}

export function fmtDateLabel(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
