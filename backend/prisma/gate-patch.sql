-- Applied to dev DB on 2026-06-13. Run this on staging / production before deploying.

ALTER TABLE gate_inward ALTER COLUMN total_qty DROP NOT NULL;
ALTER TABLE gate_inward ALTER COLUMN uom       DROP NOT NULL;

ALTER TABLE gate_outward ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(300);
ALTER TABLE gate_outward ADD COLUMN IF NOT EXISTS invoice_no    VARCHAR(100);
ALTER TABLE gate_outward ADD COLUMN IF NOT EXISTS status        VARCHAR(50) DEFAULT 'pending';

-- Applied to dev DB on 2026-07-03.
ALTER TABLE gate_inward  ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::text;
ALTER TABLE gate_outward ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::text;
