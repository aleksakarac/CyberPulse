export type AttackType = 'brute_force' | 'ddos' | 'malware' | 'scanning' | 'phishing'

export interface AttackEvent {
  id: string
  sourceIp: string
  targetIp: string
  sourceLat: number
  sourceLon: number
  targetLat: number
  targetLon: number
  sourceCountry: string
  targetCountry: string
  type: AttackType
  severity: number
  port: number
  protocol: string
  timestamp: number
}

export const ATTACK_COLORS: Record<AttackType, string> = {
  brute_force: '#ff2d55',
  ddos: '#ff9500',
  malware: '#ffcc00',
  scanning: '#af52de',
  phishing: '#00bcd4',
}

export const ATTACK_LABELS: Record<AttackType, string> = {
  brute_force: 'Brute Force',
  ddos: 'DDoS',
  malware: 'Malware / C2',
  scanning: 'Scanning',
  phishing: 'Phishing',
}

export interface WsMessage {
  type: 'attack' | 'batch' | 'stats'
  data: AttackEvent | AttackEvent[] | StatsSnapshot
}

export interface StatsSnapshot {
  total24h: number
  total1h: number
  perSecond: number
  topSources: CountryCount[]
  topTargets: CountryCount[]
}

export interface CountryCount {
  country: string
  count: number
}
