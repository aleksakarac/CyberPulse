'use client'

import { useAttackStore } from '@/lib/attackStore'
import type { CountryCount } from '@cyberpulse/shared'

// Country code to flag emoji
function countryFlag(code: string): string {
  if (code.length !== 2) return ''
  const offset = 127397
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => c.charCodeAt(0) + offset)
  )
}

function RankBar({ item, maxCount, rank }: { item: CountryCount; maxCount: number; rank: number }) {
  const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-4 text-right">{rank}</span>
      <span className="w-5 text-center">{countryFlag(item.country)}</span>
      <span className="text-gray-300 w-8 uppercase">{item.country}</span>
      <div className="flex-1 h-3 bg-gray-800/50 rounded-sm overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-sm transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-gray-400 w-12 text-right tabular-nums">
        {item.count.toLocaleString()}
      </span>
    </div>
  )
}

export function AttackerRank() {
  const topSources = useAttackStore((s) => s.topSources)
  const maxCount = topSources.length > 0 ? topSources[0].count : 0

  return (
    <div className="absolute top-14 left-4 z-10 w-56 bg-[rgba(5,10,18,0.8)] backdrop-blur-sm border border-cyan-900/20 rounded-lg p-3">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
        Top Attackers
      </h3>
      <div className="space-y-1.5">
        {topSources.slice(0, 10).map((item, i) => (
          <RankBar key={item.country} item={item} maxCount={maxCount} rank={i + 1} />
        ))}
        {topSources.length === 0 && (
          <p className="text-xs text-gray-600">Collecting data...</p>
        )}
      </div>
    </div>
  )
}

export function TargetRank() {
  const topTargets = useAttackStore((s) => s.topTargets)
  const maxCount = topTargets.length > 0 ? topTargets[0].count : 0

  return (
    <div className="absolute top-14 right-4 z-10 w-56 bg-[rgba(5,10,18,0.8)] backdrop-blur-sm border border-cyan-900/20 rounded-lg p-3">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
        Top Targets
      </h3>
      <div className="space-y-1.5">
        {topTargets.slice(0, 10).map((item, i) => (
          <RankBar key={item.country} item={item} maxCount={maxCount} rank={i + 1} />
        ))}
        {topTargets.length === 0 && (
          <p className="text-xs text-gray-600">Collecting data...</p>
        )}
      </div>
    </div>
  )
}
