/**
 * Pure spatial primitives for sortable hit testing. The collection is a plain
 * field of rectangles with no notion of rows, columns, or a flow axis; a
 * vertical list, horizontal row, and grid are all just centres to measure.
 */
// DOM order is tested through `compareDocumentPosition`'s bitmask.
/* oxlint-disable no-bitwise */
import type { Point } from '../kernel/types.ts';

/** Centre point of a rect. */
export function center(rect: DOMRectReadOnly): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

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
      rects.set(item, getVisual(item).getBoundingClientRect());
    }
  }

  return rects;
}

/**
 * The item whose centre is nearest the pointer, or `null` when the anchor's own
 * slot is nearest — meaning the anchor should stay put. The anchor centre is the
 * incumbent to beat, which resists oscillation.
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

const hasPosition = (a: Node, b: Node, flag: number): boolean =>
  (a.compareDocumentPosition(b) & flag) !== 0;

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
 * DOM order, or `null` at that edge.
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

/** Whether `item` follows `anchor` in DOM order. */
export function follows(anchor: Element, item: Element): boolean {
  return hasPosition(anchor, item, Node.DOCUMENT_POSITION_FOLLOWING);
}
