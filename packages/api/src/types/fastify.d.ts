import type { PrismaClient } from '@prisma/client'
import type { JWT } from '@fastify/jwt'
import type { EscrowAdapter, StorageAdapter, NotificationAdapter, PaymentAdapter } from '../plugins/demo-mode.js'
import type { NotificationService } from '../services/notification.service.js'
import type { EmailService } from '../services/email.service.js'

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
      APP_URL: string
      RESEND_API_KEY: string
      RESEND_FROM: string
      AZURE_STORAGE_ACCOUNT_NAME: string
      AZURE_STORAGE_ACCOUNT_KEY: string
      AZURE_STORAGE_CONTAINER_NAME: string
      STRIPE_SECRET_KEY: string
      STRIPE_WEBHOOK_SECRET: string
      SENTRY_DSN: string
      SENTRY_ENVIRONMENT: string
      SENTRY_TRACES_SAMPLE_RATE: string
      QUEUE_DEPTH: string
      BACKUP_LAST_VERIFIED_ISO: string
    }
    jwt: {
      access: JWT
      refresh: JWT
    }
    demoMode: boolean
    escrowAdapter: EscrowAdapter
    storageAdapter: StorageAdapter
    notificationAdapter: NotificationAdapter
    paymentAdapter: PaymentAdapter
    notificationService: NotificationService
    emailService: EmailService
  }
  interface FastifyRequest {
    user: {
      id: string
      email: string
      isGlobalAdmin: boolean
      platformRole: string
      emailVerified?: boolean
      totpEnabled?: boolean
      stepUpAt?: number
    }
    idempotencyKey?: string
    accessJwtVerify: <T = unknown>() => Promise<T>
    refreshJwtVerify: <T = unknown>() => Promise<T>
  }
  interface FastifyReply {
    accessJwtSign: (payload: object) => Promise<string>
    refreshJwtSign: (payload: object) => Promise<string>
  }
}
