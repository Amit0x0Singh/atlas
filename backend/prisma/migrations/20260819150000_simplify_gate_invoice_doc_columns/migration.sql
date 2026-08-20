-- Consolidates GateInward/GateOutward's invoice-document tracking down to a
-- single column. invoice_doc_path, invoice_doc_mime_type, and
-- invoice_doc_size are all either redundant (the storage directory is a
-- fixed constant per gate/utils/storage-paths.js — only the filename
-- varies) or derivable (content-type from the extension; uploads are
-- restricted to exactly 4 types) or simply unused (size was never read back
-- anywhere). invoice_doc_file_name is repurposed to hold the *generated*
-- on-disk filename (multer's `<record-id>-<timestamp><ext>`) instead of the
-- original browser/camera filename it held before — the full path is now
-- reconstructed at read/write time as `known_directory + this value`.
--
-- Backfill first: for any row that already has a document attached,
-- invoice_doc_path's basename IS that generated on-disk filename — extract
-- it into invoice_doc_file_name (overwriting the original-filename value it
-- held until now) before the source columns are dropped.

UPDATE "gate_inward"
SET "invoice_doc_file_name" = regexp_replace("invoice_doc_path", '.*[\/]', '')
WHERE "invoice_doc_path" IS NOT NULL;

UPDATE "gate_outward"
SET "invoice_doc_file_name" = regexp_replace("invoice_doc_path", '.*[\/]', '')
WHERE "invoice_doc_path" IS NOT NULL;

ALTER TABLE "gate_inward" DROP COLUMN "invoice_doc_path";
ALTER TABLE "gate_inward" DROP COLUMN "invoice_doc_mime_type";
ALTER TABLE "gate_inward" DROP COLUMN "invoice_doc_size";

ALTER TABLE "gate_outward" DROP COLUMN "invoice_doc_path";
ALTER TABLE "gate_outward" DROP COLUMN "invoice_doc_mime_type";
ALTER TABLE "gate_outward" DROP COLUMN "invoice_doc_size";
