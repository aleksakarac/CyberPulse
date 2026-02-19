'use client'

import { useAttackStore } from '@/lib/attackStore'
import { ATTACK_COLORS, ATTACK_LABELS, type AttackEvent } from '@cyberpulse/shared'

function countryFlag(code: string): string {
  if (code.length !== 2) return ''
  const offset = 127397
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => c.charCodeAt(0) + offset)
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function TickerItem({ event }: { event: AttackEvent }) {
  const color = ATTACK_COLORS[event.type]

  return (
    <div className="flex items-center gap-2 text-xs whitespace-nowrap px-3 py-1">
      <span className="text-gray-500">{formatTime(event.timestamp)}</span>
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-400">{countryFlag(event.sourceCountry)}</span>
      <span className="text-gray-500">{event.sourceCountry}</span>
      <span className="text-gray-600">→</span>
      <span className="text-gray-400">{countryFlag(event.targetCountry)}</span>
      <span className="text-gray-500">{event.targetCountry}</span>
      <span style={{ color }} className="font-medium">
        {ATTACK_LABELS[event.type]}
      </span>
      <span className="text-gray-600">:{event.port}</span>
    </div>
  )
}

export default function EventTicker() {
  const tickerEvents = useAttackStore((s) => s.tickerEvents)

  return (
    <div className="absolute bottom-10 left-0 right-0 z-10 overflow-hidden bg-[rgba(5,10,18,0.6)] border-t border-cyan-900/20">
      <div className="flex overflow-x-hidden">
        <div className="flex animate-scroll">
          {tickerEvents.map((event) => (
            <TickerItem key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  )
}
