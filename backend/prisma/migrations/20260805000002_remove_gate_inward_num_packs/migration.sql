-- GateInward.numPacks was a legacy field with no write path — always empty.

-- AlterTable
ALTER TABLE "gate_inward" DROP COLUMN "num_packs";
