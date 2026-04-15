/**
 * PgBouncer / Neon / Supabase *poolers* multiplex connections and break Prisma
 * Migrate's session-level advisory lock (`pg_advisory_lock`), causing P1002 timeouts.
 * Use a direct Postgres URL for `prisma migrate` / `prisma db execute`.
 *
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#direct-connection-for-migrations
 */

const ORDER = [
  ['PRISMA_MIGRATE_DATABASE_URL', () => process.env.PRISMA_MIGRATE_DATABASE_URL],
  ['DATABASE_URL_UNPOOLED', () => process.env.DATABASE_URL_UNPOOLED],
  ['DIRECT_URL', () => process.env.DIRECT_URL],
  ['POSTGRES_URL_NON_POOLING', () => process.env.POSTGRES_URL_NON_POOLING],
  ['DATABASE_URL', () => process.env.DATABASE_URL],
]

/**
 * @returns {{ url: string, envKey: string | null }}
 */
export function resolveDatabaseUrlForMigrations() {
  for (const [envKey, get] of ORDER) {
    const v = get()?.trim()
    if (v) return { url: v, envKey }
  }
  return { url: '', envKey: null }
}

export function looksLikePooledPostgresUrl(url) {
  if (!url) return false
  const u = url.toLowerCase()
  return (
    u.includes('pgbouncer=true') ||
    u.includes('pooler.') ||
    u.includes('-pooler.') ||
    u.includes(':6543/') ||
    u.includes('6543?')
  )
}
