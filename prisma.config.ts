import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, env } from 'prisma/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Only load .env file in local development (Railway uses environment variables)
if (!process.env.RAILWAY_ENVIRONMENT) {
  loadEnv({ path: resolve(__dirname, 'packages/api/.env') })
}

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'

export default defineConfig({
  schema: 'packages/api/prisma/schema.prisma',
  datasource: {
    // Keep Prisma CLI commands (generate/migrate) from failing in CI environments
    // where DATABASE_URL isn't injected at build time.
    url: databaseUrl
  }
})
