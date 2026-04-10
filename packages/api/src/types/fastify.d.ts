import type { PrismaClient } from '@prisma/client'
import type { JWT } from '@fastify/jwt'
import type { EscrowAdapter, StorageAdapter, NotificationAdapter } from '../plugins/demo-mode.js'
import type { NotificationService } from '../services/notification.service.js'

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
    jwt: {
      access: JWT
      refresh: JWT
    }
    demoMode: boolean
    escrowAdapter: EscrowAdapter
    storageAdapter: StorageAdapter
    notificationAdapter: NotificationAdapter
    notificationService: NotificationService
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
