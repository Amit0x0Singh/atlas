-- Gate Outward gets the same invoice-document attachment fields Gate Inward
-- already has (invoice_doc_path/file_name/mime_type/size) — see GateInward's
-- field comments in prisma/model/inventory/gate.prisma for what each stores.
-- All nullable, so no backfill needed for existing rows.

ALTER TABLE "gate_outward" ADD COLUMN "invoice_doc_path" VARCHAR(500);
ALTER TABLE "gate_outward" ADD COLUMN "invoice_doc_file_name" VARCHAR(255);
ALTER TABLE "gate_outward" ADD COLUMN "invoice_doc_mime_type" VARCHAR(100);
ALTER TABLE "gate_outward" ADD COLUMN "invoice_doc_size" INTEGER;
