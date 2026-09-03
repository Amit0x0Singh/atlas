-- Material Indent — plant sections request general/daily-use store items
-- (PPE, cleaning consumables, IPA, hand wash, …) that live in RM Master but
-- aren't BOM raw materials. Three tables:
--
--   • material_indent          — the request header (status workflow below)
--   • material_indent_item     — requested lines + running issued qty
--   • material_indent_sequence — per department+year running number for indent_no
--
-- Submitting an indent moves no stock. The Store issues each line later from
-- the "Open Indents" workflow under Store Outward, scanning a pack/container
-- QR — that path (reusing the Material Issue by BOM engine) is what deducts
-- inventory and writes the outward / stock_ledger rows.
--
-- Status: DRAFT | OPEN | PARTIAL | COMPLETED | REJECTED | CANCELLED
-- Line status: PENDING | PARTIAL | ISSUED | REJECTED

CREATE TABLE IF NOT EXISTS "material_indent" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "indent_no"        TEXT UNIQUE,
  "year"             INTEGER NOT NULL,
  "department_code"  TEXT NOT NULL,
  "department_name"  TEXT NOT NULL,
  "purpose"          TEXT NOT NULL,
  "other_purpose"    TEXT,
  "priority"         TEXT NOT NULL DEFAULT 'Normal',
  "critical_reason"  TEXT,
  "overall_remarks"  TEXT,
  "status"           TEXT NOT NULL DEFAULT 'DRAFT',
  "rejection_reason" TEXT,
  "submitted_at"     TIMESTAMP(3),
  "completed_at"     TIMESTAMP(3),
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"       VARCHAR(255),
  "updated_by"       VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS "material_indent_status_idx"          ON "material_indent"("status");
CREATE INDEX IF NOT EXISTS "material_indent_department_code_idx" ON "material_indent"("department_code");
CREATE INDEX IF NOT EXISTS "material_indent_created_by_idx"      ON "material_indent"("created_by");
CREATE INDEX IF NOT EXISTS "material_indent_submitted_at_idx"    ON "material_indent"("submitted_at");

CREATE TABLE IF NOT EXISTS "material_indent_item" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "indent_id"             TEXT NOT NULL,
  "item_code"             TEXT NOT NULL,
  "item_name"             TEXT NOT NULL,
  "category"              TEXT,
  "sub_category"          TEXT,
  "uom"                   TEXT NOT NULL,
  "requested_qty"         DOUBLE PRECISION NOT NULL,
  "issued_qty"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "line_status"           TEXT NOT NULL DEFAULT 'PENDING',
  "line_rejection_reason" TEXT,
  "remarks"               TEXT,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"            VARCHAR(255),
  "updated_by"            VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS "material_indent_item_indent_id_idx" ON "material_indent_item"("indent_id");

DO $$ BEGIN
  ALTER TABLE "material_indent_item"
    ADD CONSTRAINT "material_indent_item_indent_id_fkey"
    FOREIGN KEY ("indent_id") REFERENCES "material_indent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "material_indent_sequence" (
  "department_code" TEXT NOT NULL,
  "year"            INTEGER NOT NULL,
  "seq"             INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("department_code", "year")
);

-- ── Admin-managed dropdowns (Settings → Select Options) ──────────────────────
-- Same shape/idempotency as 20260811100001_add_option_groups_and_values.
INSERT INTO "option_groups" ("id", "group_code", "label", "description") VALUES
  (gen_random_uuid()::text, 'MATERIAL_INDENT_DEPARTMENT', 'Material Indent — Department', 'Requesting department / section on a Material Indent'),
  (gen_random_uuid()::text, 'MATERIAL_INDENT_PURPOSE',    'Material Indent — Purpose',    'Purpose of a Material Indent request')
ON CONFLICT ("group_code") DO NOTHING;

INSERT INTO "option_values" ("id", "group_id", "code", "label", "sort_order")
SELECT gen_random_uuid()::text, g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('PF', 'Powder Formulation',        0),
  ('MP', 'Microbial Production',      1),
  ('BP', 'Botanical Production',      2),
  ('NP', 'Nano Production',           3),
  ('PK', 'Packing',                   4),
  ('LF', 'Liquid Filling',            5),
  ('QC', 'Quality Control',           6),
  ('QA', 'Quality Assurance',         7),
  ('RD', 'Research & Development',     8),
  ('MT', 'Maintenance',               9),
  ('EH', 'EHS / Safety',             10),
  ('AD', 'Administration',           11),
  ('ST', 'Stores',                   12),
  ('MG', 'Management',               13),
  ('OT', 'Other',                    14)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'MATERIAL_INDENT_DEPARTMENT'
ON CONFLICT ("group_id", "code") DO NOTHING;

INSERT INTO "option_values" ("id", "group_id", "code", "label", "sort_order")
SELECT gen_random_uuid()::text, g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('Production Support',            'Production Support',            0),
  ('Packing Operations',            'Packing Operations',            1),
  ('Cleaning & Housekeeping',       'Cleaning & Housekeeping',       2),
  ('Safety / PPE',                  'Safety / PPE',                  3),
  ('Maintenance',                   'Maintenance',                   4),
  ('Quality Control / Testing',     'Quality Control / Testing',     5),
  ('Quality Assurance',             'Quality Assurance',             6),
  ('Research & Development',         'Research & Development',        7),
  ('Laboratory Use',                'Laboratory Use',                8),
  ('Trial / Pilot Activity',        'Trial / Pilot Activity',        9),
  ('General Department Requirement', 'General Department Requirement', 10),
  ('Employee Requirement',          'Employee Requirement',          11),
  ('Replacement of Damaged Material','Replacement of Damaged Material',12),
  ('Management Usage',              'Management Usage',              13),
  ('Other',                         'Other',                        14)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'MATERIAL_INDENT_PURPOSE'
ON CONFLICT ("group_id", "code") DO NOTHING;
