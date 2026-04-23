CREATE INDEX "idx_users_platform_role" ON "users" ("platformRole");
CREATE INDEX "idx_users_created_at" ON "users" ("createdAt");

CREATE INDEX "idx_contributions_status_verified_at"
  ON "contributions" ("status", "verifiedAt");
CREATE INDEX "idx_contributions_status_submitted_at"
  ON "contributions" ("status", "submittedAt");

CREATE INDEX "idx_ledger_recorded_at" ON "ledger_entries" ("recordedAt");

CREATE INDEX "idx_support_flags_reporter_created"
  ON "support_flags" ("reporterId", "createdAt" DESC);
