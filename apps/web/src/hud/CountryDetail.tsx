'use client'

import { ATTACK_COLORS, ATTACK_LABELS, type AttackType } from '@cyberpulse/shared'
import { useAttackStore } from '@/lib/attackStore'

const COUNTRY_NAMES: Record<string, string> = {
  CN: 'China', RU: 'Russia', US: 'United States', BR: 'Brazil',
  IN: 'India', DE: 'Germany', GB: 'United Kingdom', JP: 'Japan',
  FR: 'France', KR: 'South Korea', NL: 'Netherlands', UA: 'Ukraine',
  IR: 'Iran', VN: 'Vietnam', AU: 'Australia', CA: 'Canada',
  SG: 'Singapore', ZA: 'South Africa', AR: 'Argentina', NG: 'Nigeria',
}

function countryFlag(code: string): string {
  if (code.length !== 2) return ''
  const offset = 127397
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => c.charCodeAt(0) + offset)
  )
}

export default function CountryDetail() {
  const selectedCountry = useAttackStore((s) => s.selectedCountry)
  const setSelectedCountry = useAttackStore((s) => s.setSelectedCountry)
  const tickerEvents = useAttackStore((s) => s.tickerEvents)

  if (!selectedCountry) return null

  const name = COUNTRY_NAMES[selectedCountry] || selectedCountry

  // Compute stats for selected country
  const incoming = tickerEvents.filter((e) => e.targetCountry === selectedCountry)
  const outgoing = tickerEvents.filter((e) => e.sourceCountry === selectedCountry)

  const typeCounts: Record<AttackType, number> = {
    brute_force: 0, ddos: 0, malware: 0, scanning: 0, phishing: 0,
  }
  for (const e of [...incoming, ...outgoing]) {
    typeCounts[e.type]++
  }

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-80 bg-[rgba(5,10,18,0.9)] backdrop-blur-md border border-cyan-900/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{countryFlag(selectedCountry)}</span>
          <div>
            <h2 className="text-sm font-bold text-gray-200">{name}</h2>
            <span className="text-xs text-gray-500">{selectedCountry}</span>
          </div>
        </div>
        <button
          onClick={() => setSelectedCountry(null)}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-500">Incoming</div>
          <div className="text-lg font-bold text-red-400">{incoming.length}</div>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-500">Outgoing</div>
          <div className="text-lg font-bold text-orange-400">{outgoing.length}</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-gray-500 uppercase mb-1">Attack Types</div>
        {(Object.entries(typeCounts) as [AttackType, number][])
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ATTACK_COLORS[type] }}
              />
              <span className="text-gray-300">{ATTACK_LABELS[type]}</span>
              <span className="text-gray-500 ml-auto tabular-nums">{count}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
