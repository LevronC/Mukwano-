-- Baseline schema for empty databases (CI, new envs). Uses idempotent DDL so
-- existing deployments that already have tables from db push + later migrations
-- can apply this migration once without errors.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT,
    "sector" TEXT,
    "avatarUrl" TEXT,
    "isGlobalAdmin" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastVerificationEmailSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "circles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goalAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "circles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "governance_configs" (
    "id" UUID NOT NULL,
    "circleId" UUID NOT NULL,
    "minContribution" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "votingModel" TEXT NOT NULL DEFAULT 'one_member_one_vote',
    "quorumPercent" INTEGER NOT NULL DEFAULT 51,
    "approvalPercent" INTEGER NOT NULL DEFAULT 51,
    "proposalDurationDays" INTEGER NOT NULL DEFAULT 7,
    "whoCanPropose" TEXT NOT NULL DEFAULT 'contributor',
    "requireProof" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "governance_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "circle_memberships" (
    "id" UUID NOT NULL,
    "circleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "circle_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contributions" (
    "id" UUID NOT NULL,
    "circleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" UUID,
    "rejectionReason" TEXT,
    "ledgerEntryId" UUID,
    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proof_documents" (
    "id" UUID NOT NULL,
    "contributionId" UUID NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedBy" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proof_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
    "id" UUID NOT NULL,
    "circleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "runningBalance" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "referenceContributionId" UUID,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proposals" (
    "id" UUID NOT NULL,
    "circleId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'open',
    "votingDeadline" TIMESTAMP(3) NOT NULL,
    "quorumMet" BOOLEAN NOT NULL DEFAULT false,
    "finalYes" INTEGER NOT NULL DEFAULT 0,
    "finalNo" INTEGER NOT NULL DEFAULT 0,
    "finalAbstain" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "votes" (
    "id" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "vote" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "projects" (
    "id" UUID NOT NULL,
    "circleId" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'approved',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "project_updates" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "postedBy" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_updates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "email_tokens_token_key" ON "email_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_email_tokens_user_type" ON "email_tokens"("userId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "governance_configs_circleId_key" ON "governance_configs"("circleId");
CREATE INDEX IF NOT EXISTS "idx_memberships_circle" ON "circle_memberships"("circleId");
CREATE INDEX IF NOT EXISTS "idx_memberships_user" ON "circle_memberships"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "circle_memberships_circleId_userId_key" ON "circle_memberships"("circleId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "contributions_ledgerEntryId_key" ON "contributions"("ledgerEntryId");
CREATE INDEX IF NOT EXISTS "idx_contributions_circle" ON "contributions"("circleId");
CREATE INDEX IF NOT EXISTS "idx_contributions_user" ON "contributions"("userId");
CREATE INDEX IF NOT EXISTS "idx_contributions_status" ON "contributions"("status");
CREATE INDEX IF NOT EXISTS "idx_ledger_circle" ON "ledger_entries"("circleId", "recordedAt");
CREATE INDEX IF NOT EXISTS "idx_ledger_user" ON "ledger_entries"("userId");
CREATE INDEX IF NOT EXISTS "idx_proposals_circle" ON "proposals"("circleId");
CREATE INDEX IF NOT EXISTS "idx_proposals_status" ON "proposals"("status");
CREATE INDEX IF NOT EXISTS "idx_votes_proposal" ON "votes"("proposalId");
CREATE INDEX IF NOT EXISTS "idx_votes_user" ON "votes"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "votes_proposalId_userId_key" ON "votes"("proposalId", "userId");
CREATE INDEX IF NOT EXISTS "idx_projects_circle" ON "projects"("circleId");
CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects"("status");
CREATE INDEX IF NOT EXISTS "idx_project_updates_project" ON "project_updates"("projectId");
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications"("userId", "createdAt" DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_userId_fkey') THEN
    ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_tokens_userId_fkey') THEN
    ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'circles_createdBy_fkey') THEN
    ALTER TABLE "circles" ADD CONSTRAINT "circles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'governance_configs_circleId_fkey') THEN
    ALTER TABLE "governance_configs" ADD CONSTRAINT "governance_configs_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'circle_memberships_circleId_fkey') THEN
    ALTER TABLE "circle_memberships" ADD CONSTRAINT "circle_memberships_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'circle_memberships_userId_fkey') THEN
    ALTER TABLE "circle_memberships" ADD CONSTRAINT "circle_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contributions_circleId_fkey') THEN
    ALTER TABLE "contributions" ADD CONSTRAINT "contributions_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contributions_userId_fkey') THEN
    ALTER TABLE "contributions" ADD CONSTRAINT "contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contributions_verifiedBy_fkey') THEN
    ALTER TABLE "contributions" ADD CONSTRAINT "contributions_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proof_documents_contributionId_fkey') THEN
    ALTER TABLE "proof_documents" ADD CONSTRAINT "proof_documents_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_circleId_fkey') THEN
    ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_userId_fkey') THEN
    ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_circleId_fkey') THEN
    ALTER TABLE "proposals" ADD CONSTRAINT "proposals_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_createdBy_fkey') THEN
    ALTER TABLE "proposals" ADD CONSTRAINT "proposals_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_proposalId_fkey') THEN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_userId_fkey') THEN
    ALTER TABLE "votes" ADD CONSTRAINT "votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_circleId_fkey') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_proposalId_fkey') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_updates_projectId_fkey') THEN
    ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_updates_postedBy_fkey') THEN
    ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
