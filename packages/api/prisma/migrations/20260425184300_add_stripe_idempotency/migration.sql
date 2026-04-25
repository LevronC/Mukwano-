-- AlterTable: add Stripe checkout session ID to contributions
ALTER TABLE "contributions" ADD COLUMN "stripeCheckoutSessionId" TEXT;

-- CreateIndex: unique constraint for stripeCheckoutSessionId
CREATE UNIQUE INDEX "contributions_stripeCheckoutSessionId_key" ON "contributions"("stripeCheckoutSessionId");

-- CreateTable: idempotency_keys
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: composite unique on (key, userId)
CREATE UNIQUE INDEX "idempotency_keys_key_userId_key" ON "idempotency_keys"("key", "userId");

-- CreateIndex
CREATE INDEX "idx_idempotency_keys_created_at" ON "idempotency_keys"("createdAt");
