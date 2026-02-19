import { create } from 'zustand'
import type { AttackEvent, AttackType, CountryCount } from '@cyberpulse/shared'

const MAX_ATTACKS = 500
const MAX_TICKER_EVENTS = 50

interface AttackStore {
  attacks: AttackEvent[]
  tickerEvents: AttackEvent[]
  total24h: number
  total1h: number
  perSecond: number
  topSources: CountryCount[]
  topTargets: CountryCount[]
  activeFilters: Set<AttackType>
  connected: boolean

  addAttacks: (events: AttackEvent[]) => void
  setStats: (stats: {
    total24h: number
    total1h: number
    perSecond: number
    topSources: CountryCount[]
    topTargets: CountryCount[]
  }) => void
  toggleFilter: (type: AttackType) => void
  setConnected: (connected: boolean) => void
}

export const useAttackStore = create<AttackStore>((set) => ({
  attacks: [],
  tickerEvents: [],
  total24h: 0,
  total1h: 0,
  perSecond: 0,
  topSources: [],
  topTargets: [],
  activeFilters: new Set<AttackType>([
    'brute_force',
    'ddos',
    'malware',
    'scanning',
    'phishing',
  ]),
  connected: false,

  addAttacks: (events) => {
    set((state) => {
      const filtered = events.filter((e) => state.activeFilters.has(e.type))
      return {
        attacks: [...state.attacks, ...filtered].slice(-MAX_ATTACKS),
        tickerEvents: [...events, ...state.tickerEvents].slice(0, MAX_TICKER_EVENTS),
        perSecond: state.perSecond + events.length,
        total1h: state.total1h + events.length,
        total24h: state.total24h + events.length,
      }
    })
  },

  setStats: (stats) => {
    set(stats)
  },

  toggleFilter: (type) => {
    set((state) => {
      const next = new Set(state.activeFilters)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return { activeFilters: next }
    })
  },

  setConnected: (connected) => set({ connected }),
}))
