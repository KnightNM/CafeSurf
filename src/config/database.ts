import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise();

const connectionString = process.env.DATABASE_URL
  || 'postgres://postgres:postgres@localhost:5432/cafe_booking';

const requiresSsl = process.env.DATABASE_SSL === 'true'
  || connectionString.includes('supabase.co');

const db = pgp({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

export { db, pgp };
