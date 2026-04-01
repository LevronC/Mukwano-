import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const credPath = path.join(__dirname, '.e2e-credentials.json')

export default async function globalSetup(): Promise<void> {
  const apiBase = process.env.E2E_API_URL ?? 'http://localhost:4000'
  const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@mukwano.test`
  const password = 'E2e_password_123'

  const res = await fetch(`${apiBase}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: 'E2E User'
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`E2E globalSetup signup failed ${res.status}: ${body}`)
  }

  writeFileSync(credPath, JSON.stringify({ email, password }, null, 0), 'utf8')
}
