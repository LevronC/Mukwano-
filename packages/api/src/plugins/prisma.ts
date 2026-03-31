import fp from 'fastify-plugin'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import type { FastifyPluginAsync } from 'fastify'

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const adapter = new PrismaPg(server.config.DATABASE_URL)
  const prisma = new PrismaClient({ adapter })

  await prisma.$connect()
  server.decorate('prisma', prisma)
  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect()
  })
})

export { prismaPlugin }
