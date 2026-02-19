import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let publisher: Redis | null = null
let subscriber: Redis | null = null

export const CHANNEL = 'cyberpulse:attacks'

export async function initRedis() {
  try {
    publisher = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    })
    subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    })

    // Test the connection
    await publisher.ping()
    console.log('Redis connected')
  } catch (err) {
    publisher?.disconnect()
    subscriber?.disconnect()
    publisher = null
    subscriber = null
    throw err
  }
}

export async function publish(channel: string, message: string) {
  if (!publisher) return
  try {
    await publisher.publish(channel, message)
  } catch {
    // Redis not available, skip silently
  }
}

export function getSubscriber() {
  return subscriber
}
