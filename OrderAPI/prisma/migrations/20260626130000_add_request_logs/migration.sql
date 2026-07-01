CREATE TABLE "request_logs" (
    "id" SERIAL NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "query" TEXT NOT NULL DEFAULT '{}',
    "body" TEXT NOT NULL DEFAULT '{}',
    "headers" TEXT NOT NULL DEFAULT '{}',
    "responseBody" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_logs_createdAt_idx" ON "request_logs"("createdAt");
