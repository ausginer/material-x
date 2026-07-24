/** Resolves a consumer bounds source to a viewport rect. */
import type { DOMRealm } from '../kernel/realm.ts';
import type { DragBounds } from './options.ts';

export const BOUNDS_VIEWPORT = 'viewport';

/** Resolves a bounds source to a viewport rect, or `null` for unbounded. */
export function resolveBounds(
  bounds: DragBounds | undefined,
  realm: DOMRealm,
): DOMRectReadOnly | null {
  if (!bounds) {
    return null;
  }

  if (bounds === BOUNDS_VIEWPORT) {
    return new realm.window.DOMRectReadOnly(
      0,
      0,
      realm.window.innerWidth,
      realm.window.innerHeight,
    );
  }

  if (typeof bounds === 'function') {
    return bounds();
  }

  return bounds.getBoundingClientRect();
}
