import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

type UploadUrlInput = { fileKey: string; fileName: string; mimeType: string; sizeBytes: number }
type DownloadUrlInput = { fileKey: string }

interface EscrowAdapter {
  mode: 'demo' | 'live'
  creditContribution(args: { circleId: string; contributionId: string; amount: string }): Promise<void>
  debitProjectFunding(args: { circleId: string; projectId: string; amount: string }): Promise<void>
}

interface StorageAdapter {
  mode: 'local' | 'remote'
  createUploadUrl(input: UploadUrlInput): Promise<{ uploadUrl: string; expiresInSeconds: number }>
  createDownloadUrl(input: DownloadUrlInput): Promise<{ downloadUrl: string; expiresInSeconds: number }>
}

interface NotificationAdapter {
  mode: 'console' | 'provider'
  send(event: string, payload: Record<string, unknown>): Promise<void>
}

class DemoEscrowAdapter implements EscrowAdapter {
  mode: 'demo' = 'demo'

  async creditContribution(args: { circleId: string; contributionId: string; amount: string }) {
    // DEMO_MODE: no bank rails, only structured logging
    console.info('[DEMO_ESCROW] creditContribution', args)
  }

  async debitProjectFunding(args: { circleId: string; projectId: string; amount: string }) {
    // DEMO_MODE: no bank rails, only structured logging
    console.info('[DEMO_ESCROW] debitProjectFunding', args)
  }
}

class LiveEscrowAdapter implements EscrowAdapter {
  mode: 'live' = 'live'

  async creditContribution(_args: { circleId: string; contributionId: string; amount: string }) {
    // Placeholder: integrate real rail provider in production rollout
  }

  async debitProjectFunding(_args: { circleId: string; projectId: string; amount: string }) {
    // Placeholder: integrate real rail provider in production rollout
  }
}

class LocalStorageAdapter implements StorageAdapter {
  mode: 'local' = 'local'

  async createUploadUrl(input: UploadUrlInput) {
    return {
      uploadUrl: `http://localhost:4000/local-uploads/${encodeURIComponent(input.fileKey)}`,
      expiresInSeconds: 900
    }
  }

  async createDownloadUrl(input: DownloadUrlInput) {
    return {
      downloadUrl: `http://localhost:4000/local-uploads/${encodeURIComponent(input.fileKey)}`,
      expiresInSeconds: 300
    }
  }
}

class RemoteStorageAdapter implements StorageAdapter {
  mode: 'remote' = 'remote'

  async createUploadUrl(_input: UploadUrlInput) {
    return Promise.reject(new Error('Remote storage adapter is not configured'))
  }

  async createDownloadUrl(_input: DownloadUrlInput) {
    return Promise.reject(new Error('Remote storage adapter is not configured'))
  }
}

class ConsoleNotificationAdapter implements NotificationAdapter {
  mode: 'console' = 'console'

  async send(event: string, payload: Record<string, unknown>) {
    console.info('[DEMO_NOTIFICATION]', event, payload)
  }
}

class ProviderNotificationAdapter implements NotificationAdapter {
  mode: 'provider' = 'provider'

  async send(_event: string, _payload: Record<string, unknown>) {
    // Placeholder: provider integration deferred
  }
}

const demoModePlugin: FastifyPluginAsync = fp(async (server) => {
  const demoMode = server.config.DEMO_MODE === 'true'
  const escrowAdapter: EscrowAdapter = demoMode ? new DemoEscrowAdapter() : new LiveEscrowAdapter()
  const storageAdapter: StorageAdapter = demoMode ? new LocalStorageAdapter() : new RemoteStorageAdapter()
  const notificationAdapter: NotificationAdapter = demoMode
    ? new ConsoleNotificationAdapter()
    : new ProviderNotificationAdapter()

  server.decorate('demoMode', demoMode)
  server.decorate('escrowAdapter', escrowAdapter)
  server.decorate('storageAdapter', storageAdapter)
  server.decorate('notificationAdapter', notificationAdapter)
})

export { demoModePlugin }
export type { EscrowAdapter, StorageAdapter, NotificationAdapter }
