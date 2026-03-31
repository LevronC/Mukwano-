import { buildApp } from './app.js'

const app = await buildApp()
const port = Number(app.config.PORT ?? 4000)

await app.listen({ port, host: '0.0.0.0' })
app.log.info(`Mukwano API listening on port ${port}`)
