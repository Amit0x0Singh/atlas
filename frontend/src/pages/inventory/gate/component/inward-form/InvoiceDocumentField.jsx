import { useRef } from "react";
import { Camera, Paperclip, X } from "lucide-react";
import { Button } from "../../../../../components/ui";

// Gate staff snap the invoice with a phone/tablet far more often than they
// upload an existing file, so the camera is the primary, prominent action
// here — file upload is a quiet secondary link, not an equal-weight button.
//
// "Take Photo" hands off to the device's own native camera app via
// capture="environment" on a hidden file input, instead of a custom in-page
// camera widget — full-screen system camera UI, same as every other app,
// with no getUserMedia/video-preview code to maintain. Desktop browsers
// without a capture-capable camera just fall back to a normal file dialog.
export default function InvoiceDocumentField({ value, onChange, accept, existingDocument, onViewDocument }) {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  return (
    <div className="if-doc-field">
      <div className="if-doc-actions">
        <Button type="button" variant="primary" icon={Camera} onClick={() => cameraInputRef.current?.click()}>
          Take Photo
        </Button>
        <button type="button" className="if-doc-file-trigger" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={12} /> or choose a file
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="if-doc-file-input"
          tabIndex={-1}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="if-doc-file-input"
          tabIndex={-1}
        />
      </div>

      {value ? (
        <div className="if-doc-attached">
          <Paperclip size={12} />
          <span>{value.name}</span>
          <button type="button" className="if-doc-remove" onClick={() => onChange(null)} aria-label="Remove attached file">
            <X size={12} />
          </button>
        </div>
      ) : existingDocument?.fileName ? (
        <div className="if-doc-attached">
          <Paperclip size={12} />
          <span>Current: {existingDocument.fileName}</span>
          {onViewDocument && (
            <button type="button" className="if-file-view-btn" onClick={onViewDocument}>View</button>
          )}
        </div>
      ) : (
        <p className="if-doc-hint">Snap a photo or upload a PDF/JPEG/PNG of the invoice (optional)</p>
      )}
    </div>
  );
}
