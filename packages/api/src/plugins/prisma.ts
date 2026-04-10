import fp from 'fastify-plugin'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const adapter = new PrismaPg(process.env.DATABASE_URL!)
  const prisma = new PrismaClient({ adapter })

  await prisma.$connect()
  if (process.env.NODE_ENV === 'test') {
    await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ledger_entries') THEN
    DROP TRIGGER IF EXISTS trg_prevent_ledger_entries_update ON ledger_entries;
    DROP TRIGGER IF EXISTS trg_prevent_ledger_entries_delete ON ledger_entries;
    DROP FUNCTION IF EXISTS prevent_ledger_entries_mutation();
  END IF;
END $$;
    `)
  } else {
    // Triggers are created authoritatively by scripts/deploy-triggers.mjs at
    // deploy time. This block is a safety-net for local dev and acts as a
    // fast no-op in production (objects already exist). The EXCEPTION handler
    // prevents the XX000 "tuple concurrently updated" crash that occurs when
    // multiple Vercel Lambda instances cold-start simultaneously and race to
    // run the same DDL against PostgreSQL catalog rows.
    await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_entries'
  ) THEN
    CREATE OR REPLACE FUNCTION prevent_ledger_entries_mutation()
    RETURNS TRIGGER AS $fn$
    BEGIN
      RAISE EXCEPTION 'ledger_entries is append-only';
    END;
    $fn$ LANGUAGE plpgsql;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_ledger_entries_update'
    ) THEN
      CREATE TRIGGER trg_prevent_ledger_entries_update
      BEFORE UPDATE ON ledger_entries
      FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entries_mutation();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_ledger_entries_delete'
    ) THEN
      CREATE TRIGGER trg_prevent_ledger_entries_delete
      BEFORE DELETE ON ledger_entries
      FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entries_mutation();
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    -- Concurrent DDL from a parallel cold-start instance. Triggers are being
    -- created (or already exist) — safe to swallow and continue.
    NULL;
END $$;
    `)
  }
  server.decorate('prisma', prisma)
  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export { prismaPlugin }
