-- CreateTable
CREATE TABLE "DocumentMetrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "status" TEXT NOT NULL,
    "extractionConfidence" DOUBLE PRECISION,
    "extractionLatencyMs" INTEGER,
    "costUsd" DOUBLE PRECISION,

    CONSTRAINT "DocumentMetrics_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateTable
CREATE TABLE "ReviewMetrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "action" TEXT NOT NULL,
    "correctionsCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "ReviewMetrics_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateIndex
CREATE INDEX "DocumentMetrics_tenantId_timestamp_idx" ON "DocumentMetrics"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "DocumentMetrics_documentId_idx" ON "DocumentMetrics"("documentId");

-- CreateIndex
CREATE INDEX "ReviewMetrics_tenantId_timestamp_idx" ON "ReviewMetrics"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "ReviewMetrics_reviewerId_timestamp_idx" ON "ReviewMetrics"("reviewerId", "timestamp");

-- Setup TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert tables to hypertables
SELECT create_hypertable('"DocumentMetrics"', 'timestamp');
SELECT create_hypertable('"ReviewMetrics"', 'timestamp');
