import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticPlugin from '@fastify/static'
import { fileURLToPath } from 'url'
import path from 'path'
import { existsSync } from 'fs'
import { registerRoutes } from './routes/index.js'
import { startCronJobs } from './services/cron-jobs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const fastify = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  bodyLimit: 30 * 1024 * 1024,
})

// In production, frontend is served from ./public — CORS only needed in dev
const isDev = process.env.NODE_ENV !== 'production'
await fastify.register(cors, {
  origin: isDev ? (process.env.FRONTEND_URL || 'http://localhost:5173') : false,
  credentials: true,
})

await fastify.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },
})

fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

// ── Serve built frontend in production ────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public')
if (existsSync(publicDir)) {
  await fastify.register(staticPlugin, { root: publicDir, prefix: '/' })
  // SPA catch-all: any non-API route returns index.html
  fastify.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/api')) {
      return reply.sendFile('index.html')
    }
    reply.status(404).send({ success: false, error: 'Not found' })
  })
}

await registerRoutes(fastify)

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)
  const statusCode = error.statusCode || 500
  reply.status(statusCode).send({
    success: false,
    error: error.message || 'Internal Server Error',
    code: error.code || 'INTERNAL_ERROR',
  })
})

const PORT = parseInt(process.env.PORT || '3001', 10)
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`SOM ERP Backend running on port ${PORT}`)

  // Start cron jobs after server is up
  startCronJobs(fastify)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
