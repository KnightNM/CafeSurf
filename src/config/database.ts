import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise();

const connectionString = process.env.DATABASE_URL
  || 'postgres://postgres:postgres@localhost:5432/cafe_booking';

const db = pgp(connectionString);

export { db, pgp };
