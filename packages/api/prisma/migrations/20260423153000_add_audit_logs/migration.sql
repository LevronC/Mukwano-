CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "circleId" UUID,
  "actorId" UUID,
  "entityType" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_audit_logs_circle_created_at"
  ON "audit_logs"("circleId", "createdAt");

CREATE INDEX "idx_audit_logs_actor_created_at"
  ON "audit_logs"("actorId", "createdAt");

CREATE INDEX "idx_audit_logs_created_at"
  ON "audit_logs"("createdAt");
