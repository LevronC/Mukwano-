-- Add invite_code column to circles for the invite link feature.
-- Nullable so existing circles are unaffected; unique for code-based lookups.
ALTER TABLE "circles" ADD COLUMN "inviteCode" TEXT;
CREATE UNIQUE INDEX "circles_inviteCode_key" ON "circles"("inviteCode");
