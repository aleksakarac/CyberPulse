import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import type { AttackEvent } from '@cyberpulse/shared'
import { addClient, broadcastAttacks } from './websocket.js'
import { startSimulator } from './ingest/simulator.js'
import { initDb } from './db/pool.js'
import { insertBatch, getHistory, getTopCountries, getTotalCount } from './db/queries.js'
import { initRedis, publish, CHANNEL } from './cache/redis.js'

const PORT = Number(process.env.PORT) || 3001

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })
await app.register(websocket)

// Health check
app.get('/health', async () => ({ status: 'ok' }))

// WebSocket endpoint
app.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket) => {
    app.log.info('Client connected')
    addClient(socket)
  })
})

// REST: historical attacks for time scrubber
app.get('/api/attacks/history', async (request) => {
  const { from, to } = request.query as { from?: string; to?: string }
  const fromTs = from ? Number(from) : Date.now() - 24 * 60 * 60 * 1000
  const toTs = to ? Number(to) : Date.now()
  return getHistory(fromTs, toTs)
})

// REST: stats
app.get('/api/stats', async () => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [total24h, total1h, topSources, topTargets] = await Promise.all([
    getTotalCount(oneDayAgo),
    getTotalCount(oneHourAgo),
    getTopCountries('source_country', oneHourAgo),
    getTopCountries('target_country', oneHourAgo),
  ])

  return {
    total24h,
    total1h,
    perSecond: Math.round(total1h / 3600),
    topSources,
    topTargets,
  }
})

// Buffer for batch DB inserts
let insertBuffer: AttackEvent[] = []
const BATCH_INSERT_INTERVAL = 5000

setInterval(async () => {
  if (insertBuffer.length === 0) return
  const batch = insertBuffer.splice(0, insertBuffer.length)
  await insertBatch(batch)
}, BATCH_INSERT_INTERVAL)

// Initialize services
let dbAvailable = false
let redisAvailable = false

try {
  await initDb()
  dbAvailable = true
} catch {
  app.log.warn('Database not available — running without persistence')
}

try {
  await initRedis()
  redisAvailable = true
} catch {
  app.log.warn('Redis not available — running without pub/sub')
}

// Start the attack simulator
const stopSimulator = startSimulator((events) => {
  // Broadcast to WebSocket clients
  broadcastAttacks(events)

  // Buffer for DB insertion
  if (dbAvailable) {
    insertBuffer.push(...events)
  }

  // Publish to Redis
  if (redisAvailable) {
    for (const event of events) {
      publish(CHANNEL, JSON.stringify(event))
    }
  }
})

// Start server
try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`Server running on http://localhost:${PORT}`)
  app.log.info(`DB: ${dbAvailable ? 'connected' : 'offline'}, Redis: ${redisAvailable ? 'connected' : 'offline'}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// Graceful shutdown
const shutdown = async () => {
  stopSimulator()
  await app.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
