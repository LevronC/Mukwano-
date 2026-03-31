import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, env } from 'prisma/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(__dirname, 'packages/api/.env') })

export default defineConfig({
  schema: 'packages/api/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL')
  }
})
