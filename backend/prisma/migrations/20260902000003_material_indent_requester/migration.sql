-- Material Indent follow-up — snapshot the requester on each indent:
--  • requester_name   — the requester's full name, so listings/issue screens
--    show "Amit Nano" instead of the raw login email.
--  • requester_plants — the requester's User.plants[] at submit time. The
--    requester-facing "My Plant Indents" tab is scoped to this: a plant/
--    section person only sees indents whose requester_plants overlaps their
--    own plants (a Nano person never sees Botanical's requests, and vice
--    versa). The Store (inventory.material-indent.issue) and admins
--    (admin.panel.access) still see every indent.

ALTER TABLE "material_indent" ADD COLUMN IF NOT EXISTS "requester_name"   TEXT;
ALTER TABLE "material_indent" ADD COLUMN IF NOT EXISTS "requester_plants" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill both from the creating account (created_by holds their email).
UPDATE "material_indent" mi
SET "requester_name"   = u."full_name",
    "requester_plants" = u."plants"
FROM "users" u
WHERE lower(mi."created_by") = lower(u."email")
  AND (mi."requester_name" IS NULL OR mi."requester_plants" = '{}');
