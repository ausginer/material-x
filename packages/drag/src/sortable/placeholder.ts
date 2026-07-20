/**
 * The placeholder occupying the dragged item's slot.
 *
 * `createAnchor` builds and configures the element (consumer factory or a bare
 * internal `<div>`). `PlaceholderLease` owns its DOM presence: it inserts the
 * anchor at the original slot, exposes narrow placement operations and its
 * current rect, and removes it on disposal.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import type { PlaceholderContext, SortableOptions } from './options.ts';

/** Builds and sizes the anchor without inserting or measuring it. */
export function createAnchor(
  options: SortableOptions,
  realm: DOMRealm,
  item: HTMLElement,
  visual: HTMLElement,
  rect: DOMRectReadOnly,
): HTMLElement {
  const context: PlaceholderContext = { item, visual, rect };
  const anchor =
    options.createPlaceholder?.(context) ?? realm.document.createElement('div');

  anchor.dataset['dragPlaceholder'] = '';
  anchor.setAttribute('aria-hidden', 'true');
  // Local (offset) box: unaffected by the item's own transform or ancestor zoom.
  anchor.style.width = `${visual.offsetWidth}px`;
  anchor.style.height = `${visual.offsetHeight}px`;

  if (item.slot) {
    anchor.slot = item.slot;
  }

  return anchor;
}

export type PlaceholderLease = Readonly<{
  /** The anchor element. */
  element: HTMLElement;
  /** The anchor's current viewport rect. */
  rect(): DOMRectReadOnly;
  /** Inserts the anchor immediately before `reference` (or appends to parent). */
  placeBefore(reference: ChildNode | null): void;
  /** Returns the anchor to the dragged item's home slot (idempotent). */
  returnHome(): void;
  /** Removes the anchor from the DOM. */
  dispose(): void;
}>;

/** Inserts `anchor` at `item`'s original slot and returns its lease. */
export function insertPlaceholder(
  anchor: HTMLElement,
  item: HTMLElement,
): PlaceholderLease {
  const parent = item.parentNode;
  parent?.insertBefore(anchor, item.nextSibling);
  let disposed = false;

  return {
    element: anchor,
    rect() {
      return anchor.getBoundingClientRect();
    },
    placeBefore(reference) {
      parent?.insertBefore(anchor, reference);
    },
    returnHome() {
      // `item` never leaves its DOM slot (only its rendering lifts), so its
      // current next sibling marks the home gap. Skip when already seated there,
      // since inserting a node before itself is invalid.
      if (item.nextSibling !== anchor) {
        parent?.insertBefore(anchor, item.nextSibling);
      }
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        anchor.remove();
      }
    },
  };
}
