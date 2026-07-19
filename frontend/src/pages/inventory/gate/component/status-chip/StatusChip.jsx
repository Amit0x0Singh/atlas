import "./StatusChip.css";

const STATUS_LABELS = {
  pending_review: "Pending Review",
  labels_generated: "Labels Ready",
  qr_pending: "QR Pending",
  confirmed: "Confirmed",
  quarantine: "Quarantine",
};

export default function StatusChip({ status }) {
  const variant = STATUS_LABELS[status] ? status : "default";
  return (
    <span className={`chip chip--${variant}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
