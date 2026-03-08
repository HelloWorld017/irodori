import { sql } from 'kysely';
import { VERSION } from '@/constants/database';
import { migrations } from '@/repositories/_migrations';
import type { Database } from '@/repositories';
import type { MigrationExecutor } from '@/types/Migration';
import type { Kysely } from 'kysely';

const ensureMigrationState = async (executor: MigrationExecutor<Database>): Promise<void> => {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER NOT NULL,
      applied_at INTEGER NOT NULL,
      PRIMARY KEY (version)
    )
  `.execute(executor);
};

const readCurrentVersion = async (executor: MigrationExecutor<Database>): Promise<number> => {
  const result = await sql<{ version: number }>`
    SELECT version
    FROM schema_migrations
    ORDER BY version DESC
    LIMIT 1
  `.execute(executor);

  return result.rows[0]?.version ?? -1;
};

const markMigrationApplied = async (
  executor: MigrationExecutor<Database>,
  version: number
): Promise<void> => {
  await sql`
    INSERT INTO schema_migrations (version, applied_at)
    VALUES (${version}, ${Date.now()})
  `.execute(executor);
};

const validateMigrations = (): void => {
  migrations.forEach((migration, index) => {
    if (migration.version !== index) {
      throw new Error(
        `Invalid migration ordering: expected ${index}, received ${migration.version}`
      );
    }
  });

  if (migrations.at(-1)?.version !== VERSION) {
    throw new Error(`Database VERSION must match latest migration: version=${VERSION}`);
  }
};

export const runMigrations = async (db: Kysely<Database>): Promise<void> => {
  validateMigrations();
  await ensureMigrationState(db);

  const currentVersion = await readCurrentVersion(db);
  const pendingMigrations = migrations.filter(migration => migration.version > currentVersion);

  for (const migration of pendingMigrations) {
    await db.transaction().execute(async trx => {
      await migration.migrate(trx);
      await markMigrationApplied(trx, migration.version);
    });
  }
};
