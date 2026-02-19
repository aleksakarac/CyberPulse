import type { WebSocket } from 'ws'
import type { AttackEvent, WsMessage } from '@cyberpulse/shared'

const clients = new Set<WebSocket>()

export function addClient(socket: WebSocket) {
  clients.add(socket)
  socket.on('close', () => clients.delete(socket))
}

export function broadcast(message: WsMessage) {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data)
    }
  }
}

export function broadcastAttacks(events: AttackEvent[]) {
  if (events.length === 1) {
    broadcast({ type: 'attack', data: events[0] })
  } else {
    broadcast({ type: 'batch', data: events })
  }
}

export function getClientCount(): number {
  return clients.size
}
