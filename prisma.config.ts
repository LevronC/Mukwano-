import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, env } from 'prisma/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Only load .env file in local development (Railway uses environment variables)
if (!process.env.RAILWAY_ENVIRONMENT) {
  loadEnv({ path: resolve(__dirname, 'packages/api/.env') })
}

export default defineConfig({
  schema: 'packages/api/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL')
  }
})
