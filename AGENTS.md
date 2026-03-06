# AGENTS

## Project Overview

Irodori is a local-first diary app with two primary experiences:

- A notebook shelf for creating, editing, removing, and reordering notebooks.
- A diary workspace for writing Markdown entries and managing metadata such as tags, stickers, and images.

The codebase follows a repository-first architecture with sync-aware data handling.

## Active Docs

Implementation must follow the active documents in `docs/active`.

Current document list:

- `docs/active/01-rules.md`
  - Role: Active implementation rules for Irodori.
  - Covers: Directory/file structure rules, naming/coding conventions, layer responsibilities, state management principles, styling rules, sync/repository rules, domain constraints, and testing/quality standards.
  - Priority: Takes precedence over related draft documents in `docs/drafts/**`.

## Libraries

Avoid reading raw JS files in node_modules (due to minification/bundling). Use docs/libraries as the primary reference. For any missing library documentation, spawn a sub-agent to create docs/libraries/library_name.md by:
1. Analyzing README.md for usage.
2. Identifying entry points in package.json.
3. Examining *.d.ts files for types based on those entry points.

Note: If usage remains unclear, stop and request clarification from the user rather than searching node_modules files.
