# clxdb

- Local-first sync engine for browser apps. It keeps app data in your own local database/backend, then syncs documents and blobs through BYOC storage such as WebDAV, S3-compatible storage, or browser filesystem storage.
- README warns: do not use in production; not battle-tested.

## Package entry points

- `clxdb`
  - Types: `dist/clxdb.d.ts`
  - Main exports for app integration: `createClxDB`, `generateNewClxDB`, `createStorageBackend`, `inspectClxDBStatus`
- `clxdb/ui`
  - Types: `dist/ui.d.ts`
  - UI helpers: `createClxUI`, `startClxDBWithUI`
- `clxdb/browser`
  - UMD/browser bundle only (`dist/clxdb.umd.cjs`)

## Type definition files to read next

- Start with `node_modules/clxdb/dist/clxdb.d.ts`. It contains the core API, backend/storage contracts, document shapes, sync events, crypto options, and client options.
- Read `node_modules/clxdb/dist/ui.d.ts` if you need the storage picker, unlock/settings dialogs, or `startClxDBWithUI` wiring.
- For this repo, most repository and sync-adapter work should stay anchored to `node_modules/clxdb/dist/clxdb.d.ts`; the UI file is secondary.
- Package export mapping for these entries is declared in `node_modules/clxdb/package.json`.

## Key exported types and functions

From `clxdb`:

- `DatabaseBackend`
  - `initialize(uuid)`
  - `read(ids)` -> returns docs in the same order, missing entries as `null`
  - `readPendingIds()` -> local docs staged with `seq === null`
  - `upsert(data)` -> apply synced/remote shard docs
  - `delete(data)` -> apply synced/remote deletions
  - `replicate(onUpdate)` -> subscribe only to local pending changes
- `DatabaseDocument`
  - `{ id, at, seq: number | null, del, data? }`
- `ShardDocument`
  - `{ id, at, seq: number, del, data? }`
- `StorageBackend`
  - low-level file/object API: `read`, `write`, `delete`, `stat`, `atomicUpdate`, `list`
- `ClxDB`
  - lifecycle: `init()`, `start()`, `stop()`, `sync()`, `destroy()`
  - status/events: `getState()`, `on('documentsChanged' | 'syncStart' | 'syncProgress' | ...)`
  - blob API via `client.blobs.putBlob/getBlob/deleteBlob`
- `ClxDBCrypto`
  - `{ kind: 'none' }`, `{ kind: 'master', password }`, `{ kind: 'quick-unlock', password }`
- `ClxDBClientOptions`
  - sync cadence and maintenance knobs such as `syncInterval`, compaction, GC, vacuum, `databasePersistent`, and custom `mergeRule`

From `clxdb/ui`:

- `startClxDBWithUI(options)` -> opens storage/unlock UI and returns a started client with `ui`
- `createClxUI(options)` -> storage picker, unlock/settings dialogs, sync indicator

## Backend contract relevant to this repo

Irodori's active rules match ClxDB's required backend contract closely.

- Local user-originated writes must be staged as `seq: null`.
- Local user-originated deletes must be staged as `del: true` and `seq: null`.
- `replicate(onUpdate)` should fire for local pending changes only.
- Remote/synced updates come back through `upsert(data)` and `delete(data)` with concrete `seq` values.
- `read(ids)` must preserve input order and return `null` for missing docs.
- The package explicitly recommends a two-step update/delete flow, which aligns with Irodori's `sync_documents` staging table.

Practical mapping for Irodori:

- Treat `sync_documents` rows as the ClxDB-facing document stream.
- Keep repository mutations transactional so entity rows and staged sync rows stay consistent.
- Avoid emitting replicate events when applying remote `upsert`/`delete` callbacks.

## Sync and replication notes

- Sync model is pull then push.
- Remote storage layout is manifest-driven:
  - `manifest.json`
  - immutable shard files under `shards/`
  - digest-addressed blobs under `blobs/`
- Conflict rule is latest one wins.
- Background maintenance exists for compaction, vacuum, and garbage collection.
- `databasePersistent: false` is allowed but discouraged because the client may redownload all rows on every open and lose unsynced rows.
- Expected workload in README is moderate: about 20,000 docs / 100 MB and about 5,000 blobs / 4 GB across about 5 devices.

## Minimal example tailored to this repo

```ts
import { createClxDB, createStorageBackend, type DatabaseBackend } from 'clxdb';

const database: DatabaseBackend = {
  async initialize(uuid) {
    await repositories.sync.initialize(uuid);
  },
  async read(ids) {
    return await repositories.sync.readDocuments(ids);
  },
  async readPendingIds() {
    return await repositories.sync.readPendingIds();
  },
  async upsert(data) {
    await repositories.sync.applyRemoteUpserts(data);
  },
  async delete(data) {
    await repositories.sync.applyRemoteDeletes(data);
  },
  replicate(onUpdate) {
    return repositories.sync.subscribePending(onUpdate);
  },
};

const storage = createStorageBackend({
  kind: 'webdav',
  url: env.CLX_WEBDAV_URL,
  auth: { user: env.CLX_WEBDAV_USER, pass: env.CLX_WEBDAV_PASS },
});

const client = createClxDB({
  database,
  storage,
  crypto: { kind: 'none' },
  options: { databasePersistent: true, syncInterval: 30_000 },
});

await client.init();
client.start();
```

For Irodori, the important part is not the storage picker UI; it is the repository adapter that translates notebook/entry mutations into staged sync documents with `seq: null` and applies remote `ShardDocument[]` updates transactionally.
