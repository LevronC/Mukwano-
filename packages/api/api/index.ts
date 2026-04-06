/**
 * Vercel serverless entry point for the Mukwano API.
 *
 * Vercel functions do not run persistent HTTP servers — instead they receive
 * raw Node.js IncomingMessage / ServerResponse objects.  We build the Fastify
 * app once (per container warm instance) and forward every inbound request to
 * Fastify's underlying Node.js http.Server via the 'request' event.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'

let cachedApp: FastifyInstance | undefined

async function getApp(): Promise<FastifyInstance> {
  if (!cachedApp) {
    cachedApp = await buildApp()
    await cachedApp.ready()
  }
  return cachedApp
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const app = await getApp()
  app.server.emit('request', req, res)
}
