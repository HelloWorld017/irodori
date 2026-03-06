# sqlocal

- What it is / what problem it solves
  - Browser-side SQLite wrapper that runs SQLite WASM in a worker and persists the database in OPFS when cross-origin isolation is enabled.
  - Useful for Irodori's local-first data layer because it keeps storage on-device while still allowing SQL access from the app.

- Package entry points
  - `sqlocal`: core `SQLocal` client, processor, drivers, and shared types.
  - `sqlocal/kysely`: `SQLocalKysely`, exposes a Kysely `dialect`.
  - `sqlocal/drizzle`: `SQLocalDrizzle`, exposes a Drizzle sqlite-proxy driver.
  - `sqlocal/react`: `useReactiveQuery` hook for subscribing to query results.
  - `sqlocal/vite`: Vite plugin that helps worker handling and dev-server COI headers.
  - Also exported but not currently relevant here: `sqlocal/angular`, `sqlocal/vue`.

## Type definition files to read next

- Start with `node_modules/sqlocal/dist/client.d.ts` for the `SQLocal` class methods and constructor config.
- Read `node_modules/sqlocal/dist/types.d.ts` for shared types such as `ClientConfig`, `DatabasePath`, `Statement`, `StatementInput`, `Transaction`, and reactive query types.
- Read `node_modules/sqlocal/dist/index.d.ts` to see the root export surface and how the core types are re-exported.
- For Irodori's likely path, read `node_modules/sqlocal/dist/kysely/index.d.ts` and `node_modules/sqlocal/dist/kysely/client.d.ts` for the Kysely adapter.
- Read `node_modules/sqlocal/dist/react/index.d.ts` only if you need the React subscription hook, and `node_modules/sqlocal/dist/vite/index.d.ts` if you need the Vite integration types.
- Package export mapping for all subpaths is declared in `node_modules/sqlocal/package.json`.

- Key exported types/components/functions
  - `class SQLocal`: main client. Important methods include `sql`, `exec`, `batch`, `beginTransaction`, `transaction`, `reactiveQuery`, `getDatabaseInfo`, `getDatabaseFile`, `overwriteDatabaseFile`, `deleteDatabaseFile`, and `destroy`.
  - `class SQLocalKysely extends SQLocal`: adds `dialect` for `new Kysely({ dialect })`.
  - `class SQLocalDrizzle extends SQLocal`: adds `driver` and `batchDriver` for Drizzle's sqlite-proxy adapter.
  - `useReactiveQuery(db, query)`: React hook returning `{ data, error, status, setDb, setQuery }`.
  - Useful shared types: `ClientConfig`, `DatabasePath`, `Statement`, `StatementInput`, `Transaction`, `ReactiveQuery`, `DatabaseInfo`, `SQLocalDriver`.

- Typical integration pattern
  - For this repo, prefer `sqlocal/kysely` because Irodori already depends on `kysely`.
  - Create one long-lived client with a stable database filename, read `dialect`, and pass it to Kysely.
  - Run schema setup in `onInit` or with explicit startup SQL before repositories begin queries.
  - Use `transaction(...)` or `beginTransaction()` for repository mutations so local writes stay atomic.
  - Use `reactiveQuery` or `sqlocal/react` only where live query subscriptions are needed.

- Browser/platform requirements
  - Browser-only package; package metadata exposes `browser` and `import` builds, with no Node entry.
  - OPFS persistence requires cross-origin isolation headers:
    - `Cross-Origin-Embedder-Policy: require-corp`
    - `Cross-Origin-Opener-Policy: same-origin`
  - In Vite, `sqlocal/vite` can add the needed dev-server setup; production still needs matching headers from the real server.
  - Supported storage types in the types include OPFS, memory, local storage, and session storage paths, but the README positions OPFS as the main persistent mode.

- Minimal example tailored to this repo

```ts
import { Kysely } from 'kysely';
import { SQLocalKysely } from 'sqlocal/kysely';

const sqlocal = new SQLocalKysely({
  databasePath: 'irodori.sqlite3',
  onInit: sql => [
    sql`CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position INTEGER NOT NULL
    )`,
  ],
});

export const db = new Kysely({
  dialect: sqlocal.dialect,
});

await db.selectFrom('notebooks').selectAll().execute();
```
