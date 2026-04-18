/**
 * Vercel build: Prisma `migrate deploy` fails with P3005 on Neon when the DB
 * already has tables but no `_prisma_migrations` history (common for pre-Migrate
 * databases). We apply the idempotent email-verification SQL, then mark that
 * migration applied so future `migrate deploy` runs work normally.
 *
 * Also:
 * - `migrate deploy` should use a direct (non-pooler) Postgres URL for sessions.
 * - Neon / some hosts still hit P1002 (advisory lock timeout) even with a direct
 *   URL. Prisma supports `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` for migrate
 *   when only one deploy runs migrations at a time (see Prisma docs).
 * - Strip `pgbouncer` query params and extend `connect_timeout` for cold starts.
 */
import { execSync, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiRoot = join(__dirname, '..')
const emailMigrationDir = '20260411120000_add_email_verification'
const emailMigrationSql = join(apiRoot, 'prisma/migrations', emailMigrationDir, 'migration.sql')

/**
 * Prefer explicit direct URLs (Vercel/Neon/Prisma). Poolers break advisory locks.
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

/** Remove pooler-related params; give Neon time to wake on first connect. */
function sanitizeMigrateUrl(raw) {
  if (!raw) return raw
  try {
    const u = new URL(raw)
    for (const k of ['pgbouncer', 'pooler']) {
      u.searchParams.delete(k)
    }
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '60')
    }
    return u.toString()
  } catch {
    return raw
  }
}

function sleepSync(seconds) {
  try {
    execSync(`sleep ${seconds}`, { stdio: 'ignore' })
  } catch {
    /* ignore */
  }
}

const migrateDatabaseUrl = sanitizeMigrateUrl(resolveMigrateDatabaseUrl())

/** Inherit env; force DATABASE_URL for Prisma CLI. */
const prismaMigrateEnv = { ...process.env, DATABASE_URL: migrateDatabaseUrl }

/**
 * Default ON for this script only: avoids P1002 advisory lock timeouts on Neon.
 * Set `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=0` in Vercel to re-enable locking.
 * Do not run two production migrate deploys concurrently either way.
 */
const lockExplicit = process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK
if (lockExplicit !== '0' && lockExplicit !== 'false') {
  prismaMigrateEnv.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = '1'
  console.log(
    '[vercel-migrate] PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 for Prisma CLI (avoids P1002 advisory lock timeout on Neon; run one migrate at a time)'
  )
}

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

function migrateDeployOnce() {
  return spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: prismaMigrateEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

if (!process.env.DATABASE_URL?.trim()) {
  console.log('[vercel-migrate] DATABASE_URL unset; skipping migrations')
  process.exit(0)
}

let deployOut = ''
let deployErr = ''
try {
  const maxAttempts = 3
  let last = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      console.log(`[vercel-migrate] retry migrate deploy (${attempt}/${maxAttempts}) after 20s…`)
      sleepSync(20)
    }
    last = migrateDeployOnce()
    if (last.status === 0) {
      process.stdout.write(last.stdout || '')
      process.stderr.write(last.stderr || '')
      process.exit(0)
    }
    deployOut = last.stdout || ''
    deployErr = last.stderr || ''
    process.stdout.write(deployOut)
    process.stderr.write(deployErr)
    const combined = `${deployOut}\n${deployErr}`
    const isRetryable = combined.includes('P1002') || combined.includes('advisory lock')
    if (!isRetryable || attempt === maxAttempts) break
  }
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
