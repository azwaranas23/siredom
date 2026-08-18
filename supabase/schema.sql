-- SIREDOM (Sistem Rekapitulasi Domino) PostgreSQL / Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'pro', -- 'basic', 'pro', 'enterprise'
  is_active BOOLEAN DEFAULT TRUE,
  max_tables INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin', -- 'superadmin', 'admin', 'kiosk'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tables (Meja Panitia) Table
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  table_number INT NOT NULL,
  pin_code VARCHAR(10) NOT NULL DEFAULT '1234',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, table_number)
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  match_mode VARCHAR(50) DEFAULT 'rounds', -- 'rounds' vs 'points'
  target_value INT DEFAULT 10, -- target 10 rounds or target 50 points
  points_config JSONB NOT NULL DEFAULT '{
    "menang_biasa": 1,
    "kandang": 2,
    "ceki": 3,
    "palang": 4,
    "tangkap": 3,
    "ditangkap": -3,
    "berdiri": 0,
    "duduk": 0
  }'::jsonb,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'setup', 'in_progress', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Players Table (4 seats per table match)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  seat_number INT NOT NULL CHECK (seat_number BETWEEN 1 AND 4), -- 1: Red, 2: Blue, 3: Green, 4: Yellow
  name VARCHAR(255) NOT NULL,
  current_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, seat_number)
);

-- 6. Rounds Table
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'menang_biasa', 'kandang', 'ceki', 'palang', 'tangkap'
  winner_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  victim_player_id UUID REFERENCES players(id) ON DELETE SET NULL, -- for 'tangkap' action
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Round Scores Table
CREATE TABLE IF NOT EXISTS round_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- 'menang', 'ditangkap', 'berdiri', 'duduk'
  points_awarded INT NOT NULL,
  score_after INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Supabase Realtime for instant TV updates
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE round_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
