# ink-mde

- A framework-agnostic Markdown editor built on CodeMirror 6 and TypeScript.
- Best fit in Irodori when we want a richer Markdown editing surface than a plain `textarea`, while still controlling persistence and app state ourselves.
- README highlights GFM support, inline image previews, drag/drop or paste uploads, optional toolbar, optional Vim mode, SSR support, and an experimental plugin API.

## Package entry points

- `ink-mde`
  - Browser types/default export point to `./dist/client.d.ts`.
  - Node/SSR types point to `./dist/index.d.ts`.
  - Main exports include the editor factory plus SSR helpers.
- `ink-mde/vue`
  - Vue 3 wrapper component with `v-model` and forwarded `options`.
- `ink-mde/svelte`
  - Svelte wrapper component.
- No React-specific entry point is exported.

## Type definition files to read next

- Start with `node_modules/ink-mde/dist/client.d.ts` for the browser-facing editor API that Irodori would use. This is the main file for `Options`, `Instance`, hooks, file handling, and editor methods.
- Read `node_modules/ink-mde/dist/index.d.ts` when you need the SSR-side helpers such as `render`, `hydrate`, and `renderToString`.
- If you need wrapper-specific types, read `node_modules/ink-mde/vue/dist/client.d.ts` and `node_modules/ink-mde/vue/dist/index.d.ts` for Vue, or `node_modules/ink-mde/svelte/dist/index.d.ts` and `node_modules/ink-mde/svelte/dist/InkMde.svelte.d.ts` for Svelte.
- Package export mapping for those files is declared in `node_modules/ink-mde/package.json`.

## Key exported types, components, and functions

From `dist/index.d.ts` / `dist/client.d.ts`:

- `ink(target, options?)`
  - Main editor initializer.
- `wrap(textarea, options?)`
  - Enhances a native `textarea`.
- `hydrate(target, options?)`, `render(target, options?)`, `renderToString(options?)`, `solidPrepareForHydration()`
  - SSR-related helpers.
- `defineOptions`, `defineConfig`, `definePlugin`, `plugin`, `inkPlugin`
  - Helper utilities for typed config/plugin creation.
- `Instance`
  - Core editor handle with `destroy`, `focus`, `getDoc`, `load`, `update`, `reconfigure`, `insert`, `format`, `select`, `selections`, and `wrap` methods.
- `Options` / `OptionsResolved`
  - Main configuration shape.
- `Values`, `Markup`, `Editor.Selection`
  - String unions and selection/markup typing helpers.

## Typical React integration pattern

- Use the framework-agnostic `ink-mde` entry point, not the Vue/Svelte wrappers.
- Mount into a `div` via a React ref inside `useEffect`.
- Pass initial `doc` from fragment/service state.
- Use `hooks.afterUpdate` to sync editor changes back into React state or a debounced save flow.
- Destroy the instance on cleanup.
- If notebook or entry changes require a fresh document, call `instance.update(...)` or recreate/reconfigure the editor.

## Styling and asset requirements

- README documents styling via CSS custom properties such as `--ink-color`, `--ink-font-family`, `--ink-block-background-color`, and many syntax-token variables.
- Theme appearance is controlled through `options.interface.appearance` with `auto`, `dark`, or `light`.
- README does not document a separate CSS import step; it implies the packaged component styles are bundled, but this should be verified during implementation.
- File handling is configurable through `options.files`:
  - `clipboard`, `dragAndDrop`, `handler(files)`, `injectMarkup`, `types`.
- KaTeX support is optional through `katex: boolean`, but README does not document any extra asset import requirements beyond enabling the option/plugin.

## Useful options for Irodori

- `doc`: initial Markdown.
- `placeholder`: empty-state text.
- `hooks.afterUpdate(doc)`: primary way to keep repository-backed draft state in sync.
- `interface.readonly`: useful for preview/locked states.
- `interface.toolbar`: likely useful on mobile.
- `interface.images`: enables inline image previews.
- `files.handler(files)`: upload or local-asset bridge for pasted/dropped images.
- `toolbar.upload`: pairs with file handling if we expose uploads.
- `search`, `vim`, `readability`, `lists`, `trapTab`, `keybindings` are all configurable.
- `plugins`: accepts nested plugin arrays for CodeMirror extensions, completions, grammar, or language support.

## Minimal example tailored to this repo

```tsx
import { useEffect, useRef } from 'react';
import { ink, type Instance } from 'ink-mde';

type DiaryEditorProps = {
  doc: string;
  onDocChange: (doc: string) => void;
};

export function DiaryInkEditor({ doc, onDocChange }: DiaryEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<Instance | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    let disposed = false;

    void Promise.resolve(
      ink(rootRef.current, {
        doc,
        interface: {
          appearance: 'auto',
          toolbar: true,
          images: true,
        },
        hooks: {
          afterUpdate: onDocChange,
        },
        files: {
          dragAndDrop: true,
          clipboard: true,
          injectMarkup: true,
          types: ['image/*'],
          handler: async files => {
            // Bridge dropped/pasted files into Irodori asset storage.
            // Return markdown/image URL markup if the chosen flow needs it.
          },
        },
      })
    ).then(instance => {
      if (disposed) {
        instance.destroy();
        return;
      }
      instanceRef.current = instance;
    });

    return () => {
      disposed = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.update(doc);
  }, [doc]);

  return <div ref={rootRef} />;
}
```

- For Irodori, keep persistence in services/repositories outside the editor and treat `afterUpdate` as UI-to-state synchronization only.
- Prefer mapping upload/paste flows into local-first asset storage before sync.
