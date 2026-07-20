/**
 * Resolves a logical insertion from spatial inputs and presents it by placing
 * the placeholder. Composes measurement, nearest-centre hysteresis, and DOM-order
 * neighbour derivation.
 *
 * The placeholder itself is the incumbent anchor: including it as a candidate
 * gives the gesture its hysteresis — it moves only once another item's centre is
 * genuinely closer than its own slot.
 */
import type { Point } from '../kernel/types.ts';
import {
  anchorIndex,
  center,
  follows,
  measure,
  neighbor,
  nearestItem,
} from './geometry.ts';
import type { Insertion } from './options.ts';
import type { PlaceholderLease } from './placeholder.ts';

/**
 * Measures the field, finds the nearest item, and if it beats the placeholder's
 * own slot, moves the placeholder one slot toward it and returns the resulting
 * version-tagged {@link Insertion}. Returns `null` when the incumbent slot wins
 * (no change).
 */
export function resolveSpatialInsertion(
  placeholder: PlaceholderLease,
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  getVisual: (item: HTMLElement) => HTMLElement,
  pointer: Point,
  version: number,
): Insertion | null {
  const rects = measure(items, dragged, getVisual);
  const anchorCentre = center(placeholder.rect());
  const nearest = nearestItem(items, dragged, rects, anchorCentre, pointer);

  if (!nearest) {
    return null;
  }

  const anchor = placeholder.element;

  // Move the placeholder one slot toward the nearest item.
  if (follows(anchor, nearest)) {
    placeholder.placeBefore(nearest.nextSibling);
  } else {
    placeholder.placeBefore(nearest);
  }

  return {
    version,
    index: anchorIndex(items, dragged, anchor),
    before: neighbor(items, dragged, anchor, false),
    after: neighbor(items, dragged, anchor, true),
  };
}

/** The insertion describing the placeholder's current (initial) slot. */
export function currentInsertion(
  placeholder: PlaceholderLease,
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  version: number,
): Insertion {
  const anchor = placeholder.element;
  return {
    version,
    index: anchorIndex(items, dragged, anchor),
    before: neighbor(items, dragged, anchor, false),
    after: neighbor(items, dragged, anchor, true),
  };
}
