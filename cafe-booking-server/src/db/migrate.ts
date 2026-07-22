import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pgPromise from 'pg-promise';

dotenv.config();

const connectionString = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Set DATABASE_MIGRATION_URL or DATABASE_URL before running migrations.');
}

const requiresSsl = process.env.DATABASE_SSL === 'true'
  || connectionString.includes('supabase.co');

const pgp = pgPromise();
const db = pgp({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

interface AppliedMigration {
  filename: string;
  checksum: string;
}

async function migrate(): Promise<void> {
  const migrationsDirectory = path.resolve(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  await db.none(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = await db.any<AppliedMigration>(
    'SELECT filename, checksum FROM schema_migrations ORDER BY filename'
  );
  const appliedByFilename = new Map(applied.map((migration) => [migration.filename, migration.checksum]));

  let appliedCount = 0;

  for (const filename of files) {
    const sql = fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const existingChecksum = appliedByFilename.get(filename);

    if (existingChecksum) {
      if (existingChecksum !== checksum) {
        throw new Error(`Applied migration ${filename} has been modified.`);
      }
      continue;
    }

    await db.tx(async (transaction) => {
      await transaction.one('SELECT pg_advisory_xact_lock($1)', [73910421]);
      await transaction.none(sql);
      await transaction.none(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [filename, checksum]
      );
    });

    appliedCount += 1;
    console.log(`Applied ${filename}`);
  }

  console.log(appliedCount === 0 ? 'Database is up to date.' : `Applied ${appliedCount} migration(s).`);
}

migrate()
  .catch((error: unknown) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    pgp.end();
  });
