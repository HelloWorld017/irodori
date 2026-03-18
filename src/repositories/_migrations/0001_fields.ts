import { sql } from 'kysely';
import type { Database } from '@/repositories';
import type { Migration } from '@/types/Migration';

export const fieldsMigration: Migration<Database> = {
  version: 1,
  async migrate(executor) {
    await sql`
      CREATE TABLE IF NOT EXISTS fields (
        id TEXT NOT NULL,
        notebook_id TEXT NOT NULL,
        label TEXT NOT NULL,
        kind TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS fields_notebook_id_idx
      ON fields (notebook_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS fields_sort_order_idx
      ON fields (sort_order)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS fields_deleted_at_idx
      ON fields (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS entry_fields (
        entry_id TEXT NOT NULL,
        field_id TEXT NOT NULL,
        value TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id, field_id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_fields_field_id_idx
      ON entry_fields (field_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_fields_deleted_at_idx
      ON entry_fields (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS entry_locations (
        id TEXT NOT NULL,
        entry_id TEXT NOT NULL,
        field_id TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS entry_locations_entry_id_field_id_idx
      ON entry_locations (entry_id, field_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_locations_field_id_idx
      ON entry_locations (field_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_locations_deleted_at_idx
      ON entry_locations (deleted_at)
    `.execute(executor);
  },
};
