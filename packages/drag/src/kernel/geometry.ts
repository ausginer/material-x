/**
 * Spatial hit testing for sortable collections.
 *
 * The collection is treated as a plain field of rectangles with no notion of
 * rows, columns, or a flow axis: a vertical list, a horizontal row, and a grid
 * are all just centres to measure against. An anchor element (the placeholder,
 * or an internal marker when the consumer supplies none) occupies the dragged
 * item's proposed slot; including the anchor as a candidate gives the gesture its
 * hysteresis — the anchor moves only once another item's centre is genuinely
 * closer than its own.
 *
 * Ported and generalized from `@ydinjs/core`'s reorderable trait.
 */
// DOM order is tested through `compareDocumentPosition`'s bitmask, so the bitwise
// AND is intrinsic to this module.
/* oxlint-disable no-bitwise */

import type { Point } from './types.ts';

/** Centre point of a rect. */
export function center(rect: DOMRectReadOnly): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Squared distance — order-preserving without the sqrt. */
function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Viewport rects of every item except `dragged`, keyed by element. */
export function measure(
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  getVisual: (item: HTMLElement) => HTMLElement,
): ReadonlyMap<HTMLElement, DOMRect> {
  const rects = new Map<HTMLElement, DOMRect>();

  for (const item of items) {
    if (item !== dragged) {
      const visual = getVisual(item);
      rects.set(item, visual.getBoundingClientRect());
    }
  }

  return rects;
}

/**
 * The item whose centre is nearest the pointer, or `null` when the anchor's own
 * slot is nearest — meaning the anchor should stay put. The anchor centre is the
 * incumbent to beat, which is what resists oscillation between two positions.
 */
export function nearestItem(
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  rects: ReadonlyMap<HTMLElement, DOMRect>,
  anchorCentre: Point,
  pointer: Point,
): HTMLElement | null {
  let best = distanceSquared(pointer, anchorCentre);
  let nearest: HTMLElement | null = null;

  for (const item of items) {
    if (item === dragged) {
      continue;
    }

    // Missing rect means the item appeared mid-drag and was never measured;
    // skip it rather than throw.
    const rect = rects.get(item);

    if (rect) {
      const d = distanceSquared(pointer, center(rect));

      if (d < best) {
        best = d;
        nearest = item;
      }
    }
  }

  return nearest;
}

/**
 * Whether `b` sits on `flag`'s side of `a` in document order. The single bitmask
 * test is confined here so the bitwise operator lives in one guarded place.
 */
const hasPosition = (a: Node, b: Node, flag: number): boolean =>
  (a.compareDocumentPosition(b) & flag) !== 0;

/** Whether `item` follows `anchor` in DOM order. */
export function follows(anchor: Element, item: Element): boolean {
  return hasPosition(anchor, item, Node.DOCUMENT_POSITION_FOLLOWING);
}

/** Landing index of the dragged item: non-dragged items before the anchor. */
export function anchorIndex(
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  anchor: Element,
): number {
  let index = 0;

  for (const item of items) {
    if (
      item !== dragged &&
      hasPosition(anchor, item, Node.DOCUMENT_POSITION_PRECEDING)
    ) {
      index += 1;
    }
  }

  return index;
}

/**
 * The non-dragged item immediately after (`following`) or before the anchor in
 * DOM order, or `null` at that edge. Used to capture the landing neighbour and to
 * step the anchor one slot for programmatic moves.
 */
export function neighbor(
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  anchor: Element,
  following: boolean,
): HTMLElement | null {
  const bit = following
    ? Node.DOCUMENT_POSITION_FOLLOWING
    : Node.DOCUMENT_POSITION_PRECEDING;
  let result: HTMLElement | null = null;

  for (const item of items) {
    if (item === dragged) {
      continue;
    }

    if (hasPosition(anchor, item, bit)) {
      if (following) {
        return item;
      }

      result = item;
    }
  }

  return result;
}
