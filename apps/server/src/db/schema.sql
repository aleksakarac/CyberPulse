CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS attack_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ip INET NOT NULL,
  target_ip INET NOT NULL,
  source_lat DOUBLE PRECISION NOT NULL,
  source_lon DOUBLE PRECISION NOT NULL,
  target_lat DOUBLE PRECISION NOT NULL,
  target_lon DOUBLE PRECISION NOT NULL,
  source_country VARCHAR(3) NOT NULL,
  target_country VARCHAR(3) NOT NULL,
  attack_type VARCHAR(20) NOT NULL,
  severity SMALLINT NOT NULL DEFAULT 1,
  port INTEGER NOT NULL DEFAULT 0,
  protocol VARCHAR(10) NOT NULL DEFAULT 'TCP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for efficient time-series queries
SELECT create_hypertable('attack_events', 'created_at', if_not_exists => TRUE);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attack_events_type ON attack_events (attack_type);
CREATE INDEX IF NOT EXISTS idx_attack_events_source ON attack_events (source_country);
CREATE INDEX IF NOT EXISTS idx_attack_events_target ON attack_events (target_country);
