-- Platform role (USER | GLOBAL_ADMIN). Mirrors legacy isGlobalAdmin for JWT/back-compat.
ALTER TABLE "users" ADD COLUMN "platformRole" TEXT NOT NULL DEFAULT 'USER';
UPDATE "users" SET "platformRole" = 'GLOBAL_ADMIN' WHERE "isGlobalAdmin" = true;

-- Optional user affected by an audit entry (role changes, admin actions, etc.)
ALTER TABLE "audit_logs" ADD COLUMN "subjectUserId" UUID;

-- Basic support / triage flags (admin-visible)
CREATE TABLE "support_flags" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "subjectUserId" UUID,
    "subjectType" TEXT NOT NULL DEFAULT 'user',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_support_flags_status_created" ON "support_flags" ("status", "createdAt" DESC);
CREATE INDEX "idx_support_flags_subject" ON "support_flags" ("subjectUserId");

ALTER TABLE "support_flags" ADD CONSTRAINT "support_flags_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_flags" ADD CONSTRAINT "support_flags_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
