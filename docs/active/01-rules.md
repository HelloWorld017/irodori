# Irodori Rules

Related Drafts:
  - ../drafts/2026-02-28-initial-plan.md
  - ../drafts/2026-03-02-rules.md

## 1. Product and Scope Rules

- Irodori is a local-first diary app.
- The first implementation pass must prioritize stable local CRUD, repository-first architecture, and sync staging compatibility.
- The primary user experiences are:
  1. Notebook shelf screen
  2. Diary workspace screen

## 2. Layering and Responsibilities

- `src/fragments/**`
  - Owns UI composition and user interaction.
  - Calls services/use-cases.
- `src/services/**`
  - Owns use-case orchestration.
  - Can compose multiple repositories/services.
- `src/repositories/**`
  - Owns all database reads/writes.
  - Owns sync staging behavior.
  - Business logic should not be centered here unless it is data-consistency logic.
- `src/types/**`
  - Owns shared TypeScript types.
- `src/definitions/**`
  - Owns `*.d.ts` declaration files.

## 3. Directory and File Structure Rules

- Any directory with semantic name (`src/utils/example`: yes, `src/fragments/_providers`: no) must provide an `index.ts`.
- `index.ts` files must not contain business logic; they are for aggregation/re-export only.
- In `src/fragments`, internal nested utility directories should use `_` prefix:
  - `_components`, `_providers`, `_utils`, `_types`
- Fragment scopes may be nested, and each scope should follow the same structure.
- Each fragment scope must include a scope entry component named `{Scope}Fragment.tsx`.
  - Example: `src/fragments/users/UserFragment.tsx`
- File names should match their main export intent.
  - Prefer `buildContext.ts` over ambiguous names such as `context.ts`.

## 4. Naming and Convention Rules

- Avoid ambiguous naming.
  - Prefer `kind` over `type` for domain-level discriminators.
  - Prefer `doc` over `document` for sync/document payload naming.
- Use ts-match when applicable.
- Find the list of available utils before editing.
  - For example, route definitions should live under `@/utils/routes`, and class composition should use `@/utils/classes`.

## 5. State Management Rules

- Complex shared state must be managed via providers built with `@/utils/context` (including `buildContext`).
- Fragment state should be scoped by feature (for example `bookshelf`, `diary`).
- Expose focused selector hooks per state slice to reduce unnecessary re-renders.

## 6. Styling Rules

- Styling should use Tailwind CSS.
- Favor semantic color tokens over direct default palette usage in components.
  - Example semantic aliases: `--color-primary`, `--color-base-background`
- Colors intended for backgrounds should use `-background` suffix.
  - Examples: `--color-base-background`, `--color-elevated-background`
- If a color is used as both foreground and background pair, define a paired foreground token.
  - Examples: `--color-highlight`, `--color-highlight-foreground`
- Avoid direct default colors (for example `zinc`, `slate`) in component code when possible.
  - If needed, alias them in `@/styles/index.css` as semantic tokens.
- Do not add component-specific, or scope-specific colors to the `@/styles/index.css`
  - Treat adding colors to `@/styles/index.css` as a last resort.

## 7. Sync and Repository Rules

- ClxDB backend contract must be implemented with the following methods:
  - `initialize(uuid)`
  - `read(ids)`
  - `readPendingIds()`
  - `upsert(data)`
  - `delete(data)`
  - `replicate(onUpdate)`
- All repository mutations must be transactional.
- Local writes must stage sync documents with `seq: null`.
- Local deletes must stage sync documents with `del: true` and `seq: null`.
- `replicate(onUpdate)` should fire only for local pending changes (`seq === null`).
- Remote/synced `upsert` and `delete` flows must not emit local replicate events.

### 7.1 Sync document model (active baseline)

Use a dedicated `sync_documents` table shape compatible with ClxDB contracts:

- `id` (text, primary key; namespaced, e.g. `entry:{id}`)
- `at` (integer epoch ms)
- `seq` (integer nullable)
- `del` (boolean/integer)
- `data` (text/json payload)
- `entity_type` (text)
- `entity_id` (text)
- Indexes: `(seq)`, `(entity_type, entity_id)`

