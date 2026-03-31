import type { PrismaClient } from '@prisma/client'
import type { JWT } from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    config: {
      DATABASE_URL: string
      JWT_SECRET: string
      REFRESH_TOKEN_SECRET: string
      DEMO_MODE: string
      PORT: number
      CORS_ORIGIN: string
    }
    accessJwt: JWT
    refreshJwt: JWT
  }
  interface FastifyRequest {
    user: {
      id: string
      email: string
      isGlobalAdmin: boolean
    }
    accessJwtVerify: <T = unknown>() => Promise<T>
    refreshJwtVerify: <T = unknown>() => Promise<T>
  }
  interface FastifyReply {
    accessJwtSign: (payload: object) => Promise<string>
    refreshJwtSign: (payload: object) => Promise<string>
  }
}
