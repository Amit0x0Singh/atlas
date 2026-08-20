import { useRef } from "react";
import { Camera, Paperclip, X } from "lucide-react";
import { Button } from "../../../../../components/ui";

// Mirrors inward-form/InvoiceDocumentField.jsx — see its comment for why the
// camera is the primary action and file upload a quiet secondary link.
export default function OutwardDocumentField({ value, onChange, accept, existingDocument, onViewDocument }) {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  return (
    <div className="of-doc-field">
      <div className="of-doc-actions">
        <Button type="button" variant="primary" icon={Camera} onClick={() => cameraInputRef.current?.click()}>
          Take Photo
        </Button>
        <button type="button" className="of-doc-file-trigger" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={12} /> or choose a file
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="of-doc-file-input"
          tabIndex={-1}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="of-doc-file-input"
          tabIndex={-1}
        />
      </div>

      {value ? (
        <div className="of-doc-attached">
          <Paperclip size={12} />
          <span>{value.name}</span>
          <button type="button" className="of-doc-remove" onClick={() => onChange(null)} aria-label="Remove attached file">
            <X size={12} />
          </button>
        </div>
      ) : existingDocument?.fileName ? (
        <div className="of-doc-attached">
          <Paperclip size={12} />
          <span>Current: {existingDocument.fileName}</span>
          {onViewDocument && (
            <button type="button" className="of-file-view-btn" onClick={onViewDocument}>View</button>
          )}
        </div>
      ) : (
        <p className="of-doc-hint">Snap a photo or upload a PDF/JPEG/PNG of the invoice (optional)</p>
      )}
    </div>
  );
}
