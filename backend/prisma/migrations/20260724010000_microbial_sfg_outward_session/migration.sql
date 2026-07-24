-- Persists an in-progress Microbe Outward issuance (header + requirement
-- rows) keyed by a client-generated id, mirroring bom_issue_session for
-- Material Issue by BOM — so navigating away mid-issuance never loses work
-- and the task stays resumable instead of disappearing once
-- microbe_issue_started is set.
CREATE TABLE IF NOT EXISTS "microbial_sfg_outward_session" (
  "id" TEXT PRIMARY KEY,
  "plan_task_id" TEXT,
  "header" JSONB NOT NULL,
  "rows" JSONB NOT NULL,
  "started_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);
