-- Admin Panel bulk text transformation — job tracking table (same pattern
-- as delete_jobs: async job with polled progress, one transaction per job).
CREATE TABLE "transform_jobs" (
    "id" TEXT NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "transform_type" VARCHAR(50) NOT NULL,
    "params" JSONB,
    "target_ids" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "records_total" INTEGER NOT NULL DEFAULT 0,
    "records_done" INTEGER NOT NULL DEFAULT 0,
    "fields_updated" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_by" VARCHAR(200),
    "started_by_name" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "transform_jobs_pkey" PRIMARY KEY ("id")
);
