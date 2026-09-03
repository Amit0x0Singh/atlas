-- Per-microbe session issuance for Microbe Outward (mirrors Material Issue by
-- BOM): a microbe requirement can be issued partially, tracked, and topped up
-- across visits until fully covered.
--
--  • production_tasks.microbe_issue_completed(_at) — set once every microbe
--    in the task's recipe has been fully issued; the task then leaves the
--    "Select Production Task" picker.
--  • microbial_sfg_outward.plan_task_id — links each per-microbe issuance
--    record to its production task so Outward History groups a task's
--    (possibly many) partial issuances back into one session card.

ALTER TABLE "production_tasks"
  ADD COLUMN IF NOT EXISTS "microbe_issue_completed"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "microbe_issue_completed_at" TIMESTAMPTZ;

ALTER TABLE "microbial_sfg_outward"
  ADD COLUMN IF NOT EXISTS "plan_task_id" TEXT;
