-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Existing accounts before this feature are treated as verified
UPDATE "users" SET "emailVerified" = true WHERE "emailVerified" = false;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastVerificationEmailSent" TIMESTAMP(3);

-- CreateTable
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

CREATE UNIQUE INDEX IF NOT EXISTS "email_tokens_token_key" ON "email_tokens"("token");

CREATE INDEX IF NOT EXISTS "idx_email_tokens_user_type" ON "email_tokens"("userId", "type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
