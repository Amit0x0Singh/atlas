import { Loader2, CheckCircle, XCircle, X } from "lucide-react";
import "./ScanFeedback.css";

export default function ScanFeedback({ feedback, onClose }) {
  if (!feedback) return null;

  const isSuccess = feedback.success === true;
  const isLoading = feedback.loading === true;

  const Icon = isLoading ? Loader2 : isSuccess ? CheckCircle : XCircle;
  const variant = isSuccess ? "success" : isLoading ? "loading" : "error";

  return (
    <div className={`sf-wrap sf-wrap--${variant}`}>
      <Icon size={16} className={isLoading ? "sf-icon animate-spin" : "sf-icon"} />
      <span className="sf-msg">{feedback.msg}</span>
      <button onClick={onClose} className="sf-close">
        <X size={14} />
      </button>
    </div>
  );
}
