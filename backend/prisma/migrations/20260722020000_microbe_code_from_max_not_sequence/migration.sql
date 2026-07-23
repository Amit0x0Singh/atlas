-- microbe_code was generated from a raw Postgres SEQUENCE, which only ever
-- increments and never rolls back — a deleted/rolled-back row still
-- permanently consumes a number, so the sequence can drift far ahead of the
-- actual row count (seen in practice: 69 real rows, sequence already at
-- 149). Application code now computes the next code from MAX(existing
-- microbe_code)+1 at insert time instead (same pattern already used for RM
-- item codes and container next-codes elsewhere in this app), so it always
-- reflects what's actually in the table. The column keeps its data/unique
-- constraint — only the DB-level default is dropped.
ALTER TABLE "microbe_master" ALTER COLUMN "microbe_code" DROP DEFAULT;
