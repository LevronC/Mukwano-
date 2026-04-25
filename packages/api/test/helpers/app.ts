import { buildApp } from '../../src/app.js'
import type { FastifyInstance } from 'fastify'

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp()
  await app.ready()
  return app
}

export function injectHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` }
}

/** Fresh access/refresh after DB changes to user (e.g. global admin). */
export async function loginUser(
  app: FastifyInstance,
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password }
  })
  if (login.statusCode !== 200) {
    throw new Error(`login failed: ${login.statusCode} ${login.body}`)
  }
  const body = login.json() as { accessToken: string; refreshToken: string }
  return { accessToken: body.accessToken, refreshToken: body.refreshToken }
}

/**
 * Production signup leaves `emailVerified` false; routes using `requireEmailVerified`
 * read `emailVerified` from the JWT (not the DB). Mark verified in DB and re-login.
 */
export async function signupWithVerifiedEmail(
  app: FastifyInstance,
  email: string,
  password: string,
  displayName: string
): Promise<{ accessToken: string; userId: string }> {
  const signup = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email, password, displayName }
  })
  if (signup.statusCode !== 201) {
    throw new Error(`signup failed: ${signup.statusCode} ${signup.body}`)
  }
  const { user } = signup.json() as { user: { id: string } }
  await app.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
  const { accessToken } = await loginUser(app, email, password)
  return { accessToken, userId: user.id }
}
