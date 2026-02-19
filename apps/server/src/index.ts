import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import type { AttackEvent } from '@cyberpulse/shared'

const PORT = Number(process.env.PORT) || 3001

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })
await app.register(websocket)

app.get('/health', async () => ({ status: 'ok' }))

app.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket) => {
    app.log.info('Client connected')
    socket.on('close', () => app.log.info('Client disconnected'))
  })
})

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`Server running on http://localhost:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
