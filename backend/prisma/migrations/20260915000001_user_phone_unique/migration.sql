-- Phone becomes the primary createdBy/updatedBy stamping identity going
-- forward (see utils/prisma-audit-extension.js), so it needs to be unique.
-- Column stays nullable: most existing accounts predate this and have no
-- phone on file yet. A plain UNIQUE index is safe with nulls — Postgres
-- treats every NULL as distinct from every other NULL, so the many existing
-- blank phone rows don't conflict with each other.
CREATE UNIQUE INDEX "users_phone_key" ON "users" ("phone");
