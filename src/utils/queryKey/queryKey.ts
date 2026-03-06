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
