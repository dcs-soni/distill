-- DropIndex
DROP INDEX "DocumentMetrics_timestamp_idx";

-- DropIndex
DROP INDEX "ReviewMetrics_timestamp_idx";

-- AlterTable
ALTER TABLE "DocumentMetrics" ADD COLUMN     "aiProvider" TEXT,
ADD COLUMN     "docType" TEXT;
