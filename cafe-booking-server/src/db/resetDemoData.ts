import dotenv from 'dotenv';
import pgPromise from 'pg-promise';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const REQUIRED_CONFIRMATION = '--confirm=DELETE_SUPABASE_DEMO_DATA';
const DEMO_EMAILS = [
  'admin@cafesurf.lk',
  'owner1@cafesurf.lk',
  'owner2@cafesurf.lk',
  'customer@cafesurf.lk',
];

async function resetDemoData(): Promise<void> {
  if (!process.argv.includes(REQUIRED_CONFIRMATION)) {
    throw new Error(`Refusing reset. Re-run with ${REQUIRED_CONFIRMATION}`);
  }

  const connectionString = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL is required.');

  const target = new URL(connectionString);
  if (!target.hostname.endsWith('supabase.com')) {
    throw new Error(`Refusing reset for non-Supabase host: ${target.hostname}`);
  }

  const pgp = pgPromise();
  const db = pgp({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const users = await db.any<{ id: string; email: string }>(
      'SELECT id, email FROM public.users ORDER BY email'
    );
    const counts = await db.one<{
      cafes: number;
      bookings: number;
      unexpected_cafes: number;
      unexpected_bookings: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM public.cafes) AS cafes,
        (SELECT COUNT(*)::int FROM public.bookings) AS bookings,
        (SELECT COUNT(*)::int
         FROM public.cafes c
         WHERE c.owner_id IS NOT NULL
           AND c.owner_id NOT IN (SELECT id FROM public.users)) AS unexpected_cafes,
        (SELECT COUNT(*)::int
         FROM public.bookings b
         WHERE b.user_id NOT IN (SELECT id::text FROM public.users)
            OR b.cafe_id NOT IN (SELECT id FROM public.cafes)) AS unexpected_bookings
    `);

    const unexpectedEmails = users
      .map((user) => user.email.toLowerCase())
      .filter((email) => !DEMO_EMAILS.includes(email));

    if (unexpectedEmails.length || counts.unexpected_cafes > 0 || counts.unexpected_bookings > 0) {
      throw new Error(
        `Refusing reset: target contains unexpected data (${users.length} users, `
        + `${counts.cafes} cafes, ${counts.bookings} bookings).`
      );
    }

    await db.tx(async (transaction) => {
      await transaction.one('SELECT pg_advisory_xact_lock($1)', [73910422]);
      const hasApplications = await transaction.one<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'owner_applications'
        ) AS exists`
      );
      if (hasApplications.exists) await transaction.none('DELETE FROM public.owner_applications');
      await transaction.none('DELETE FROM public.bookings');
      await transaction.none('DELETE FROM public.cafes');
      await transaction.none('DELETE FROM public.users');
    });

    const authUsers = await db.any<{ id: string }>(
      'SELECT id FROM auth.users WHERE LOWER(email) IN ($1:csv)',
      [DEMO_EMAILS]
    );

    if (authUsers.length) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
          'Application data was cleared, but demo Auth users remain. '
          + 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then rerun this command.'
        );
      }
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      for (const authUser of authUsers) {
        const { error } = await admin.auth.admin.deleteUser(authUser.id);
        if (error) throw error;
      }
    }

    console.log(
      `Deleted ${users.length} demo users, ${counts.cafes} cafes, `
      + `${counts.bookings} bookings, and ${authUsers.length} Auth identities.`
    );
  } finally {
    pgp.end();
  }
}

resetDemoData().catch((error: unknown) => {
  console.error('Demo reset failed:', error);
  process.exitCode = 1;
});
