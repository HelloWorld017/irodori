import { sql } from 'kysely';
import type { Database } from '@/repositories';
import type { Migration } from '@/types/Migration';

export const initializeMigration: Migration<Database> = {
  version: 0,
  async migrate(executor) {
    await sql`
      CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS notebooks_sort_order_idx
      ON notebooks (sort_order)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS notebooks_deleted_at_idx
      ON notebooks (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT NOT NULL,
        notebook_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        cover_asset_id TEXT,
        entry_index INTEGER NOT NULL,
        entry_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_notebook_id_idx
      ON entries (notebook_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_updated_at_idx
      ON entries (updated_at)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_notebook_id_entry_index_id_idx
      ON entries (notebook_id, entry_index, id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entries_deleted_at_idx
      ON entries (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS entry_drafts (
        entry_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_drafts_updated_at_idx
      ON entry_drafts (updated_at)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_drafts_deleted_at_idx
      ON entry_drafts (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT NOT NULL,
        blob_digest TEXT NOT NULL,
        blurhash TEXT,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS assets_status_idx
      ON assets (status)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS assets_deleted_at_idx
      ON assets (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS entry_assets (
        entry_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        usage TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id, asset_id, usage)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_assets_entry_id_idx
      ON entry_assets (entry_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_assets_usage_idx
      ON entry_assets (usage)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_assets_deleted_at_idx
      ON entry_assets (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id, tag_id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_tags_entry_id_idx
      ON entry_tags (entry_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_tags_tag_id_idx
      ON entry_tags (tag_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_tags_deleted_at_idx
      ON entry_tags (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS entry_stickers (
        entry_id TEXT NOT NULL,
        slot INTEGER NOT NULL,
        sticker_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (entry_id, slot)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_stickers_sticker_id_idx
      ON entry_stickers (sticker_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS entry_stickers_deleted_at_idx
      ON entry_stickers (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS stickers (
        id TEXT NOT NULL,
        kind TEXT NOT NULL,
        emoji TEXT,
        label TEXT NOT NULL,
        asset_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS stickers_kind_idx
      ON stickers (kind)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS stickers_deleted_at_idx
      ON stickers (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS tag_categories (
        id TEXT NOT NULL,
        notebook_id TEXT NOT NULL,
        label TEXT NOT NULL,
        icon TEXT,
        color TEXT NOT NULL,
        displayed INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL,
        min_select INTEGER NOT NULL DEFAULT 0,
        max_select INTEGER,
        required INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS tag_categories_notebook_id_idx
      ON tag_categories (notebook_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS tag_categories_sort_order_idx
      ON tag_categories (sort_order)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS tag_categories_deleted_at_idx
      ON tag_categories (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        label TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS tags_category_id_idx
      ON tags (category_id)
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS tags_deleted_at_idx
      ON tags (deleted_at)
    `.execute(executor);

    await sql`
      CREATE TABLE IF NOT EXISTS sync_documents (
        id TEXT NOT NULL,
        at INTEGER NOT NULL,
        seq INTEGER,
        del INTEGER NOT NULL DEFAULT 0,
        data TEXT,
        PRIMARY KEY (id)
      )
    `.execute(executor);

    await sql`
      CREATE INDEX IF NOT EXISTS sync_documents_seq_idx
      ON sync_documents (seq)
    `.execute(executor);
  },
};
