import { useRef } from "react";
import { Camera, Paperclip, X } from "lucide-react";
import { Button } from "../../../../../components/ui";

// Mirrors inward-form/InvoiceDocumentField.jsx — see its comment for why the
// camera is the primary action and file upload a quiet secondary link, and
// for the multi-file staged/existing split.
export default function OutwardDocumentField({ value, onChange, accept, existingDocument, onViewDocument }) {
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
    <div className="of-doc-field">
      <div className="of-doc-actions">
        <Button type="button" variant="primary" icon={Camera} onClick={() => cameraInputRef.current?.click()}>
          Take Photo
        </Button>
        <button type="button" className="of-doc-file-trigger" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={12} /> or choose file(s)
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          className="of-doc-file-input"
          tabIndex={-1}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          className="of-doc-file-input"
          tabIndex={-1}
        />
      </div>

      {staged.length === 0 && existing.length === 0 && (
        <p className="of-doc-hint">Snap a photo or upload PDF/JPEG/PNG files of the invoice — you can attach more than one (optional)</p>
      )}

      {existing.length > 0 && (
        <div className="of-doc-list">
          {existing.map((doc) => (
            <div key={doc.fileName} className="of-doc-attached">
              <Paperclip size={12} />
              <span>{doc.fileName}</span>
              {onViewDocument && (
                <button type="button" className="of-file-view-btn" onClick={() => onViewDocument(doc.fileName)}>View</button>
              )}
            </div>
          ))}
        </div>
      )}

      {staged.length > 0 && (
        <div className="of-doc-list">
          {staged.map((file, i) => (
            <div key={`${file.name}-${i}`} className="of-doc-attached">
              <Paperclip size={12} />
              <span>{file.name}</span>
              <button type="button" className="of-doc-remove" onClick={() => removeStaged(i)} aria-label={`Remove ${file.name}`}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
