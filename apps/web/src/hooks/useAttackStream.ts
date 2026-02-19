'use client'

import { useEffect, useRef } from 'react'
import type { WsMessage, AttackEvent } from '@cyberpulse/shared'
import { useAttackStore } from '@/lib/attackStore'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws'
const RECONNECT_BASE_DELAY = 1000
const RECONNECT_MAX_DELAY = 30000

export function useAttackStream() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const addAttacks = useAttackStore((s) => s.addAttacks)
  const setConnected = useAttackStore((s) => s.setConnected)

  useEffect(() => {
    let unmounted = false
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      if (unmounted) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptRef.current = 0
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data)
          if (msg.type === 'attack') {
            addAttacks([msg.data as AttackEvent])
          } else if (msg.type === 'batch') {
            addAttacks(msg.data as AttackEvent[])
          }
        } catch {
          // Invalid message, ignore
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!unmounted) {
          const delay = Math.min(
            RECONNECT_BASE_DELAY * 2 ** reconnectAttemptRef.current,
            RECONNECT_MAX_DELAY
          )
          reconnectAttemptRef.current++
          reconnectTimer = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      unmounted = true
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [addAttacks, setConnected])
}
