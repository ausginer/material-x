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
import { anchorIndex, follows, neighbor } from './geometry.ts';
import type { Insertion } from './options.ts';
import { nearestSlot, refreshRectIndex, type RectIndex } from './rect-index.ts';

export type PlaceholderGeometry = Readonly<{
  element: HTMLElement;
  rect(): DOMRectReadOnly;
}>;

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
  index: RectIndex,
  placeholder: PlaceholderGeometry,
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  getVisual: (item: HTMLElement) => HTMLElement,
  pointer: Point,
  version: number,
): Insertion | null {
  refreshRectIndex(index, items, dragged, getVisual, version);

  const anchorRect = placeholder.rect();
  const anchor: Point = {
    x: anchorRect.left + anchorRect.width / 2,
    y: anchorRect.top + anchorRect.height / 2,
  };
  const slot = nearestSlot(index, anchor, pointer);

  if (slot === -1) {
    return null;
  }

  // `index.items` is the destination view (collection minus dragged, in DOM
  // order), so the slot is already the destination index and its neighbours are
  // the adjacent elements.
  const nearest = index.items[slot]!;

  // The gap sits on the side of `nearest` the anchor is travelling from: after
  // it when `nearest` currently follows the placeholder, otherwise before it.
  const gap = follows(placeholder.element, nearest) ? slot + 1 : slot;

  return {
    version,
    index: gap,
    before: index.items[gap - 1] ?? null,
    after: index.items[gap] ?? null,
  };
}

/** The insertion describing the placeholder's current (initial) slot. */
export function currentInsertion(
  placeholder: PlaceholderGeometry,
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
