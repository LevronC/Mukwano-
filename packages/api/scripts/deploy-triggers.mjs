/**
 * Runs once per Vercel deployment (via buildCommand) to install the ledger
 * immutability triggers. Doing this at deploy time — not at Lambda cold-start
 * time — eliminates the "tuple concurrently updated" (XX000) race that occurs
 * when multiple serverless instances simultaneously try to run the same DDL
 * against PostgreSQL system catalog rows.
 *
 * Uses CREATE OR REPLACE TRIGGER (PostgreSQL 14+, Neon uses PG 16) to make
 * the operation fully idempotent with no TOCTOU window.
 */

import pg from 'pg'

const { DATABASE_URL } = process.env
if (!DATABASE_URL) {
  console.log('deploy-triggers: DATABASE_URL not set, skipping.')
  process.exit(0)
}

/** Match packages/api/src/plugins/prisma.ts — avoid TLS to hosts that do not support it. */
function resolvePgSsl(connectionString) {
  const explicit = process.env.DATABASE_SSL?.toLowerCase()
  if (explicit === 'false' || explicit === '0') return false
  if (explicit === 'true' || explicit === '1') return { rejectUnauthorized: true }

  let sslmode = null
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

  const localDevHosts = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'host.docker.internal', 'db'])
  if (hostname && localDevHosts.has(hostname.toLowerCase())) {
    return false
  }

  return { rejectUnauthorized: true }
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: resolvePgSsl(DATABASE_URL),
  connectionTimeoutMillis: 10000,
})
await client.connect()

try {
  const { rows } = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_entries'
  `)

  if (rows.length === 0) {
    console.log('deploy-triggers: ledger_entries table not found, skipping.')
    await client.end()
    process.exit(0)
  }

  await client.query(`
    CREATE OR REPLACE FUNCTION prevent_ledger_entries_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'ledger_entries is append-only';
    END;
    $$ LANGUAGE plpgsql;
  `)

  // CREATE OR REPLACE TRIGGER is idempotent — no IF NOT EXISTS race.
  await client.query(`
    CREATE OR REPLACE TRIGGER trg_prevent_ledger_entries_update
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entries_mutation();
  `)

  await client.query(`
    CREATE OR REPLACE TRIGGER trg_prevent_ledger_entries_delete
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entries_mutation();
  `)

  console.log('deploy-triggers: ledger immutability triggers installed.')
} finally {
  await client.end()
}
