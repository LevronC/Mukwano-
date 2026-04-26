-- Add is_public visibility toggle to circles
-- Default false: existing circles remain private until an admin explicitly publishes them.
ALTER TABLE "circles" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
