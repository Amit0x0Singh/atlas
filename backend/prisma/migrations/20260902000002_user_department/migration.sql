-- Material Indent follow-up:
--  • users.department — each login belongs to one department / section
--    (code from the MATERIAL_INDENT_DEPARTMENT option group). Material
--    Indents are raised against this, derived server-side from the account
--    — the requester no longer picks it on the form. An account with no
--    department set cannot raise an indent.
--  • material_indent.purpose is no longer collected on the form — relax the
--    NOT NULL so submissions without it are valid.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" VARCHAR(50);

ALTER TABLE "material_indent" ALTER COLUMN "purpose" DROP NOT NULL;
