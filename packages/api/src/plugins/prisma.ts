import fp from 'fastify-plugin'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

/** What to pass to `pg` Pool `ssl` option (false = no TLS). */
type PgSslOption = false | { rejectUnauthorized: boolean } | undefined

/**
 * Picks TLS for `pg` without forcing SSL onto servers that do not support it
 * (typical local/Docker Postgres). Neon and other cloud URLs still use TLS.
 *
 * Override: `DATABASE_SSL=true` | `DATABASE_SSL=false`
 */
function resolvePgSsl(connectionString: string): PgSslOption {
  if (!connectionString) return undefined

  const override = process.env.DATABASE_SSL?.toLowerCase()
  if (override === 'false' || override === '0') return false
  if (override === 'true' || override === '1') return { rejectUnauthorized: true }

  let sslmode: string | null = null
  let hostname = ''
  try {
    const u = new URL(connectionString)
    hostname = u.hostname
    sslmode = u.searchParams.get('sslmode')?.toLowerCase() ?? null
  } catch {
    const m = connectionString.match(/[?&]sslmode=([^&]+)/i)
    sslmode = m ? m[1].toLowerCase() : null
  }

  if (sslmode === 'disable') return false
  if (sslmode === 'require' || sslmode === 'verify-full' || sslmode === 'verify-ca') {
    return { rejectUnauthorized: true }
  }

  const localDevHosts = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    'postgres',
    'host.docker.internal',
    'db'
  ])
  if (hostname && localDevHosts.has(hostname.toLowerCase())) {
    return false
  }

  return { rejectUnauthorized: true }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  // Pass PoolConfig (a plain object) so PrismaPg creates the pool internally
  // using its own pg instance. Importing pg directly causes a dual-package
  // mismatch: packages/api/node_modules/pg vs root node_modules/pg used by
  // @prisma/adapter-pg, which makes PrismaPg ignore the passed Pool and fall
  // back to localhost:5432.
  const dbUrl = process.env.DATABASE_URL ?? ''
  const ssl = resolvePgSsl(dbUrl)
  const adapter = new PrismaPg({
    connectionString: dbUrl,
    ssl,
    connectionTimeoutMillis: 5000,
  })
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
