-- Centralized admin-managed dropdown options (Settings > Select Options).
-- Two tables: option_groups (a dropdown "family", e.g. COMPANY) and
-- option_values (the selectable entries within a group, e.g. SOM/DVS/...).
--
-- Business tables continue to store the plain `code` string on their own
-- rows directly (no FK from business tables to option_values) — same as the
-- hardcoded arrays this replaces. That's why deactivating (never hard-
-- deleting) an option_value can never break an existing historical record:
-- the record's stored string is independent of whether the option_values
-- row still exists or is active.
--
-- id columns use gen_random_uuid()::text (same generator already used for
-- User.userId's dbgenerated default) since this hand-written seed data has
-- no Prisma client available to produce its own cuid()s.

CREATE TABLE IF NOT EXISTS "option_groups" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "group_code"  VARCHAR(50) NOT NULL UNIQUE,
  "label"       VARCHAR(200) NOT NULL,
  "description" VARCHAR(500),
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
  "created_by"  VARCHAR(255),
  "updated_by"  VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "option_values" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "group_id"    TEXT NOT NULL REFERENCES "option_groups"("id"),
  "code"        VARCHAR(100) NOT NULL,
  "label"       VARCHAR(200) NOT NULL,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "sort_order"  INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
  "created_by"  VARCHAR(255),
  "updated_by"  VARCHAR(255),
  UNIQUE ("group_id", "code")
);

-- ── Groups (first wave — see planning doc for what's deliberately excluded:
-- status/workflow enums, Tracking Type, State, Plant keys, roles, UOM) ───────
INSERT INTO "option_groups" ("group_code", "label", "description") VALUES
  ('COMPANY',          'Company',          'Legal entities used on Gate and Sales Order forms'),
  ('CATEGORY',         'Category',         'Raw Material category'),
  ('SUB_CATEGORY',     'Sub-Category',     'Raw Material sub-category'),
  ('WAREHOUSE',        'Warehouse',        'Pack Inward destination warehouse/location'),
  ('CARRIER',          'Carrier',          'Sales Order carrier/excipient options'),
  ('PRIMARY_PACKING',  'Primary Packing',  'Sales Order primary packing options'),
  ('SECONDARY_PACKING','Secondary Packing','Sales Order secondary packing options'),
  ('LABEL_TYPE',       'Label Type',       'Sales Order label type options'),
  ('SHIFT',            'Shift',            'Production Planning shift options')
ON CONFLICT ("group_code") DO NOTHING;

-- ── COMPANY ── seeded from CompanyMaster's canonical codes (kept as-is,
-- see plan) plus AL-LLC (confirmed real, Sales-only today) ──────────────────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('SOM',    'SOM Phytopharma', 0),
  ('DVS',    'DVS',             1),
  ('AL-IPL', 'AL-IPL',          2),
  ('AL-PTE', 'AL-PTE',          3),
  ('AL-LLC', 'AL-LLC',          4)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'COMPANY'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── CATEGORY ── every distinct RmMaster.category value in the live DB as of
-- this migration, including the pre-existing "raw materials" / "raw
-- material" inconsistency — seeded as-is (not merged) so nothing already in
-- use disappears; an admin can deactivate/consolidate via the UI later. ─────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('raw materials',            'Raw Materials',            0),
  ('raw material',             'Raw Material',              1),
  ('consumables consumed',     'Consumables Consumed',      2),
  ('packing material',         'Packing Material',          3)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'CATEGORY'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── SUB_CATEGORY ── every distinct RmMaster.subCategory value in the live DB
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('chemicals',                  'Chemicals',                  0),
  ('herbal extracts',            'Herbal Extracts',            1),
  ('others-rm',                  'Others - RM',                2),
  ('oils',                       'Oils',                       3),
  ('production consumables',     'Production Consumables',     4),
  ('lab consumables',            'Lab Consumables',             5),
  ('solvents',                   'Solvents',                    6),
  ('carriers',                   'Carriers',                    7),
  ('technical',                  'Technical',                   8),
  ('packing material',           'Packing Material',            9),
  ('others-pm',                  'Others - PM',                10),
  ('boxes & cartons',            'Boxes & Cartons',             11),
  ('labels',                     'Labels',                      12),
  ('pouches & covers & bags',    'Pouches & Covers & Bags',     13),
  ('bottles',                    'Bottles',                     14),
  ('drums',                      'Drums',                       15)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'SUB_CATEGORY'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── WAREHOUSE ── the 9 existing names, plus the 6 requested earlier and not
