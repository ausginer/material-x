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
 * The **internal** slot shape: the public {@link PlaceholderFactory} a consumer
 * writes, plus the liveness reading the library hands its own `placeholder()`
 * feature (I-36 (1)).
 *
 * Widening the contribution rather than `PlaceholderFactory` is what keeps the
 * shape a consumer implements unchanged — a consumer factory simply ignores the
 * second argument — while giving the one first-party module that mutates a
 * consumer-owned element between two of its own statements a reading to stand
 * behind (C5-03's stretch sweep).
 */
export type PlaceholderSlot = (
  context: PlaceholderContext,
  live: () => boolean,
) => HTMLElement;

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
  live: () => boolean,
): void {
  // **Every read first, then every write** (I-36 (2) act 3, C5-02). Each call
  // below is consumer-reachable — `getAttribute` on the item, the offset
  // getters on the visual, `setAttribute`/`style` on a placeholder a
  // `placeholder()` feature may own — and the element is not adopted until
  // `activation.prepare` returns, so a mutation left on it after `destroy()` is
  // a residue teardown never undoes. Ordering the reads ahead of the writes
  // makes the whole read run one stretch that leaves nothing behind whichever
  // of them closes the controller; each write then carries its own reading, so
  // the sequence stops before the next surviving mutation rather than after it.
  const slot = item.getAttribute('slot');
  const width = visual.offsetWidth;
  const height = visual.offsetHeight;

  if (!live()) {
    return;
  }

  placeholder.setAttribute('data-drag-placeholder', '');

  if (!live()) {
    return;
  }

  placeholder.setAttribute('aria-hidden', 'true');

  if (!live()) {
    return;
  }

  // Mirrored, not merely copied. A custom placeholder may arrive carrying a
  // `slot` of its own; leaving that in place when the item has none puts the
  // footprint in a different slot from the item it stands for, which is the
  // opposite of "inherits the item's slot".
  if (slot === null) {
    placeholder.removeAttribute('slot');
  } else {
    placeholder.setAttribute('slot', slot);
  }

  if (!live()) {
    return;
  }

  // Read once: `style` is an overridable accessor on a custom element, and a
  // consumer declaration's property setters are consumer code like any other.
  const { style } = placeholder;

  style.boxSizing = 'border-box';

  if (!live()) {
    return;
  }

  style.width = `${width}px`;

  if (!live()) {
    return;
  }

  style.height = `${height}px`;
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
  factory: PlaceholderSlot | null,
  live: () => boolean,
): HTMLElement {
  if (factory === null) {
    const placeholder = realm.document.createElement('div');

    applyMechanics(placeholder, item, visual, live);
    return placeholder;
  }

  const placeholder = factory({ item, visual, rect }, live);

  // **The terminal barrier on the factory** (I-36, C4-01). The factory is
  // consumer code, and everything below it touches consumer-owned elements:
  // the adoption check reads `isConnected`, and `applyMechanics` reads
  // `visual.offsetWidth`/`offsetHeight` and writes attributes and inline styles
  // onto the returned element, all overridable on a consumer's custom element.
  // The mechanics carry their own readings from C5-02; this one covers the
  // factory itself and the adoption check between them.
  //
  // Returned unmechanized rather than thrown, and the adoption check is skipped
  // with it: a consumer destroying its own controller is not a library failure
  // (C2-01 §What this does not close), and nothing here has been adopted —
  // `activation.prepare` has published nothing and `preparationValid()` discards
  // the whole preparation, so the element is dropped rather than inserted.
  if (!live()) {
    return placeholder;
  }

  // The factory is consumer code and its result is **adopted**: activation
  // inserts it, every move relocates it, and teardown removes it. So returning
  // the dragged item, its visual, or any node already in the document hands
  // the library ownership of something the page owns — and the teardown
  // removal then deletes it. Refused here, inside `activation.prepare`, where
  // the seam classifies it as `FAILURE_ACTIVATION` and nothing has been
  // inserted yet; the alternative is discovering it later as DOM corruption
  // with no way to attribute it.
  if (
    !realm.isElement(placeholder) ||
    placeholder === item ||
    placeholder === visual ||
    placeholder.isConnected
  ) {
    throw new TypeError(
      'drag: placeholder() must return a detached element that is neither the dragged item nor its visual',
    );
  }

  applyMechanics(placeholder, item, visual, live);
  return placeholder;
}

/**
 * Whether the placeholder already occupies `insertion`.
 *
 * Exported because inertness has to be decidable *before* the move: the move
 * pipeline brackets the write with `beforeMove`/`afterMove` hooks, and a hook
 * that measures the whole list must not be paid for a write that will not
 * happen (contract 06 §the writer reports whether a move occurred).
 */
export function placeholderAt(
  placeholder: HTMLElement,
  insertion: Insertion,
): boolean {
  const { after, before } = insertion;

  if (after !== null) {
    return after.previousElementSibling === placeholder;
  }

  // An empty destination view: there is no gap to express, so the placeholder
  // is trivially where it belongs.
  if (before === null) {
    return true;
  }

  return before.nextElementSibling === placeholder;
}

/**
 * Moves the placeholder into `insertion` and reports **whether it moved**;
 * does nothing when it is already there.
 *
 * Anchored on `after`, with an append fallback for an end gap. Probe 1's
 * `before?.after(…)` was a silent no-op for a start gap, where `before` is
 * `null` — the placeholder simply never reached the head of the list (F-31).
 *
 * The inertness check is not an optimisation: `Node.before()` and `append()` on
 * an already-correct position are a remove-and-reinsert, which resets CSS
 * transitions on the placeholder and forces a reflow. Release invokes this
 * unconditionally, and the common case is that nothing needs to move.
 *
 * **The anchor must be in the placeholder's own container**, and that is
 * checked rather than assumed. `before()`/`after()` are relative to the anchor,
 * so an anchor the consumer has reparented mid-drag does not fail — it silently
 * *moves the placeholder into the other container*, taking the drag's layout
 * footprint out of the list it belongs to. Every caller reaches this with an
 * insertion built from a snapshot that may be older than the DOM: the spatial
 * move, the release write, home recovery and destination recovery alike. Refused
 * here so each of them classifies it at its own stage (`PLACEHOLDER_MOVE`,
 * `RELEASE`, `LANDING_TARGET`) instead of discovering it as DOM corruption.
 */
export function movePlaceholder(
  placeholder: HTMLElement,
  insertion: Insertion,
): boolean {
  if (placeholderAt(placeholder, insertion)) {
    return false;
  }

  const { after } = insertion;
  const anchor = after ?? insertion.before!;

  if (anchor.parentNode !== placeholder.parentNode) {
    throw new Error(
      'drag: the insertion anchor is not in the placeholder’s container; refusing to move the placeholder out of the list',
    );
  }

  if (after !== null) {
    after.before(placeholder);
  } else {
    insertion.before!.after(placeholder);
  }

  return true;
}
