import { randomUUID } from 'crypto'
import type { AttackEvent, AttackType } from '@cyberpulse/shared'

const COUNTRIES = [
  { code: 'CN', lat: 35.86, lon: 104.2, sw: 20, tw: 3 },
  { code: 'RU', lat: 61.52, lon: 105.32, sw: 15, tw: 4 },
  { code: 'US', lat: 37.09, lon: -95.71, sw: 10, tw: 25 },
  { code: 'BR', lat: -14.24, lon: -51.93, sw: 8, tw: 5 },
  { code: 'IN', lat: 20.59, lon: 78.96, sw: 7, tw: 4 },
  { code: 'DE', lat: 51.17, lon: 10.45, sw: 4, tw: 10 },
  { code: 'GB', lat: 55.38, lon: -3.44, sw: 3, tw: 8 },
  { code: 'JP', lat: 36.2, lon: 138.25, sw: 2, tw: 7 },
  { code: 'FR', lat: 46.23, lon: 2.21, sw: 3, tw: 6 },
  { code: 'KR', lat: 35.91, lon: 127.77, sw: 4, tw: 5 },
  { code: 'NL', lat: 52.13, lon: 5.29, sw: 3, tw: 5 },
  { code: 'UA', lat: 48.38, lon: 31.17, sw: 5, tw: 3 },
  { code: 'IR', lat: 32.43, lon: 53.69, sw: 4, tw: 2 },
  { code: 'VN', lat: 14.06, lon: 108.28, sw: 3, tw: 2 },
  { code: 'AU', lat: -25.27, lon: 133.78, sw: 2, tw: 4 },
  { code: 'CA', lat: 56.13, lon: -106.35, sw: 2, tw: 4 },
  { code: 'SG', lat: 1.35, lon: 103.82, sw: 2, tw: 3 },
  { code: 'ZA', lat: -30.56, lon: 22.94, sw: 2, tw: 2 },
  { code: 'AR', lat: -38.42, lon: -63.62, sw: 1, tw: 1 },
  { code: 'NG', lat: 9.08, lon: 8.68, sw: 3, tw: 1 },
]

const ATTACK_TYPES: { type: AttackType; weight: number }[] = [
  { type: 'brute_force', weight: 35 },
  { type: 'scanning', weight: 25 },
  { type: 'ddos', weight: 15 },
  { type: 'malware', weight: 15 },
  { type: 'phishing', weight: 10 },
]

const PORTS = [22, 80, 443, 3389, 8080, 25, 53, 445, 1433, 3306, 5432, 27017]
const PROTOCOLS = ['TCP', 'UDP', 'ICMP']

function weighted<T>(items: T[], wFn: (i: T) => number): T {
  const total = items.reduce((s, i) => s + wFn(i), 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= wFn(item)
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

function jitter(v: number, range = 2): number {
  return v + (Math.random() - 0.5) * range * 2
}

function randomIp(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}

export function generateAttack(overrideType?: AttackType): AttackEvent {
  const src = weighted(COUNTRIES, (c) => c.sw)
  let tgt = weighted(COUNTRIES, (c) => c.tw)
  while (tgt.code === src.code) tgt = weighted(COUNTRIES, (c) => c.tw)

  const atk = overrideType ?? weighted(ATTACK_TYPES, (a) => a.weight).type

  return {
    id: randomUUID(),
    sourceIp: randomIp(),
    targetIp: randomIp(),
    sourceLat: jitter(src.lat),
    sourceLon: jitter(src.lon),
    targetLat: jitter(tgt.lat),
    targetLon: jitter(tgt.lon),
    sourceCountry: src.code,
    targetCountry: tgt.code,
    type: atk,
    severity: Math.floor(Math.random() * 10) + 1,
    port: PORTS[Math.floor(Math.random() * PORTS.length)],
    protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
    timestamp: Date.now(),
  }
}

export type SimulatorCallback = (events: AttackEvent[]) => void

export function startSimulator(onEvents: SimulatorCallback): () => void {
  // Base rate: 2-5 events per second
  const baseTimer = setInterval(() => {
    const count = Math.floor(Math.random() * 4) + 2
    const events = Array.from({ length: count }, () => generateAttack())
    onEvents(events)
  }, 1000)

  // Burst: every 30-120s, generate 20-50 DDoS events over 5 seconds
  let burstTimeout: ReturnType<typeof setTimeout>

  function scheduleBurst() {
    const delay = (Math.random() * 90 + 30) * 1000
    burstTimeout = setTimeout(() => {
      const totalBurst = Math.floor(Math.random() * 30) + 20
      const perTick = Math.ceil(totalBurst / 5)
      let remaining = totalBurst
      const burstTimer = setInterval(() => {
        const count = Math.min(perTick, remaining)
        remaining -= count
        const events = Array.from({ length: count }, () => generateAttack('ddos'))
        onEvents(events)
        if (remaining <= 0) clearInterval(burstTimer)
      }, 1000)
      scheduleBurst()
    }, delay)
  }

  scheduleBurst()

  return () => {
    clearInterval(baseTimer)
    clearTimeout(burstTimeout)
  }
}
