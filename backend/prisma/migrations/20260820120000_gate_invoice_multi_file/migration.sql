-- Gate Inward/Outward invoice documents move from "at most one file per
-- entry" to "multiple files per entry" — Gate Entry now supports attaching
-- several photos/scans of an invoice to a single entry instead of just one.
-- The scalar invoice_doc_file_name column becomes a text array,
-- invoice_doc_file_names, of generated on-disk filenames (same naming
-- convention as before — multer's `<record-id>-<timestamp>-<index><ext>` —
-- just now one row can reference several). Uploading no longer replaces the
-- previous file; it appends to this array (see gate/document/gate.controller.js).
--
-- Backfill first: any row that already has a single document becomes a
-- one-element array before the old column is dropped.

ALTER TABLE "gate_inward" ADD COLUMN "invoice_doc_file_names" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "gate_outward" ADD COLUMN "invoice_doc_file_names" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "gate_inward"
SET "invoice_doc_file_names" = ARRAY["invoice_doc_file_name"]
WHERE "invoice_doc_file_name" IS NOT NULL;

UPDATE "gate_outward"
SET "invoice_doc_file_names" = ARRAY["invoice_doc_file_name"]
WHERE "invoice_doc_file_name" IS NOT NULL;

ALTER TABLE "gate_inward" DROP COLUMN "invoice_doc_file_name";
ALTER TABLE "gate_outward" DROP COLUMN "invoice_doc_file_name";
