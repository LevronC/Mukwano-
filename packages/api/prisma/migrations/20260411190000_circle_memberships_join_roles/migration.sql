-- Join requests use role = 'pending' | 'rejected'. Legacy DBs may have a CHECK
-- limiting role to member|contributor|creator|admin, which causes INSERT to fail.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'circle_memberships'
      AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE circle_memberships DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
