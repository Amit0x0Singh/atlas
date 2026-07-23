-- Tracks whether a production task's microbe requirement has been opened for
-- issuance on the Microbe Outward page, independent of bom_issue_started
-- (RM issuance on Material Issue by BOM) — different people/pages draw on
-- the same task, so one starting shouldn't hide it from the other.
ALTER TABLE "production_tasks" ADD COLUMN IF NOT EXISTS "microbe_issue_started" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "production_tasks" ADD COLUMN IF NOT EXISTS "microbe_issue_started_at" TIMESTAMPTZ;
