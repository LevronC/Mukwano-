import fp from 'fastify-plugin'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000,
  })
  const adapter = new PrismaPg(pool)
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
  }
  // No else — triggers are deployed once by scripts/deploy-triggers.mjs at build time.
  // No DDL at Lambda runtime = no catalog lock = no lock wait = no plugin timeout.

  server.decorate('prisma', prisma)
  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export { prismaPlugin }
