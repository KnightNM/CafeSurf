import { db } from '../config/database';

/**
 * Database initialization script.
 * Drops existing tables (if any) and recreates them from scratch.
 * Run via: npm run db:init
 */
async function init(): Promise<void> {
  console.log('🗄️  Initializing database...\n');

  try {
    // ── Drop tables in reverse-dependency order ─────────
    await db.none('DROP TABLE IF EXISTS bookings CASCADE');
    await db.none('DROP TABLE IF EXISTS cafes CASCADE');
    console.log('   ✓ Dropped existing tables');

    // ── Create cafes table ──────────────────────────────
    await db.none(`
      CREATE TABLE cafes (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(255)  NOT NULL,
        area            VARCHAR(100)  NOT NULL,
        latitude        DECIMAL(10,7) NOT NULL,
        longitude       DECIMAL(10,7) NOT NULL,
        hourly_rate     INTEGER       NOT NULL,
        total_slots     INTEGER       NOT NULL DEFAULT 10,
        has_generator   BOOLEAN       NOT NULL DEFAULT false,
        wifi_speed_mbps INTEGER       NOT NULL DEFAULT 50,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    console.log('   ✓ Created "cafes" table');

    // ── Create bookings table ───────────────────────────
    await db.none(`
      CREATE TABLE bookings (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(100) NOT NULL,
        cafe_id     UUID         NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
        date        DATE         NOT NULL,
        start_time  INTEGER      NOT NULL CHECK (start_time >= 0 AND start_time <= 23),
        end_time    INTEGER      NOT NULL CHECK (end_time >= 1  AND end_time <= 24),
        total_price INTEGER      NOT NULL,
        status      VARCHAR(20)  NOT NULL DEFAULT 'reserved'
                    CHECK (status IN ('reserved', 'checked_in', 'completed')),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

        CONSTRAINT valid_time_range CHECK (start_time < end_time)
      )
    `);
    console.log('   ✓ Created "bookings" table');

    // ── Indexes ─────────────────────────────────────────
    await db.none(`
      CREATE INDEX idx_bookings_cafe_date
        ON bookings (cafe_id, date)
    `);
    await db.none(`
      CREATE INDEX idx_cafes_area
        ON cafes (area)
    `);
    console.log('   ✓ Created indexes');

    console.log('\n✅ Database initialized successfully.');
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

init();
