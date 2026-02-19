import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'cyberpulse',
  user: process.env.DB_USER || 'cyberpulse',
  password: process.env.DB_PASSWORD || 'cyberpulse',
  max: 20,
  connectionTimeoutMillis: 3000,
})

export async function initDb() {
  // Test connection first
  const client = await pool.connect()
  client.release()

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  await pool.query(schema)
  console.log('Database schema initialized')
}

export default pool
