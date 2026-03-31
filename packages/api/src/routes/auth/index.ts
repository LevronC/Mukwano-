import type { FastifyPluginAsync } from 'fastify'
import { signupRoute } from './signup.js'
import { loginRoute } from './login.js'
import { refreshRoute } from './refresh.js'
import { logoutRoute } from './logout.js'
import { meRoute } from './me.js'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(signupRoute)
  await fastify.register(loginRoute)
  await fastify.register(refreshRoute)
  await fastify.register(logoutRoute)
  await fastify.register(meRoute)
}
