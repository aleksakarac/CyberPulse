'use client'

import { useEffect, useRef } from 'react'
import { useAttackStore } from '@/lib/attackStore'
import { generateAttack } from '@/lib/mockAttacks'

/**
 * If the WebSocket is not connected after 3 seconds,
 * start generating mock data client-side so the visualization still works.
 */
export function useFallbackMockData() {
  const connected = useAttackStore((s) => s.connected)
  const addAttacks = useAttackStore((s) => s.addAttacks)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fallbackActiveRef = useRef(false)

  useEffect(() => {
    if (connected) {
      // Server connected — stop mock data
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
        fallbackActiveRef.current = false
      }
      return
    }

    // Wait 3 seconds before starting fallback
    const timeout = setTimeout(() => {
      if (fallbackActiveRef.current) return
      fallbackActiveRef.current = true

      timerRef.current = setInterval(() => {
        const count = Math.random() < 0.1 ? Math.floor(Math.random() * 8) + 3 : Math.floor(Math.random() * 3) + 1
        const attacks = Array.from({ length: count }, () => generateAttack())
        addAttacks(attacks)
      }, 400)
    }, 3000)

    return () => {
      clearTimeout(timeout)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      fallbackActiveRef.current = false
    }
  }, [connected, addAttacks])
}
