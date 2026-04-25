-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_login_attempts_email" ON "login_attempts"("email", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_login_attempts_created_at" ON "login_attempts"("createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_logs_subject_created_at" ON "audit_logs"("subjectUserId", "createdAt");
