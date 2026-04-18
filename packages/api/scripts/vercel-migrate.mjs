/**
 * Vercel build: Prisma `migrate deploy` fails with P3005 on Neon when the DB
 * already has tables but no `_prisma_migrations` history (common for pre-Migrate
 * databases). We apply the idempotent email-verification SQL, then mark that
 * migration applied so future `migrate deploy` runs work normally.
 *
 * Also: `migrate deploy` must use a direct (non-pooler) Postgres URL. PgBouncer/
 * Neon pooler connections cannot hold `pg_advisory_lock` (P1002 / timeout).
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiRoot = join(__dirname, '..')
const emailMigrationDir = '20260411120000_add_email_verification'
const emailMigrationSql = join(apiRoot, 'prisma/migrations', emailMigrationDir, 'migration.sql')

/**
 * Prefer explicit direct URLs (Vercel/Neon/Prisma). Poolers break advisory locks.
 * @see https://www.prisma.io/docs/orm/prisma-migrate/workflows/troubleshooting#migration-engine-times-out-on-postgresql
 */
function resolveMigrateDatabaseUrl() {
  const keys = [
    'PRISMA_MIGRATE_DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'DIRECT_URL',
    'POSTGRES_URL_NON_POOLING'
  ]
  for (const k of keys) {
    const v = process.env[k]?.trim()
    if (v) {
      console.log(`[vercel-migrate] Using ${k} for Prisma CLI (session / advisory locks)`)
      return v
    }
  }

  const pooled = process.env.DATABASE_URL?.trim() ?? ''
  if (!pooled) return ''

  // Neon: pooler host contains `-pooler`; direct host drops that segment.
  try {
    const u = new URL(pooled)
    if (u.hostname.includes('-pooler')) {
      const direct = new URL(pooled)
      direct.hostname = u.hostname.replace(/-pooler/g, '')
      console.log('[vercel-migrate] Derived direct Neon URL from DATABASE_URL (drop -pooler in host)')
      return direct.toString()
    }
  } catch {
    /* ignore */
  }

  return pooled
}

const migrateDatabaseUrl = resolveMigrateDatabaseUrl()
const prismaMigrateEnv = { ...process.env, DATABASE_URL: migrateDatabaseUrl }

function run(name, args, inherit = false) {
  const r = spawnSync(name, args, {
    cwd: apiRoot,
    env: prismaMigrateEnv,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe']
  })
  if (r.status !== 0) {
    const err = new Error(`${name} ${args.join(' ')} exited ${r.status}`)
    err.stdout = r.stdout
    err.stderr = r.stderr
    err.status = r.status
    throw err
  }
  return r
}

if (!process.env.DATABASE_URL?.trim()) {
  console.log('[vercel-migrate] DATABASE_URL unset; skipping migrations')
  process.exit(0)
}

let deployOut = ''
let deployErr = ''
try {
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: prismaMigrateEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  if (r.status === 0) {
    process.stdout.write(r.stdout || '')
    process.stderr.write(r.stderr || '')
    process.exit(0)
  }
  deployOut = r.stdout || ''
  deployErr = r.stderr || ''
  process.stdout.write(deployOut)
  process.stderr.write(deployErr)
} catch (e) {
  console.error(e)
  process.exit(1)
}

const combined = `${deployOut}\n${deployErr}`
const isBaselineNeeded = combined.includes('P3005') || combined.includes('not empty')

if (!isBaselineNeeded) {
  console.error('[vercel-migrate] migrate deploy failed (not a P3005 baseline case)')
  process.exit(1)
}

console.log(
  '\n[vercel-migrate] P3005: existing non-empty DB without migration history. Applying idempotent SQL + migrate resolve...\n'
)

try {
  run('npx', ['prisma', 'db', 'execute', '--file', emailMigrationSql], true)
  run('npx', ['prisma', 'migrate', 'resolve', '--applied', emailMigrationDir], true)
  run('npx', ['prisma', 'migrate', 'deploy'], true)
} catch (e) {
  console.error('[vercel-migrate] baseline path failed:', e.stderr || e.message || e)
  process.exit(e.status ?? 1)
}

console.log('[vercel-migrate] baseline complete')
process.exit(0)
