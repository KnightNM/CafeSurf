CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer'
                CHECK (role IN ('admin', 'cafe_owner', 'customer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cafes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  area            VARCHAR(100) NOT NULL,
  latitude        DECIMAL(10,7) NOT NULL,
  longitude       DECIMAL(10,7) NOT NULL,
  hourly_rate     INTEGER NOT NULL,
  total_slots     INTEGER NOT NULL DEFAULT 10,
  has_generator   BOOLEAN NOT NULL DEFAULT false,
  wifi_speed_mbps INTEGER NOT NULL DEFAULT 50,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(100) NOT NULL,
  cafe_id     UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  start_time  INTEGER NOT NULL CHECK (start_time >= 0 AND start_time <= 23),
  end_time    INTEGER NOT NULL CHECK (end_time >= 1 AND end_time <= 24),
  total_price INTEGER NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_cafe_date
  ON bookings (cafe_id, date);

CREATE INDEX IF NOT EXISTS idx_cafes_area
  ON cafes (area);
