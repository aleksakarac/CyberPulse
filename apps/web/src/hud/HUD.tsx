'use client'

import { useEffect } from 'react'
import StatsBar from './StatsBar'
import { AttackerRank, TargetRank } from './CountryRank'
import EventTicker from './EventTicker'
import Legend from './Legend'
import { useAttackStore } from '@/lib/attackStore'
import type { CountryCount } from '@cyberpulse/shared'

export default function HUD() {
  // Compute rankings from ticker events every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useAttackStore.getState()
      const events = store.tickerEvents

      // Count by source country
      const srcMap = new Map<string, number>()
      const tgtMap = new Map<string, number>()
      for (const e of events) {
        srcMap.set(e.sourceCountry, (srcMap.get(e.sourceCountry) || 0) + 1)
        tgtMap.set(e.targetCountry, (tgtMap.get(e.targetCountry) || 0) + 1)
      }

      const toSorted = (map: Map<string, number>): CountryCount[] =>
        Array.from(map.entries())
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

      store.setStats({
        total24h: store.total24h,
        total1h: store.total1h,
        perSecond: store.perSecond,
        topSources: toSorted(srcMap),
        topTargets: toSorted(tgtMap),
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Reset per-second counter every second
  useEffect(() => {
    const interval = setInterval(() => {
      // We approximate by decaying the counter
      const store = useAttackStore.getState()
      useAttackStore.setState({ perSecond: Math.floor(store.perSecond * 0.5) })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-20 [&_*]:pointer-events-auto">
      <StatsBar />
      <AttackerRank />
      <TargetRank />
      <EventTicker />
      <Legend />
    </div>
  )
}
