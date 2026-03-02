# Irodori Initial Plan (2026-02-28)

## 1) Scope and Goals

Irodori is a local-first diary app with two primary experiences:

1. Notebook shelf (create, edit, remove, reorder notebooks)
2. Diary workspace (responsive list + editor + metadata panel)

Core goals for the first implementation pass:

- Stable local CRUD with Kysely + SQLocal
- Markdown editing via `ink-mde`
- Tag system with category-level constraints (required and single-select)
- Sticker system (emoji + custom, max 3 per entry)
- Cover and inline image support via ClxDB blobs
- Repository-first architecture with ClxDB sync hooks

## 2) Irodori User-Level Screen Composition

Top-level user experience is organized around two primary screens:

1. Notebook shelf screen
2. Diary workspace screen

### 2.1 Notebook shelf screen

- Users see notebook cards placed on a shelf-like surface.
- Users can create, rename/edit, remove, and reorder notebooks.
- The screen works as the app's entry point and notebook navigator.
- Selecting a notebook opens the diary workspace filtered to that notebook.

### 2.2 Diary workspace screen

- Responsive structure:
  - Desktop: entry list (left), markdown editor/view (center), metadata panel (right)
  - Mobile: list-detail flow with metadata shown as a collapsible panel
- Entries are written in Markdown via `ink-mde`.
- Users can add a cover image and inline images inside the diary body.
- Tags are displayed by category in the metadata panel.
- Some categories (for example, weather and mood) are required or single-select by rule.
- Stickers appear below metadata and support emoji/custom stickers, with a limit of up to 3 per entry.

### 2.3 Core user flows

- Shelf -> pick notebook -> browse entries -> open or create entry.
- Edit markdown, apply tags/stickers, attach images, then save.
- Revisit entries from list with metadata and categorized tags visible at a glance.

## 3) ClxDB Integration Notes (from local README)

Backend contract to implement:

- `initialize(uuid)`
- `read(ids)`
- `readPendingIds()`
- `upsert(data)`
- `delete(data)`
- `replicate(onUpdate)`

Important behavioral rules:

- User-originated writes are always staged with `seq: null`.
- User-originated deletes are staged with `del: true, seq: null`.
- `replicate(onUpdate)` should fire only for local changes that are pending sync (`seq === null`).
- ClxDB later calls `upsert()` / `delete()` with concrete seq values for synced or remote changes.

Implication: no global sync cursor table is required for app data writes. Sync state is encoded at document row level.

## 4) Architecture Overview

### 4.1 Layering

- UI fragments (`src/fragments/**`) call use-cases/services.
- Services call repositories.
- Repositories own all DB writes/reads and sync staging.
- ClxDB adapter talks to a sync document repository and applies remote changes through repositories.

### 4.2 Sync Document Model

Use a dedicated table that mirrors ClxDB document shape per entity row.

`sync_documents` (proposed):

- `id` (text, pk, namespaced like `entry:{id}`)
- `at` (integer, epoch ms)
- `seq` (integer nullable)
- `del` (integer boolean)
- `data` (text/json payload)
- indexes on `(seq)`

Why this shape:

- Directly compatible with ClxDB backend interfaces
- Keeps per-row seq logic explicit
- Avoids union queries across every domain table for pending IDs

### 4.3 Domain Tables (initial)

- `notebooks`
  - id, title, description, shelf_order, created_at, updated_at, deleted_at
- `entries`
  - id, notebook_id, title, body_md, cover_asset_id, created_at, updated_at, deleted_at
- `tag_categories`
  - id, notebook_id, label, sort_order, min_select, max_select, required
- `tags`
  - id, category_id, key, label, color, icon, sort_order, archived_at
- `entry_tags`
  - entry_id, tag_id, created_at
- `stickers`
  - id, kind (`emoji` or `custom`), emoji, label, asset_id, created_at, updated_at
- `entry_stickers`
  - entry_id, sticker_id, slot (1..3), created_at
- `assets`
  - id, blob_digest, mime, size, width, height, status, created_at, updated_at
- `entry_assets`
  - entry_id, asset_id, usage (`cover` or `inline`), sort_order, created_at

## 5) Validation and Constraint Strategy

### 5.1 Tag category constraints

Category-level fields:

- `required` (boolean)
- `min_select` (integer)
- `max_select` (integer nullable)

Rules:

- Required category: selected count must be `>= min_select`.
- Single-select category: set `min_select = 1`, `max_select = 1` for strict one-of-one.
- Multi-select category: `max_select` can be null or > 1.

Enforcement:

- Primary enforcement in repository transactions before commit.
- Secondary DB safety via constraints/triggers for `max_select = 1` categories.
- Validate required categories on entry save (and optionally allow draft mode with relaxed checks if needed).

### 5.2 Sticker constraints

- `entry_stickers.slot` constrained to integer range 1..3.
- Unique `(entry_id, slot)` and unique `(entry_id, sticker_id)`.
- Repository guard rejects adding a 4th sticker.

## 6) Repository Plan (`src/repositories`)

Proposed structure:

