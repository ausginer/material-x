/**
 * Resolves one admitted item from a pointer path. Validates tracked item
 * identity and handle membership, including the item itself as its handle.
 */
export function resolveSortablePress(
  event: PointerEvent,
  items: readonly HTMLElement[],
  getHandle: ((item: HTMLElement) => HTMLElement | null) | undefined,
): HTMLElement | null {
  const path = event.composedPath();
  const itemSet = new Set(items);
  const itemIndex = path.findIndex(
    (node) => node instanceof HTMLElement && itemSet.has(node),
  );

  if (itemIndex === -1) {
    return null;
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const item = path[itemIndex] as HTMLElement;
  const handle = getHandle?.(item);

  // The handle may be the item itself or a descendant, so the search includes
  // the item's own path node (`itemIndex + 1`).
  if (handle && !path.slice(0, itemIndex + 1).includes(handle)) {
    return null;
  }

  return item;
}
