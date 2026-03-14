# @use-gesture/react

- React hook wrapper for `@use-gesture/core`.
- Best fit in Irodori: pointer/touch interactions for a modal image gallery where images need drag-to-pan, pinch-to-zoom, and optional wheel-to-zoom behavior.
- README explicitly recommends setting `touchAction` on draggable elements to avoid native touch scrolling glitches.

## Package entry points

- Package root only: `@use-gesture/react`.
- `package.json` exposes CommonJS at `dist/use-gesture-react.cjs.js` and ESM at `dist/use-gesture-react.esm.js`.
- The root type entry is `dist/use-gesture-react.cjs.d.ts`, which re-exports `dist/declarations/src/index.d.ts`.
- `dist/declarations/src/index.d.ts` re-exports the React hooks plus `@use-gesture/core` actions, utils, and types.

## Type definition files to read next

- `dist/declarations/src/index.d.ts`: root exports.
- `dist/declarations/src/useDrag.d.ts`: `useDrag` signature.
- `dist/declarations/src/usePinch.d.ts`: `usePinch` signature.
- `dist/declarations/src/useGesture.d.ts`: combined multi-gesture hook.
- `@use-gesture/core/dist/declarations/src/types/config.d.ts`: drag/pinch options.
- `@use-gesture/core/dist/declarations/src/types/state.d.ts`: gesture state fields.
- `@use-gesture/core/dist/declarations/src/types/handlers.d.ts`: handler names and handler typing.

## React hooks we care about

- `useDrag(handler, config?)`
- `usePinch(handler, config?)`
- `useGesture(handlers, config?)`

From the types, each hook returns:

- a bind function when `config.target` is not provided; spread it on an element like `<div {...bind()} />`
- `void` when `config.target` is a DOM node or ref-like target; in that mode the hook attaches listeners directly

`useGesture` is the practical choice for a gallery when one element needs both pan and zoom.

## Binding to elements

- Bind props pattern:

```tsx
const bind = useGesture({
  onDrag: state => {
    // pan image
  },
  onPinch: state => {
    // zoom image
  },
});

return <div {...bind()} style={{ touchAction: 'none' }} />;
```

- Direct target pattern:

```tsx
const ref = useRef<HTMLDivElement | null>(null);

useGesture(
  {
    onDrag: state => {
      // pan image
    },
    onPinch: state => {
      // zoom image
    },
  },
  {
    target: ref,
  }
);

return <div ref={ref} style={{ touchAction: 'none' }} />;
```

- The shared state types document `args` for values passed through `bind(...)`, so `bind(imageId)` is supported when handlers need per-element context.

## Handler state fields most useful in a gallery

Common fields from `FullGestureState`:

- `first`, `last`, `active`, `intentional`
- `movement`, `offset`, `delta`, `distance`, `direction`, `velocity`
- `initial`, `values`, `lastOffset`, `overflow`
- `down`, `pressed`, `touches`, modifier keys, `buttons`, `locked`
- `event`, `target`, `currentTarget`, `type`
- `timeStamp`, `elapsedTime`, `timeDelta`
- `memo`, `args`

Drag-specific fields:

- `tap`: true when drag was recognized as a tap
- `swipe`: `[x, y]` swipe direction info
- `cancel()`, `canceled`
- `xy`: pointer coordinates alias
- `axis`: resolved drag axis

Pinch-specific fields:

- `da`: distance and angle alias
- `origin`: pinch center or wheel cursor position
- `turns`: full rotations accumulated during gesture
- `axis`: `'scale' | 'angle' | undefined`
- `cancel()`, `canceled`

## Options relevant for modal image interactions

Shared / generic:

- `enabled`: disable gestures conditionally
- `target`: attach to element/ref instead of spreading bind props
- `eventOptions`: passive/capture listener options
- `preventDefault`: prevent default browser behavior for gesture events
- `threshold`: require minimum movement before intent is recognized
- `from`: starting offset
- `transform(v)`: map movement/offset into another coordinate space
- `triggerAllEvents`: fire handlers before threshold is crossed
- `rubberband`: allow elastic overflow; `true` defaults to `0.15`

Drag options:

- `bounds`: limit drag offset; accepts explicit bounds, an `HTMLElement`, a ref-like object, or a function
- `filterTaps`: ignore simple clicks/taps so drag logic does not run for tap-only interactions
- `tapsThreshold`: max displacement still considered a tap
- `axis`: `'x' | 'y' | 'lock'`
- `pointer.buttons`: restrict which mouse buttons start drag
- `pointer.touch`, `pointer.mouse`, `pointer.keys`, `pointer.capture`, `pointer.lock`
- `swipe.velocity`, `swipe.distance`, `swipe.duration`
- `delay`: delay drag handler start
- `preventScroll`: delay before drag prevents scroll; `true` defaults to `250ms`
- `preventScrollAxis`: `'x' | 'y' | 'xy'`
- `axisThreshold`: per-pointer-type axis detection threshold
- `keyboardDisplacement`: arrow-key drag distance

Pinch options:

- `scaleBounds`: min/max zoom limits
- `angleBounds`: min/max rotation limits
- `axis: 'lock'`: scale or rotate, but not both at once
- `pointer.touch`: use touch events on touch devices
- `modifierKey`: wheel-to-pinch modifier key; defaults to `ctrlKey`
- `pinchOnWheel`: whether wheel can trigger pinch at all
- `rubberband`: elastic overscroll for zoom/rotation bounds

## Practical gallery guidance

- Use `useGesture` on the image viewport when drag and pinch must share one transform state.
- Drive panning from drag `offset` or `movement`.
- Drive zoom from pinch `offset[0]` or `da[0]`, and keep it inside `scaleBounds`.
- Use `origin` to zoom toward the cursor/focal point instead of always zooming to center.
- Use drag `bounds` plus `rubberband` to keep panning constrained but still feel responsive at the edges.
- Turn on `filterTaps` so a click meant to close/select does not also count as a drag.
- Keep `touchAction: 'none'` on the interactive surface, especially for touch panning.

## Minimal example tailored to this repo

```tsx
import { useGesture } from '@use-gesture/react';

export function GalleryImageViewport() {
  const bind = useGesture(
    {
      onDrag: ({ offset: [x, y], tap }) => {
        if (tap) return;
        // update pan state
      },
      onPinch: ({ offset: [scale, angle], origin }) => {
        // update zoom state with scale
        // optionally use angle/origin if rotation or focal zoom is needed
      },
    },
    {
      drag: {
        bounds: { left: -320, right: 320, top: -240, bottom: 240 },
        rubberband: true,
        filterTaps: true,
      },
      pinch: {
        scaleBounds: { min: 1, max: 4 },
        rubberband: true,
      },
    }
  );

  return <div {...bind()} style={{ touchAction: 'none' }} />;
}
```

- If the gallery should support wheel zoom, keep `pinchOnWheel` enabled and decide whether the default `modifierKey: 'ctrlKey'` is acceptable for the product interaction model.
- If implementation details are unclear later, prefer checking the exported core types first because the React package mostly forwards those definitions.
