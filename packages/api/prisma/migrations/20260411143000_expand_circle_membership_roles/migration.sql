DO $$
DECLARE
  existing_check text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'circle_memberships'
  ) THEN
    FOR existing_check IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'circle_memberships'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) ILIKE '%role%'
    LOOP
      EXECUTE format('ALTER TABLE public.circle_memberships DROP CONSTRAINT %I', existing_check);
    END LOOP;

    ALTER TABLE public.circle_memberships
      ADD CONSTRAINT circle_memberships_role_check
      CHECK (role IN ('member', 'contributor', 'creator', 'admin', 'pending', 'rejected'));
  END IF;
END $$;
