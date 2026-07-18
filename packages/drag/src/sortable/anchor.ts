/** Builds the anchor that fills the lifted item's slot during a sort. */
import type { SortableOptions } from './options.ts';

/**
 * The placeholder occupying the dragged item's slot. Uses the consumer's
 * `createPlaceholder` when provided, otherwise a bare internal `<div>`. Either
 * way the engine sizes it to the item and matches its slot.
 */
export function createAnchor(
  options: SortableOptions,
  item: HTMLElement,
  visual: HTMLElement,
  rect: DOMRectReadOnly,
): HTMLElement {
  const anchor =
    options.createPlaceholder?.({ item, visual, rect }) ??
    document.createElement('div');

  anchor.dataset['dragPlaceholder'] = '';
  anchor.setAttribute('aria-hidden', 'true');
  // Physical width/height so a vertical writing mode does not swap them.
  anchor.style.width = `${rect.width}px`;
  anchor.style.height = `${rect.height}px`;

  // Participate in the same named slot so the anchor lays out where the item did.
  if (item.slot) {
    anchor.slot = item.slot;
  }

  return anchor;
}
