/** Resolves which tracked item a pointer press targets. */
import type { SortableOptions } from './options.ts';

/**
 * The tracked item pressed, honouring an optional handle gate, or `null` when
 * the press missed a tracked item (or its required handle).
 */
export function resolveItem(
  event: PointerEvent,
  items: readonly HTMLElement[],
  options: SortableOptions,
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
  const handle = options.getHandle?.(item);

  if (handle && !path.slice(0, itemIndex).includes(handle)) {
    return null;
  }

  return item;
}
