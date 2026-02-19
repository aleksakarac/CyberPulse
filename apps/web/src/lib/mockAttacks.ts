import type { AttackEvent, AttackType } from '@cyberpulse/shared'

// Country centroids with lat/lon
const COUNTRIES = [
  { code: 'CN', name: 'China', lat: 35.86, lon: 104.2, sourceWeight: 20, targetWeight: 3 },
  { code: 'RU', name: 'Russia', lat: 61.52, lon: 105.32, sourceWeight: 15, targetWeight: 4 },
  { code: 'US', name: 'United States', lat: 37.09, lon: -95.71, sourceWeight: 10, targetWeight: 25 },
  { code: 'BR', name: 'Brazil', lat: -14.24, lon: -51.93, sourceWeight: 8, targetWeight: 5 },
  { code: 'IN', name: 'India', lat: 20.59, lon: 78.96, sourceWeight: 7, targetWeight: 4 },
  { code: 'DE', name: 'Germany', lat: 51.17, lon: 10.45, sourceWeight: 4, targetWeight: 10 },
  { code: 'GB', name: 'United Kingdom', lat: 55.38, lon: -3.44, sourceWeight: 3, targetWeight: 8 },
  { code: 'JP', name: 'Japan', lat: 36.2, lon: 138.25, sourceWeight: 2, targetWeight: 7 },
  { code: 'FR', name: 'France', lat: 46.23, lon: 2.21, sourceWeight: 3, targetWeight: 6 },
  { code: 'KR', name: 'South Korea', lat: 35.91, lon: 127.77, sourceWeight: 4, targetWeight: 5 },
  { code: 'NL', name: 'Netherlands', lat: 52.13, lon: 5.29, sourceWeight: 3, targetWeight: 5 },
  { code: 'UA', name: 'Ukraine', lat: 48.38, lon: 31.17, sourceWeight: 5, targetWeight: 3 },
  { code: 'IR', name: 'Iran', lat: 32.43, lon: 53.69, sourceWeight: 4, targetWeight: 2 },
  { code: 'VN', name: 'Vietnam', lat: 14.06, lon: 108.28, sourceWeight: 3, targetWeight: 2 },
  { code: 'AU', name: 'Australia', lat: -25.27, lon: 133.78, sourceWeight: 2, targetWeight: 4 },
  { code: 'CA', name: 'Canada', lat: 56.13, lon: -106.35, sourceWeight: 2, targetWeight: 4 },
  { code: 'SG', name: 'Singapore', lat: 1.35, lon: 103.82, sourceWeight: 2, targetWeight: 3 },
  { code: 'ZA', name: 'South Africa', lat: -30.56, lon: 22.94, sourceWeight: 2, targetWeight: 2 },
  { code: 'AR', name: 'Argentina', lat: -38.42, lon: -63.62, sourceWeight: 1, targetWeight: 1 },
  { code: 'NG', name: 'Nigeria', lat: 9.08, lon: 8.68, sourceWeight: 3, targetWeight: 1 },
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

function weightedRandom<T>(items: T[], weightFn: (item: T) => number): T {
  const totalWeight = items.reduce((sum, item) => sum + weightFn(item), 0)
  let random = Math.random() * totalWeight
  for (const item of items) {
    random -= weightFn(item)
    if (random <= 0) return item
  }
  return items[items.length - 1]
}

function randomJitter(value: number, range: number = 2): number {
  return value + (Math.random() - 0.5) * range * 2
}

function randomIp(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}

let idCounter = 0

export function generateAttack(): AttackEvent {
  const source = weightedRandom(COUNTRIES, (c) => c.sourceWeight)
  let target = weightedRandom(COUNTRIES, (c) => c.targetWeight)
  // Avoid same country as source
  while (target.code === source.code) {
    target = weightedRandom(COUNTRIES, (c) => c.targetWeight)
  }

  const attackType = weightedRandom(ATTACK_TYPES, (a) => a.weight)

  return {
    id: `mock-${++idCounter}-${Date.now()}`,
    sourceIp: randomIp(),
    targetIp: randomIp(),
    sourceLat: randomJitter(source.lat),
    sourceLon: randomJitter(source.lon),
    targetLat: randomJitter(target.lat),
    targetLon: randomJitter(target.lon),
    sourceCountry: source.code,
    targetCountry: target.code,
    type: attackType.type,
    severity: Math.floor(Math.random() * 10) + 1,
    port: PORTS[Math.floor(Math.random() * PORTS.length)],
    protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
    timestamp: Date.now(),
  }
}
