import dotenv from 'dotenv';
import pgPromise from 'pg-promise';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

function argument(name: string): string | undefined {
  return process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3).trim();
}

async function bootstrapAdmin(): Promise<void> {
  const email = argument('email')?.toLowerCase();
  const name = argument('name');
  if (!email || !email.includes('@') || !name) {
    throw new Error('Usage: npm run auth:bootstrap-admin -- --email=you@example.com --name="Your Name"');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connectionString = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!supabaseUrl || !serviceRoleKey || !connectionString) {
    throw new Error(
      'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_MIGRATION_URL or DATABASE_URL are required.'
    );
  }

  const pgp = pgPromise();
  const db = pgp({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    const existingAdmin = await db.one<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM public.users WHERE role = 'admin'"
    );
    if (existingAdmin.count > 0) {
      throw new Error('An admin already exists; bootstrap is disabled.');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const redirectTo = process.env.AUTH_INVITE_REDIRECT_URL;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name },
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error) throw error;
    if (!data.user) throw new Error('Supabase did not return the invited user.');

    const profile = await db.oneOrNone(
      `UPDATE public.users
       SET role = 'admin', updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, role`,
      [data.user.id]
    );
    if (!profile) throw new Error('Auth profile trigger did not create the invited user profile.');

    console.log(`Invited and promoted ${email} as the first administrator.`);
  } finally {
    pgp.end();
  }
}

bootstrapAdmin().catch((error: unknown) => {
  console.error('Admin bootstrap failed:', error);
  process.exitCode = 1;
});
