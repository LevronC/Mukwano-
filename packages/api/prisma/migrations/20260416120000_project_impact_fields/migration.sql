-- Portfolio impact attribution: sector + country per project
ALTER TABLE "projects" ADD COLUMN "sector" TEXT;
ALTER TABLE "projects" ADD COLUMN "countryCode" VARCHAR(2);
