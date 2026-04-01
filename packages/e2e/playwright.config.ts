import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoPackages = path.resolve(__dirname, '..')
const apiDir = path.join(repoPackages, 'api')
const webDir = path.join(repoPackages, 'web')

const defaultJwt = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-min-32-chars!!!!'
const defaultRefresh =
  process.env.REFRESH_TOKEN_SECRET ?? 'local-dev-refresh-secret-min-32-ch!!'

export default defineConfig({
  testDir: './tests',
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_SKIP_SERVERS
    ? undefined
    : [
        {
          command: 'node dist/server.js',
          cwd: apiDir,
          url: 'http://localhost:4000/',
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            NODE_ENV: 'test',
            PORT: '4000',
            JWT_SECRET: process.env.JWT_SECRET ?? defaultJwt,
            REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ?? defaultRefresh,
            CORS_ORIGIN: 'http://localhost:5173'
          }
        },
        {
          command: 'npx vite preview --host localhost --port 5173 --strictPort',
          cwd: webDir,
          url: 'http://localhost:5173/',
          timeout: 120_000,
          reuseExistingServer: !process.env.CI
        }
      ]
})
