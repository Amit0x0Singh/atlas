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
//
// An entry can carry several documents — `value` is an array of not-yet-
// uploaded Files staged in this session (each pick, camera or file, appends
// rather than replaces), and `existingDocument` is an array of already-
// uploaded `{ fileName }` the entry has from a prior save.
export default function InvoiceDocumentField({ value, onChange, accept, existingDocument, onViewDocument }) {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const staged = value || [];
  const existing = existingDocument || [];

  function addFiles(fileList) {
    if (!fileList?.length) return;
    onChange([...staged, ...Array.from(fileList)]);
  }

  function removeStaged(index) {
    onChange(staged.filter((_, i) => i !== index));
  }

  return (
    <div className="if-doc-field">
      <div className="if-doc-actions">
        <Button type="button" variant="primary" icon={Camera} onClick={() => cameraInputRef.current?.click()}>
          Take Photo
        </Button>
        <button type="button" className="if-doc-file-trigger" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={12} /> or choose file(s)
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          className="if-doc-file-input"
          tabIndex={-1}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          className="if-doc-file-input"
          tabIndex={-1}
        />
      </div>

      {staged.length === 0 && existing.length === 0 && (
        <p className="if-doc-hint">Snap a photo or upload PDF/JPEG/PNG files of the invoice — you can attach more than one (optional)</p>
      )}

      {existing.length > 0 && (
        <div className="if-doc-list">
          {existing.map((doc) => (
            <div key={doc.fileName} className="if-doc-attached">
              <Paperclip size={12} />
              <span>{doc.fileName}</span>
              {onViewDocument && (
                <button type="button" className="if-file-view-btn" onClick={() => onViewDocument(doc.fileName)}>View</button>
              )}
            </div>
          ))}
        </div>
      )}

      {staged.length > 0 && (
        <div className="if-doc-list">
          {staged.map((file, i) => (
            <div key={`${file.name}-${i}`} className="if-doc-attached">
              <Paperclip size={12} />
              <span>{file.name}</span>
              <button type="button" className="if-doc-remove" onClick={() => removeStaged(i)} aria-label={`Remove ${file.name}`}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
