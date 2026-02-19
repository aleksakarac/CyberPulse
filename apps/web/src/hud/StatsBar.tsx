'use client'

import { useAttackStore } from '@/lib/attackStore'

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export default function StatsBar() {
  const total24h = useAttackStore((s) => s.total24h)
  const total1h = useAttackStore((s) => s.total1h)
  const perSecond = useAttackStore((s) => s.perSecond)
  const connected = useAttackStore((s) => s.connected)

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3 bg-[rgba(5,10,18,0.8)] backdrop-blur-sm border-b border-cyan-900/30">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}
        />
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          {connected ? 'Live' : 'Simulated'}
        </span>
      </div>

      <div className="flex gap-8">
        <StatCounter label="24H" value={formatNumber(total24h)} />
        <StatCounter label="1H" value={formatNumber(total1h)} />
        <StatCounter label="/SEC" value={formatNumber(perSecond)} highlight />
      </div>

      <div className="text-xs text-gray-500 uppercase tracking-wider">
        CyberPulse
      </div>
    </div>
  )
}

function StatCounter({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-500 uppercase">{label}</span>
      <span
        className={`text-lg font-bold tabular-nums ${highlight ? 'text-cyan-400' : 'text-gray-200'}`}
      >
        {value}
      </span>
    </div>
  )
}
