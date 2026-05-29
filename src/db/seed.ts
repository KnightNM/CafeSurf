import { db } from '../config/database';

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

const cafes: CafeSeed[] = [
  // ── Colombo 03 (Kollupitiya) ────────────────────
  {
    name: 'Café Kumbuk',
    area: 'Colombo 03',
    latitude: 6.9010,
    longitude: 79.8530,
    hourly_rate: 500,
    total_slots: 15,
    has_generator: true,
    wifi_speed_mbps: 150,
  },
  {
    name: 'The Coffee Bean – Kollupitiya',
    area: 'Colombo 03',
    latitude: 6.9025,
    longitude: 79.8555,
    hourly_rate: 400,
    total_slots: 10,
    has_generator: true,
    wifi_speed_mbps: 100,
  },

  // ── Colombo 07 (Cinnamon Gardens) ───────────────
  {
    name: 'Harpo\'s – Cinnamon Gardens',
    area: 'Colombo 07',
    latitude: 6.9110,
    longitude: 79.8620,
    hourly_rate: 600,
    total_slots: 12,
    has_generator: true,
    wifi_speed_mbps: 200,
  },
  {
    name: 'Paan Paan Café',
    area: 'Colombo 07',
    latitude: 6.9130,
    longitude: 79.8600,
    hourly_rate: 450,
    total_slots: 8,
    has_generator: false,
    wifi_speed_mbps: 100,
  },

  // ── Nawala ──────────────────────────────────────
  {
    name: 'Kopi Kade Nawala',
    area: 'Nawala',
    latitude: 6.8980,
    longitude: 79.8870,
    hourly_rate: 300,
    total_slots: 12,
    has_generator: true,
    wifi_speed_mbps: 75,
  },
  {
    name: 'WorkBench Café',
    area: 'Nawala',
    latitude: 6.8970,
    longitude: 79.8890,
    hourly_rate: 350,
    total_slots: 20,
    has_generator: true,
    wifi_speed_mbps: 120,
  },

  // ── Rajagiriya ─────────────────────────────────
  {
    name: 'The Grind – Rajagiriya',
    area: 'Rajagiriya',
    latitude: 6.9060,
    longitude: 79.8960,
    hourly_rate: 300,
    total_slots: 10,
    has_generator: false,
    wifi_speed_mbps: 80,
  },
  {
    name: 'Steam Co-Work',
    area: 'Rajagiriya',
    latitude: 6.9050,
    longitude: 79.8940,
    hourly_rate: 350,
    total_slots: 15,
    has_generator: true,
    wifi_speed_mbps: 100,
  },

  // ── Kandy ──────────────────────────────────────
  {
    name: 'Empire Café – Kandy',
    area: 'Kandy',
    latitude: 7.2910,
    longitude: 80.6350,
    hourly_rate: 250,
    total_slots: 8,
    has_generator: false,
    wifi_speed_mbps: 50,
  },
  {
    name: 'Kandy Brew Hub',
    area: 'Kandy',
    latitude: 7.2930,
    longitude: 80.6370,
    hourly_rate: 200,
    total_slots: 6,
    has_generator: false,
    wifi_speed_mbps: 40,
  },

  // ── Other Areas ────────────────────────────────
  {
    name: 'Chill Grounds – Nugegoda',
    area: 'Nugegoda',
    latitude: 6.8720,
    longitude: 79.8880,
    hourly_rate: 250,
    total_slots: 10,
    has_generator: true,
    wifi_speed_mbps: 60,
  },
  {
    name: 'Shoreline Workspace',
    area: 'Mount Lavinia',
    latitude: 6.8380,
    longitude: 79.8630,
    hourly_rate: 400,
    total_slots: 8,
    has_generator: true,
    wifi_speed_mbps: 100,
  },
];

async function seed(): Promise<void> {
  console.log('🌱 Seeding database...\n');

  try {
    // ── Clear existing data ──────────────────────────
    await db.none('DELETE FROM bookings');
    await db.none('DELETE FROM cafes');
    console.log('   ✓ Cleared existing data');

    // ── Insert cafes ─────────────────────────────────
    const insertedCafes: { id: string }[] = [];

    for (const cafe of cafes) {
      const row = await db.one(
        `INSERT INTO cafes (name, area, latitude, longitude, hourly_rate, total_slots, has_generator, wifi_speed_mbps)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          cafe.name,
          cafe.area,
          cafe.latitude,
          cafe.longitude,
          cafe.hourly_rate,
          cafe.total_slots,
          cafe.has_generator,
          cafe.wifi_speed_mbps,
        ]
      );
      insertedCafes.push(row);
    }

    console.log(`   ✓ Inserted ${insertedCafes.length} cafes`);

    // ── Insert sample bookings ───────────────────────
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const sampleBookings = [
      // Today: Morning booking at Café Kumbuk (Colombo 03)
      {
        user_id: 'user-ashan',
        cafe_id: insertedCafes[0]!.id,
        date: today,
        start_time: 9,
        end_time: 12,
        total_price: 500 * 3,
        status: 'checked_in',
      },
      // Today: Afternoon booking at Harpo's (Colombo 07)
      {
        user_id: 'user-dilini',
        cafe_id: insertedCafes[2]!.id,
        date: today,
        start_time: 13,
        end_time: 17,
        total_price: 600 * 4,
        status: 'reserved',
      },
      // Today: Evening booking at WorkBench (Nawala)
      {
        user_id: 'user-kamal',
        cafe_id: insertedCafes[5]!.id,
        date: today,
        start_time: 18,
        end_time: 21,
        total_price: 350 * 3,
        status: 'reserved',
      },
      // Tomorrow: Full-day booking at The Grind (Rajagiriya)
      {
        user_id: 'user-nimali',
        cafe_id: insertedCafes[6]!.id,
        date: tomorrow,
        start_time: 8,
        end_time: 17,
        total_price: 300 * 9,
        status: 'reserved',
      },
      // Tomorrow: Morning at Shoreline (Mount Lavinia)
      {
        user_id: 'user-pradeep',
        cafe_id: insertedCafes[11]!.id,
        date: tomorrow,
        start_time: 10,
        end_time: 13,
        total_price: 400 * 3,
        status: 'reserved',
      },
    ];

    for (const booking of sampleBookings) {
      await db.none(
        `INSERT INTO bookings (user_id, cafe_id, date, start_time, end_time, total_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          booking.user_id,
          booking.cafe_id,
          booking.date,
          booking.start_time,
          booking.end_time,
          booking.total_price,
          booking.status,
        ]
      );
    }

    console.log(`   ✓ Inserted ${sampleBookings.length} sample bookings`);
    console.log('\n✅ Seeding completed successfully.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
