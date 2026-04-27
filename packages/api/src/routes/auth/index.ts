import type { FastifyPluginAsync } from 'fastify'
import { signupRoute } from './signup.js'
import { loginRoute } from './login.js'
import { refreshRoute } from './refresh.js'
import { logoutRoute } from './logout.js'
import { meRoute } from './me.js'
import { verifyEmailRoute } from './verify-email.js'
import { forgotPasswordRoute } from './forgot-password.js'
import { totpRoute } from './totp.js'
import { stepUpRoute } from './step-up.js'
import { devVerifyRoute } from './dev-verify.js'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(devVerifyRoute)
  await fastify.register(signupRoute)
  await fastify.register(loginRoute)
  await fastify.register(refreshRoute)
  await fastify.register(logoutRoute)
  await fastify.register(verifyEmailRoute)
  await fastify.register(forgotPasswordRoute)
  await fastify.register(meRoute)
  await fastify.register(totpRoute)
  await fastify.register(stepUpRoute)
}