-- yet applied to constants.js (this migration is how that request lands) ────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('BULK ROOM',            'Bulk Room',             0),
  ('BOX GODOWN',           'Box Godown',            1),
  ('BOTTLE GODOWN',        'Bottle Godown',         2),
  ('STERILE ROOM I',       'Sterile Room I',        3),
  ('STERILE ROOM II',      'Sterile Room II',       4),
  ('COLD ROOM',            'Cold Room',             5),
  ('SOLVENT GODOWN',       'Solvent Godown',        6),
  ('ACM ROOM',             'ACM Room',              7),
  ('HERBAL STORAGE',       'Herbal Storage',        8),
  ('BLACK POWDER GODOWN',  'Black Powder Godown',   9),
  ('SEED STORAGE GODOWN',  'Seed Storage Godown',  10),
  ('POWDER STORAGE GODOWN','Powder Storage Godown',11),
  ('GRANULES GODOWN',      'Granules Godown',      12),
  ('GENERAL GODOWN',       'General Godown',       13),
  ('PRINTING SECTION',     'Printing Section',     14)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'WAREHOUSE'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── CARRIER ── copied verbatim from sales-order/shared/constants.js's
-- CARRIER_OPTIONS (the leading "" blank option is UI-only, not seeded) ──────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('Dextrose',            'Dextrose',            0),
  ('Talc',                'Talc',                1),
  ('Lactose',             'Lactose',             2),
  ('HSCAS',               'HSCAS',               3),
  ('China Clay',          'China Clay',          4),
  ('Diatomaceous Earth',  'Diatomaceous Earth',  5),
  ('LSP',                 'LSP',                 6),
  ('Precipitated CaCO3',  'Precipitated CaCO3',  7),
  ('Silica',              'Silica',              8)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'CARRIER'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── PRIMARY_PACKING ── copied verbatim from PRIMARY_PACKING (the leading ""
-- and trailing "__CUSTOM__" sentinel are UI-only, appended client-side) ─────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('LD Pouch',                 'LD Pouch',                  0),
  ('AL Pouch',                 'AL Pouch',                  1),
  ('HDPE Jar',                 'HDPE Jar',                  2),
  ('100ml Bottle (Round)',     '100ml Bottle (Round)',      3),
  ('100ml Bottle (Regular)',   '100ml Bottle (Regular)',    4),
  ('100ml Bottle (Triangle)',  '100ml Bottle (Triangle)',   5),
  ('200ml Bottle (Round)',     '200ml Bottle (Round)',      6),
  ('200ml Bottle (Regular)',   '200ml Bottle (Regular)',    7),
  ('200ml Bottle (Triangle)',  '200ml Bottle (Triangle)',   8),
  ('500ml Bottle (Round)',     '500ml Bottle (Round)',      9),
  ('500ml Bottle (Regular)',   '500ml Bottle (Regular)',   10),
  ('500ml Bottle (Triangle)',  '500ml Bottle (Triangle)',  11),
  ('1L Bottle (Round)',        '1L Bottle (Round)',        12),
  ('1L Bottle (Regular)',      '1L Bottle (Regular)',      13),
  ('1L Bottle (Triangle)',     '1L Bottle (Triangle)',     14)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'PRIMARY_PACKING'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── SECONDARY_PACKING ── copied verbatim from SECONDARY_PACKING (same
-- blank/__CUSTOM__ handling as PRIMARY_PACKING above) ────────────────────────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('W-CBB',                 'W-CBB',                 0),
  ('B-CBB',                 'B-CBB',                 1),
  ('OMB 30 (30kg Drum)',    'OMB 30 (30kg Drum)',    2),
  ('OMB 50 (50kg Drum)',    'OMB 50 (50kg Drum)',    3),
  ('25Kg HDPE Bag',         '25Kg HDPE Bag',         4),
  ('50Kg HDPE Bag',         '50Kg HDPE Bag',         5),
  ('Cartons',               'Cartons',               6),
  ('25L Jerry Can',         '25L Jerry Can',         7),
  ('50L Barrel',            '50L Barrel',            8),
  ('5L Can',                '5L Can',                9),
  ('10L Can',               '10L Can',              10),
  ('Others',                'Others',               11)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'SECONDARY_PACKING'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── LABEL_TYPE ── copied verbatim from LABEL_TYPES (the leading blank
-- "— Select —" placeholder is UI-only, not seeded) ───────────────────────────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('CUSTOMER',     'Customer Label', 0),
  ('COMPUTER',     'Computer Label', 1),
  ('RETAIL',       'Retail Label',   2),
  ('PACKING_SLIP', 'Packing Slip',   3)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'LABEL_TYPE'
ON CONFLICT ("group_id", "code") DO NOTHING;

-- ── SHIFT ── copied verbatim from plantConfig.js's SHIFTS (Production
-- Planning only — distinct from admin_panel resources.js's unrelated
-- per-resource "shift" enum field, not conflated here) ───────────────────────
INSERT INTO "option_values" ("group_id", "code", "label", "sort_order")
SELECT g.id, v.code, v.label, v.sort_order
FROM "option_groups" g
JOIN (VALUES
  ('General', 'General', 0),
  ('A',       'A',       1),
  ('B',       'B',       2),
  ('G',       'G',       3),
  ('A+G',     'A+G',     4),
  ('A+B',     'A+B',     5)
) AS v(code, label, sort_order) ON true
WHERE g."group_code" = 'SHIFT'
ON CONFLICT ("group_id", "code") DO NOTHING;
