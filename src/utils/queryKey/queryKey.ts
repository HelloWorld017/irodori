import { stableJSONSerialize } from '../json';
import type { RouteKind } from '../route';

export type QueryRouteKind = 'common' | RouteKind;
export type QueryActions = {
  entries: {
    // TODO
    notebook: string;
  };
};

export const queryKey = (route: RouteKind | 'common', action: string, params?: unknown) => [
  route,
  action,
  params,
];

export const batchKey = (...params: Parameters<typeof queryKey>) => stableJSONSerialize(params);
