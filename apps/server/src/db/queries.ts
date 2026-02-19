import pool from './pool.js'
import type { AttackEvent, CountryCount } from '@cyberpulse/shared'

export async function insertBatch(events: AttackEvent[]) {
  if (events.length === 0) return

  const values: unknown[] = []
  const placeholders: string[] = []

  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    const offset = i * 14
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, to_timestamp($${offset + 14} / 1000.0))`
    )
    values.push(
      e.sourceIp, e.targetIp,
      e.sourceLat, e.sourceLon,
      e.targetLat, e.targetLon,
      e.sourceCountry, e.targetCountry,
      e.type, e.severity,
      e.port, e.protocol,
      e.id, e.timestamp
    )
  }

  const query = `
    INSERT INTO attack_events (source_ip, target_ip, source_lat, source_lon, target_lat, target_lon, source_country, target_country, attack_type, severity, port, protocol, id, created_at)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (id) DO NOTHING
  `

  try {
    await pool.query(query, values)
  } catch (err) {
    console.error('Failed to insert batch:', (err as Error).message)
  }
}

export async function getHistory(from: number, to: number): Promise<AttackEvent[]> {
  const result = await pool.query(
    `SELECT id, source_ip, target_ip, source_lat, source_lon, target_lat, target_lon,
            source_country, target_country, attack_type, severity, port, protocol,
            EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
     FROM attack_events
     WHERE created_at BETWEEN to_timestamp($1 / 1000.0) AND to_timestamp($2 / 1000.0)
     ORDER BY created_at ASC
     LIMIT 10000`,
    [from, to]
  )

  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    sourceIp: (row.source_ip as string),
    targetIp: (row.target_ip as string),
    sourceLat: row.source_lat as number,
    sourceLon: row.source_lon as number,
    targetLat: row.target_lat as number,
    targetLon: row.target_lon as number,
    sourceCountry: row.source_country as string,
    targetCountry: row.target_country as string,
    type: row.attack_type as AttackEvent['type'],
    severity: row.severity as number,
    port: row.port as number,
    protocol: row.protocol as string,
    timestamp: Number(row.timestamp),
  }))
}

export async function getTopCountries(
  field: 'source_country' | 'target_country',
  since: Date,
  limit: number = 10
): Promise<CountryCount[]> {
  const result = await pool.query(
    `SELECT ${field} as country, COUNT(*) as count
     FROM attack_events
     WHERE created_at > $1
     GROUP BY ${field}
     ORDER BY count DESC
     LIMIT $2`,
    [since, limit]
  )

  return result.rows.map((row: Record<string, unknown>) => ({
    country: row.country as string,
    count: Number(row.count),
  }))
}

export async function getTotalCount(since: Date): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM attack_events WHERE created_at > $1`,
    [since]
  )
  return Number(result.rows[0].count)
}
