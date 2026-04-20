-- Optional geography / sector metadata for circles (matches onboarding choices on the web).
ALTER TABLE "circles" ADD COLUMN "country" TEXT;
ALTER TABLE "circles" ADD COLUMN "sector" TEXT;
