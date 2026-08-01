/**
 * The placeholder: its default mechanics, and the **single canonical writer**
 * of its position (D-27).
 *
 * The placeholder is the dragged item's authoritative layout footprint for the
 * whole operation — created detached during `activation.prepare`, inserted as a
 * post-commit effect, never duplicated or lost, valid while the lifted visual is
 * landing, released only when both gates are complete.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import type { Insertion } from './domain.ts';

/** What a `placeholder()` factory is handed. Geometry, and both elements. */
export type PlaceholderContext = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  rect: DOMRectReadOnly;
}>;

export type PlaceholderFactory = (context: PlaceholderContext) => HTMLElement;

/**
 * Applies the mechanics that are **always present and not configurable away**,
 * whether the element came from a feature factory or from the default below:
 * it occupies exactly one insertion position, is hidden from assistive
 * technology, inherits the item's slot, and is sized from the visual's
 * **offset** box — which, unlike a bounding rect, is unaffected by the item's
 * transform or by ancestor zoom.
 *
 * Beyond this the library writes no visual styling.
 */
function applyMechanics(
  placeholder: HTMLElement,
  item: HTMLElement,
  visual: HTMLElement,
): void {
  placeholder.setAttribute('data-drag-placeholder', '');
  placeholder.setAttribute('aria-hidden', 'true');

  const slot = item.getAttribute('slot');

  if (slot !== null) {
    placeholder.setAttribute('slot', slot);
  }

  placeholder.style.boxSizing = 'border-box';
  placeholder.style.width = `${visual.offsetWidth}px`;
  placeholder.style.height = `${visual.offsetHeight}px`;
}

/**
 * Creates the operation's placeholder, **detached**. The behavior always
 * creates one; a `placeholder()` feature only customises the element.
 */
export function createPlaceholder(
  realm: DOMRealm,
  item: HTMLElement,
  visual: HTMLElement,
  rect: DOMRectReadOnly,
  factory: PlaceholderFactory | null,
): HTMLElement {
  const placeholder = factory
    ? factory({ item, visual, rect })
    : realm.document.createElement('div');

  applyMechanics(placeholder, item, visual);
  return placeholder;
}

/**
 * Moves the placeholder into `insertion`, and **does nothing when it is already
 * there**.
 *
 * Anchored on `after`, with an append fallback for an end gap. Probe 1's
 * `before?.after(…)` was a silent no-op for a start gap, where `before` is
 * `null` — the placeholder simply never reached the head of the list (F-31).
 *
 * The inertness check is not an optimisation: `Node.before()` and `append()` on
 * an already-correct position are a remove-and-reinsert, which resets CSS
 * transitions on the placeholder and forces a reflow. Release invokes this
 * unconditionally, and the common case is that nothing needs to move.
 */
export function movePlaceholder(
  placeholder: HTMLElement,
  insertion: Insertion,
): void {
  const { after, before } = insertion;

  if (after !== null) {
    if (after.previousElementSibling !== placeholder) {
      after.before(placeholder);
    }

    return;
  }

  if (before === null) {
    return; // an empty destination view: there is no gap to express
  }

  if (before.nextElementSibling !== placeholder) {
    before.after(placeholder);
  }
}
