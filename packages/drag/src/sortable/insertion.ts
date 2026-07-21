/**
 * Resolves a logical insertion from spatial inputs. Composes measurement,
 * nearest-centre hysteresis, and DOM-order neighbour derivation. It is pure: it
 * reads geometry but never moves the placeholder — the committed-insertion effect
 * is the sole writer of placeholder position.
 *
 * The placeholder itself is the incumbent anchor: including it as a candidate
 * gives the gesture its hysteresis — a gap is proposed only once another item's
 * centre is genuinely closer than its own slot.
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
 * Measures the field and finds the nearest item; if it beats the placeholder's
 * own slot, returns the version-tagged {@link Insertion} for the gap one slot
 * toward it. Returns `null` when the incumbent slot wins (no change).
 *
 * The gap is derived analytically in the destination view (the collection minus
 * the dragged item), which mirrors the DOM order of the non-dragged items, so no
 * placeholder move is needed to read the resulting neighbours.
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

  const destination = items.filter((item) => item !== dragged);
  const nearestIndex = destination.indexOf(nearest);

  if (nearestIndex === -1) {
    return null;
  }

  // The gap sits on the side of `nearest` the anchor is travelling from: after
  // it when `nearest` currently follows the placeholder, otherwise before it.
  const index = follows(placeholder.element, nearest)
    ? nearestIndex + 1
    : nearestIndex;

  return {
    version,
    index,
    before: destination[index - 1] ?? null,
    after: destination[index] ?? null,
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
