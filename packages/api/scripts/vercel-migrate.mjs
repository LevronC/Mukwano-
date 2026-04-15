/**
 * Vercel build: Prisma `migrate deploy` fails with P3005 on Neon when the DB
 * already has tables but no `_prisma_migrations` history (common for pre-Migrate
 * databases). We apply the idempotent email-verification SQL, then mark that
 * migration applied so future `migrate deploy` runs work normally.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiRoot = join(__dirname, '..')
const emailMigrationDir = '20260411120000_add_email_verification'
const emailMigrationSql = join(apiRoot, 'prisma/migrations', emailMigrationDir, 'migration.sql')

function run(name, args, inherit = false) {
  const r = spawnSync(name, args, {
    cwd: apiRoot,
    env: process.env,
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
    env: process.env,
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
