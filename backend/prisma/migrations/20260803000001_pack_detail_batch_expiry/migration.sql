-- Support multiple supplier batch codes / expiry dates within a single lot:
-- move customer_batch_code and expiry_date from print_master (one value per
-- lot) down to pack_detail (one value per bag), so different bag ranges of
-- the same lot can carry different batch/expiry values.

ALTER TABLE "pack_detail" ADD COLUMN "customer_batch_code" TEXT;
ALTER TABLE "pack_detail" ADD COLUMN "expiry_date" TIMESTAMP(3);

-- Backfill existing bags from their lot's current value before it's dropped.
UPDATE "pack_detail" pd
SET customer_batch_code = pm.customer_batch_code,
    expiry_date = pm.expiry_date
FROM "print_master" pm
WHERE pd.print_master_id = pm.id;

ALTER TABLE "print_master" DROP COLUMN "customer_batch_code";
ALTER TABLE "print_master" DROP COLUMN "expiry_date";
