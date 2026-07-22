import { getChips } from "../../../../../masters/packing/components/packing-constants/packingConstants.jsx";

const COLOR_MAP = {
  blue: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  violet: { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
  emerald: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
  amber: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  gray: { bg: "#f9fafb", border: "#e5e7eb", text: "#374151" },
  pink: { bg: "#fdf2f8", border: "#fbcfe8", text: "#831843" },
  sky: { bg: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e" },
  orange: { bg: "#fff7ed", border: "#fed7aa", text: "#7c2d12" },
  slate: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" },
  yellow: { bg: "#fefce8", border: "#fde047", text: "#713f12" },
};

export default function PmChips({ pmData }) {
  const chips = getChips(pmData);
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
      {chips.map((chip, i) => {
        const c = COLOR_MAP[chip.color] || COLOR_MAP.gray;
        return (
          <span key={i} style={{
            fontSize: "11px", fontWeight: 500, padding: "2px 7px",
            borderRadius: "12px", border: `1px solid ${c.border}`,
            background: c.bg, color: c.text,
            fontStyle: chip.italic ? "italic" : "normal",
          }}>
            {chip.label}
          </span>
        );
      })}
    </div>
  );
}
