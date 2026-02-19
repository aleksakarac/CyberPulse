'use client'

import { ATTACK_COLORS, ATTACK_LABELS, type AttackType } from '@cyberpulse/shared'
import { useAttackStore } from '@/lib/attackStore'

const ATTACK_TYPES: AttackType[] = [
  'brute_force',
  'ddos',
  'malware',
  'scanning',
  'phishing',
]

export default function Legend() {
  const activeFilters = useAttackStore((s) => s.activeFilters)
  const toggleFilter = useAttackStore((s) => s.toggleFilter)

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-4 py-2 bg-[rgba(5,10,18,0.8)] backdrop-blur-sm border border-cyan-900/20 rounded-lg">
      {ATTACK_TYPES.map((type) => {
        const active = activeFilters.has(type)
        return (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: ATTACK_COLORS[type] }}
            />
            <span className="text-gray-300">{ATTACK_LABELS[type]}</span>
          </button>
        )
      })}
    </div>
  )
}
