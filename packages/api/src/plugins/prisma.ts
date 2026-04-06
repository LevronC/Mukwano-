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
    await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ledger_entries') THEN
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
END $$;
    `)
  }
  server.decorate('prisma', prisma)
  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export { prismaPlugin }
