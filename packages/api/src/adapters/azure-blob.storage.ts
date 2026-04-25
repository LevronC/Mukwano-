import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob'
import type { StorageAdapter } from '../plugins/demo-mode.js'

type UploadUrlInput = { fileKey: string; fileName: string; mimeType: string; sizeBytes: number }
type DownloadUrlInput = { fileKey: string }

const UPLOAD_TTL_S = 900  // 15 min
const DOWNLOAD_TTL_S = 300 // 5 min

export class AzureBlobStorageAdapter implements StorageAdapter {
  mode: 'remote' = 'remote'

  private readonly credential: StorageSharedKeyCredential
  private readonly accountName: string
  private readonly containerName: string

  constructor(accountName: string, accountKey: string, containerName: string) {
    this.accountName = accountName
    this.containerName = containerName
    this.credential = new StorageSharedKeyCredential(accountName, accountKey)
  }

  async createUploadUrl(input: UploadUrlInput): Promise<{ uploadUrl: string; expiresInSeconds: number }> {
    const expiresOn = new Date(Date.now() + UPLOAD_TTL_S * 1000)
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: input.fileKey,
        permissions: BlobSASPermissions.parse('cw'), // create + write
        expiresOn,
        contentType: input.mimeType,
        protocol: SASProtocol.Https,
      },
      this.credential
    )
    const uploadUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${encodeURIComponent(input.fileKey)}?${sas.toString()}`
    return { uploadUrl, expiresInSeconds: UPLOAD_TTL_S }
  }

  async createDownloadUrl(input: DownloadUrlInput): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
    const expiresOn = new Date(Date.now() + DOWNLOAD_TTL_S * 1000)
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: input.fileKey,
        permissions: BlobSASPermissions.parse('r'), // read only
        expiresOn,
        protocol: SASProtocol.Https,
      },
      this.credential
    )
    const downloadUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${encodeURIComponent(input.fileKey)}?${sas.toString()}`
    return { downloadUrl, expiresInSeconds: DOWNLOAD_TTL_S }
  }

  /** Ensures the container exists (call once at startup). */
  async ensureContainer(): Promise<void> {
    const client = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      this.credential
    )
    const container = client.getContainerClient(this.containerName)
    await container.createIfNotExists({ access: 'blob' })
  }
}
