import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initApiSentry } from './lib/observability/sentry.js'
import { buildApp } from './app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env') })
initApiSentry()

const app = await buildApp()
const port = Number(app.config.PORT ?? 4000)

await app.listen({ port, host: '0.0.0.0' })
app.log.info(`Mukwano API listening on port ${port}`)
