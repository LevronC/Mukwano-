/**
 * Vercel serverless packages the API with Root Directory = packages/api.
 * npm workspaces often hoist Prisma output to repo root node_modules/.prisma,
 * so includeFiles "node_modules/.prisma/**" would miss and can fail the build.
 * After `prisma generate`, copy the generated client next to this package if needed.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiRoot = join(__dirname, '..')
const rootPrisma = join(apiRoot, '..', '..', 'node_modules', '.prisma')
const localPrisma = join(apiRoot, 'node_modules', '.prisma')

if (existsSync(localPrisma)) {
  console.log('[vercel-prisma-bundle] packages/api/node_modules/.prisma already present')
  process.exit(0)
}

if (!existsSync(rootPrisma)) {
  console.error('[vercel-prisma-bundle] No generated Prisma client at repo root or package — run prisma generate first')
  process.exit(1)
}

mkdirSync(join(apiRoot, 'node_modules'), { recursive: true })
cpSync(rootPrisma, localPrisma, { recursive: true })
console.log('[vercel-prisma-bundle] Copied .prisma into packages/api for serverless bundle')
