import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import type { FastifyPluginAsync } from 'fastify'

const helmetPlugin: FastifyPluginAsync = fp(async (server) => {
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    // HSTS: 1 year, include subdomains, preload-ready
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    // Deny framing entirely (fintech — no embedding)
    frameguard: { action: 'deny' },
    // Prevent MIME-type sniffing
    noSniff: true,
    // Hide X-Powered-By (Fastify does this by default, but explicit)
    hidePoweredBy: true,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
})

export { helmetPlugin }
