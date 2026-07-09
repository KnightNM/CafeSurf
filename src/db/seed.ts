import { db } from '../config/database';
import { hashPassword } from '../utils/auth';

/**
 * Seed script — populates the database with realistic Sri Lankan café data.
 * Run via: npm run db:seed
 */

interface CafeSeed {
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  hourly_rate: number;
  total_slots: number;
  has_generator: boolean;
  wifi_speed_mbps: number;
}

interface UserSeed {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'cafe_owner' | 'customer';
}

const users: UserSeed[] = [
  {
    email: 'admin@spacebook.lk',
    password: 'admin123',
    name: 'System Admin',
    role: 'admin',
  },
  {
    email: 'owner1@spacebook.lk',
    password: 'owner123',
    name: 'Cafe Owner 1',
    role: 'cafe_owner',
  },
  {
    email: 'owner2@spacebook.lk',
    password: 'owner123',
    name: 'Cafe Owner 2',
    role: 'cafe_owner',
  },
  {
    email: 'customer@spacebook.lk',
    password: 'customer123',
    name: 'Demo Customer',
    role: 'customer',
  },
];

async function seed(): Promise<void> {
  console.log('🌱 Seeding database...\n');

  try {
    // ── Clear existing data ──────────────────────────
    await db.none('DELETE FROM bookings');
    await db.none('DELETE FROM cafes');
    await db.none('DELETE FROM users');
    console.log('   ✓ Cleared existing data');

    // ── Insert users ─────────────────────────────────
    const insertedUsers: { id: string; email: string }[] = [];

    for (const user of users) {
      const passwordHash = await hashPassword(user.password);
      const row = await db.one(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email`,
        [user.email, passwordHash, user.name, user.role]
      );
      insertedUsers.push(row);
    }

    console.log(`   ✓ Inserted ${insertedUsers.length} users`);
    console.log('\n✅ Seeding completed successfully.');
    console.log('   ℹ️  No cafes seeded - cafe owners can add their cafes via the dashboard.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
