# @mesh-gradient/react

- React wrapper around the WebGL-powered mesh gradient engine from `@mesh-gradient/core`.
- Solves the React-side lifecycle work for rendering an animated mesh gradient as a `<canvas>` and cleaning it up automatically.
- Best fit in Irodori: decorative, non-essential background treatment behind existing Tailwind-based UI.

## Package entry points

- Package root only: `@mesh-gradient/react`
- `package.json` points CommonJS/legacy consumers at `./dist/index.cjs` and `./dist/index.js`.
- `exports["."]` points ESM imports at `./dist/index.mjs` with types at `./dist/index.d.mts`.
- `exports["."]` points CommonJS requires at `./dist/index.js` with types at `./dist/index.d.ts`.

## Type definition files to read next

- Start with `node_modules/@mesh-gradient/react/dist/index.d.ts` for the React component props, hook return type, and callback signatures.
- Read `node_modules/@mesh-gradient/react/dist/index.d.mts` if you want to compare the ESM type entry that `exports` maps for `import` consumers.
- The important missing piece is the core options type. In this install, read `node_modules/.pnpm/@mesh-gradient+core@1.5.0/node_modules/@mesh-gradient/core/dist/index.d.ts` for `MeshGradientOptions`, `MeshGradientInitOptions`, `MeshGradientUpdateOptions`, and the `MeshGradient` class itself.
- If pnpm store layout changes later, re-check `node_modules/@mesh-gradient/react/package.json` to follow the dependency/export mapping again.

## Key exported types/components/functions

- `MeshGradient`: React component that renders the gradient canvas.
- `MeshGradientProps extends HTMLAttributes<HTMLCanvasElement>`
  - `options?: MeshGradientOptions & MeshGradientInitOptions & MeshGradientUpdateOptions`
  - `isPaused?: boolean`
  - `onInit?: (instance: MeshGradient) => void`
  - `onUpdate?: (instance: MeshGradient) => void`
- `useMeshGradient()`: hook that returns `{ instance: MeshGradient | null }`.

## Typical React integration pattern

- Render `<MeshGradient />` where a canvas background is acceptable.
- Pass normal canvas HTML props such as `className`, `aria-hidden`, and sizing attributes.
- Pass mesh configuration through the `options` prop.
- Use `isPaused` to stop animation when the screen/state should be static.
- Use `onInit` or `onUpdate` only if a feature needs access to the underlying core instance.

## Styling/assets requirements

- No CSS import is documented in the package README or type files.
- The component renders a `<canvas>`, so layout is controlled by normal canvas sizing and wrapper styles.
- README explicitly notes WebGL is required and recommends static mode for non-animated usage.
- For this repo, prefer placing it inside a positioned wrapper and controlling size with Tailwind classes.

## Minimal example tailored to this repo

```tsx
import { MeshGradient } from '@mesh-gradient/react';
import type {
  MeshGradientInitOptions,
  MeshGradientOptions,
  MeshGradientUpdateOptions,
} from '@mesh-gradient/core';

const meshOptions: MeshGradientOptions & MeshGradientInitOptions & MeshGradientUpdateOptions = {
  // Fill from @mesh-gradient/core docs/types.
};

export function DiaryBackgroundMesh() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <MeshGradient aria-hidden className="h-full w-full" options={meshOptions} isPaused={false} />
    </div>
  );
}
```

- Treat the mesh as progressive enhancement; keep diary content readable if WebGL is unavailable.
- Prefer decorative placement behind notebook/diary surfaces rather than as a critical foreground element.
