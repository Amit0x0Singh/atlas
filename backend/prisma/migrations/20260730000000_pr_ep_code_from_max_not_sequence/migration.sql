-- product_code / equip_code were generated from raw Postgres SEQUENCEs
-- (product_master_pr_code_seq, equipment_master_ep_code_seq). A sequence
-- created via bare CREATE SEQUENCE is owned only by the role that ran the
-- migration; on the hosted DB the app's runtime role was never granted
-- USAGE on either sequence, so every insert failed with "permission denied
-- for sequence ..." (Postgres 42501) — invisible locally because the local
-- connection uses a superuser that bypasses all grants. Application code
-- now computes the next code from MAX(existing code)+1 at insert time
-- instead (same pattern already used for microbe_code, RM item codes, and
-- container next-codes elsewhere in this app), which needs no DB-level
-- grants at all. The columns keep their data/unique constraints — only the
-- DB-level default is dropped.
ALTER TABLE "product_master" ALTER COLUMN "product_code" DROP DEFAULT;
ALTER TABLE "equipment_master" ALTER COLUMN "equip_code" DROP DEFAULT;
