/**
 * The placeholder: its default mechanics, and the **single canonical writer**
 * of its position.
 *
 * The placeholder is the dragged item's authoritative layout footprint for the
 * whole operation — created detached during `activation.prepare`, inserted as a
 * post-commit effect, never duplicated or lost, and removed when
 * presentation is released, which is after the landing target is measured and
 * before the terminal callback.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import type { OffsetBox } from '../kernel/types.ts';
import type { Insertion } from './domain.ts';

/** What a `placeholder` factory is handed. Geometry, and all three elements. */
export type PlaceholderContext = Readonly<{
  item: HTMLElement;
  /** The node faithfully lifted. */
  visual: HTMLElement;
  /** The geometry source, or `visual` when the config named no `box`. */
  box: HTMLElement;
  rect: DOMRectReadOnly;
}>;

export type PlaceholderFactory = (context: PlaceholderContext) => HTMLElement;

/**
 * Applies the mechanics that are **always present and not configurable away**,
 * whether the element came from a feature factory or from the default below: it
 * occupies exactly one insertion position, is hidden from assistive technology,
 * inherits the item's slot, and is sized from the **footprint the visual
 * removed** — computed by the caller across the lift, never measured here. The
 * two windows straddle `acquireLift`, one owned by the kernel and one by
 * `activation.prepare`, and neither is reachable from this function, so it
 * takes the answer instead of computing it.
 *
 * Beyond this the library writes no visual styling.
 */
function applyMechanics(
  placeholder: HTMLElement,
  item: HTMLElement,
  footprint: OffsetBox,
  live: () => boolean,
): void {
  // Every read first, then every write. Each call below is consumer-reachable —
  // `getAttribute` on the item, the offset getters on the visual,
  // `setAttribute`/`style` on a placeholder a `placeholder()` feature may own —
  // and the element is not adopted until `activation.prepare` returns, so a
  // mutation left on it after `destroy()` is a residue teardown never undoes.
  // Ordering the reads ahead of the writes makes the whole read run one stretch
  // that leaves nothing behind whichever of them closes the controller; each
  // write then carries its own reading, so the sequence stops before the next
  // surviving mutation rather than after it.
  const slot = item.getAttribute('slot');
  const { width, height } = footprint;

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
 * creates one; the `placeholder` config slot only customises the element.
 *
 * `live` is the library's own barrier and is **not** handed to the factory: the
 * reading that matters is the one between the factory returning and the
 * mechanics writing on the element it returned, and that one is taken here.
 *
 * `footprint` is what the visual removed from the layout, already computed
 * across the lift by the caller — see `activation.prepare`.
 */
export function createPlaceholder(
  realm: DOMRealm,
  context: PlaceholderContext,
  footprint: OffsetBox,
  factory: PlaceholderFactory | null,
  live: () => boolean,
): HTMLElement {
  const { item } = context;

  if (!factory) {
    const placeholder = realm.document.createElement('div');

    applyMechanics(placeholder, item, footprint, live);
    return placeholder;
  }

  const placeholder = factory(context);

  // The terminal barrier on the factory. The factory is consumer code, and
  // everything below it touches consumer-owned elements: the adoption check
  // reads `isConnected`, and `applyMechanics` writes attributes and inline
  // styles onto the returned element, all overridable on a consumer's custom
  // element. The mechanics carry their own readings; this one covers the
  // factory itself and the adoption check between them.
  //
  // Returned unmechanized rather than thrown: a consumer destroying its own
  // controller is not a library failure.
  if (!live()) {
    return placeholder;
  }

  // Nothing checks the factory's result. It is adopted — activation inserts it,
  // every move relocates it, teardown removes it — and `config.ts` publishes
  // the detachedness requirement on the slot itself, as a documented boundary
  // rather than a guard. An author who ignores it hands the library ownership
  // of a node the page owns, and teardown removes it.
  applyMechanics(placeholder, item, footprint, live);
  return placeholder;
}

/**
 * Whether the placeholder already occupies `insertion`.
 *
 * Exported because inertness has to be decidable *before* the move. The
 * committed-move bracket opens on the answer: a frame whose gap is already
 * correct performs no write, advances no cache, starts no contribution and
 * raises no staleness, so the whole of it is skipped rather than entered and
 * reported inert.
 */
export function placeholderAt(
  placeholder: HTMLElement,
  insertion: Insertion,
): boolean {
  const { after, before } = insertion;

  if (after) {
    return after.previousElementSibling === placeholder;
  }

  // An empty destination view: there is no gap to express, so the placeholder
  // is trivially where it belongs.
  if (!before) {
    return true;
  }

  return before.nextElementSibling === placeholder;
}

/**
 * Moves the placeholder into `insertion` and reports **whether it moved**; does
 * nothing when it is already there.
 *
 * Anchored on `after`, with an append fallback for an end gap: anchoring on
 * `before` instead is a silent no-op for a start gap, where `before` is `null`,
 * and the placeholder never reaches the head of the list.
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
 * move, the release write, home recovery and destination recovery alike.
 * Refused here so each of them classifies it at its own stage
 * (`PLACEHOLDER_MOVE`, `RELEASE`, `LANDING_TARGET`) instead of discovering it
 * as DOM corruption.
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
    // Refused rather than obeyed: following the anchor would move the
    // placeholder out of the list it belongs to.
    throw new Error('drag: sortable/anchor-outside-container');
  }

  if (after) {
    after.before(placeholder);
  } else {
    insertion.before!.after(placeholder);
  }

  return true;
}
