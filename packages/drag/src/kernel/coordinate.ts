/**
 * Coordinate mapping between viewport space and a consumer-selected local space.
 *
 * M1 ships only the identity mapper: viewport pixels are treated as local
 * pixels, matching the reference reorderable behaviour. M2 replaces this with a
 * `DOMMatrix`-backed mapper that accounts for zoom and nested transforms, behind
 * the same {@link CoordinateMapper} interface, so entries need no change.
 */
import type { CoordinateMapper, Point } from './types.ts';

/** A mapper that leaves points and deltas untouched. */
export const IDENTITY_MAPPER: CoordinateMapper = {
  toViewport(point: Point) {
    return point;
  },
  fromViewport(point: Point) {
    return point;
  },
  deltaFromViewport(delta: Point) {
    return delta;
  },
};
