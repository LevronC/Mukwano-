import fp from 'fastify-plugin'
import sanitize from 'sanitize-html'

const TEXT_ONLY: sanitize.IOptions = { allowedTags: [], allowedAttributes: {} }

function sanitizeValue(val: unknown): unknown {
  if (typeof val === 'string') return sanitize(val, TEXT_ONLY)
  if (Array.isArray(val)) return val.map(sanitizeValue)
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, sanitizeValue(v)])
    )
  }
  return val
}

export const sanitizeInputPlugin = fp(async (app) => {
  app.addHook('preValidation', async (request) => {
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeValue(request.body) as typeof request.body
    }
  })
})
