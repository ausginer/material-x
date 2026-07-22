/**
 * Pure DOM-order primitives for sortable insertions: which non-dragged items
 * precede or follow the placeholder anchor. Spatial hit testing (centre
 * measurement and nearest search) lives in the packed {@link RectIndex}.
 */
// DOM order is tested through `compareDocumentPosition`'s bitmask.
/* oxlint-disable no-bitwise */

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