```text
src/repositories/
  _core/
    database.ts
    schema.ts
    migrations.ts
    transaction.ts
  sync/
    clxdbBackend.ts
    syncDocumentRepository.ts
    syncCodec.ts
    replicateBus.ts
  notebooks/
    notebookRepository.ts
  entries/
    entryRepository.ts
  tags/
    tagCategoryRepository.ts
    tagRepository.ts
    entryTagRepository.ts
  stickers/
    stickerRepository.ts
    entryStickerRepository.ts
  assets/
    assetRepository.ts
    entryAssetRepository.ts
  index.ts
```

Repository principles:

- All mutating operations are transactional.
- Mutations update domain rows and stage `sync_documents` in the same transaction.
- Local create/update stages `del = false, seq = null`.
- Local delete stages `del = true, seq = null` and applies soft delete (or hard delete where safe).
- Replicate bus emits once per committed local pending write batch.

## 7) ClxDB Backend Flow (detailed)

### 7.1 Local write path

1. UI action calls repository method.
2. Repository transaction updates domain table(s).
3. Repository serializes entity into sync payload and upserts `sync_documents` with `seq = null`.
4. Repository emits replicate signal for ClxDB.

### 7.2 Remote/synced upsert path (`upsert`)

1. Receive `ShardDocument[]` (seq is concrete number).
2. For each doc, decode namespace and map to domain entity.
3. Apply domain upsert and sync row upsert (`seq = incoming seq`, `del = false`).
4. Do not emit local replicate for these writes.

### 7.3 Remote/synced delete path (`delete`)

1. Receive `ShardDocument[]` delete markers.
2. Apply domain delete policy (soft delete preferred).
3. Mark or remove sync row according to chosen retention policy.
4. Do not emit local replicate.

## 8) UI Fragment Plan (`src/fragments`)

Proposed scopes for first pass:

```text
src/fragments/
  bookshelf/
    BookshelfFragment.tsx
    index.ts
    _components/
    _utils/
    _types/
  diary/
    DiaryFragment.tsx
    index.ts
    _components/
      DiaryList.tsx
      DiaryEditor.tsx
      DiaryMetaPanel.tsx
      TagCategorySection.tsx
      StickerSection.tsx
    _utils/
    _types/
```

### 8.1 Bookshelf fragment

- Render notebook cards on shelf layout.
- Notebook create/update/delete controls.
- Drag reorder and persist `shelf_order`.

### 8.2 Diary fragment

- Responsive layout:
  - Desktop: list (left), editor (center), metadata panel (right)
  - Mobile: stack/list-detail switch with slide-over metadata panel
- `ink-mde` markdown editor integration.
- Cover image picker and inline image insertion.
- Metadata panel with grouped tags and sticker slots.

## 9) State Plan with `buildContext`

Build separate context stores per fragment scope for selective re-rendering.

Examples:

- `bookshelf` context
  - notebook list, selected notebook, reorder status
- `diary` context
  - selected notebook id, entry list query, selected entry id
  - current draft, save status, panel open states
  - tag selection draft and sticker draft

Pattern:

- Create scope provider with `buildContext`.
- Expose tiny selector hooks per state slice.
- Keep server/DB operations in repository methods called from fragment actions.

## 10) Implementation Milestones

### Milestone A: Foundation

- Create repository core and DB bootstrap.
- Add migrations and base schema.
- Add sync document table and codec conventions.

### Milestone B: Domain CRUD + Sync staging

- Notebook and entry repositories with transactional sync staging.
- Tag repositories with category constraints.
- Sticker repositories with max-3 guard.
- Asset repositories with pending/uploaded/failed lifecycle.

### Milestone C: ClxDB backend adapter

- Implement full backend contract for seq-based sync.
- Connect replicate bus.
- Verify local pending changes are discoverable through `readPendingIds()`.

### Milestone D: UI fragments

- Build `BookshelfFragment` and `DiaryFragment` skeleton.
- Add contexts via `buildContext`.
- Hook list/editor/meta views to repositories.

### Milestone E: Media + polish

- Cover and inline image upload flow via ClxDB blobs.
- Error/retry UI for failed uploads.
- Responsive refinements and keyboard shortcuts.

### Milestone F: Validation and quality

- Unit tests for repositories and constraint logic.
- Integration tests for sync staging and remote apply.
- End-to-end checks for key user journeys.

## 11) Testing Plan

Unit tests:

- Tag category validation (`required`, `max_select=1`, mixed categories)
- Sticker slot limit and uniqueness
- Sync staging (`seq = null` on local writes)

Integration tests:

- ClxDB backend methods against seeded SQLocal DB
- Upsert/delete remote apply paths
- Replicate callback only on local pending writes

UI tests:

- Shelf CRUD and reorder persistence
- Entry edit/save/preview
- Tag and sticker UX constraints
- Cover and inline image attach/retry behavior

## 12) Definition of Done (initial)

- Repositories cover all notebook/entry/tag/sticker/asset write paths.
- Every local mutation stages a per-row sync document with `seq: null`.
- Required/single tag categories are enforced in both repository and DB guardrails.
- Fragments follow required folder/file conventions.
- State is managed via `buildContext` selector hooks.
- Core flows work offline-first and survive app reload.
