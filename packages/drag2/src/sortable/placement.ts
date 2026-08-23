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
import type { OffsetBox } from '../kernel/types.ts';
import type { Insertion } from './domain.ts';

/** What a `placeholder` factory is handed. Geometry, and all three elements. */
export type PlaceholderContext = Readonly<{
  item: HTMLElement;
  /** The node faithfully lifted (D-43). */
  visual: HTMLElement;
  /** The geometry source, or `visual` when the config named no `box` (D-43). */
  box: HTMLElement;
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
 * The undo ledger a **consumer-owned** placeholder accumulates while it is
 * being prepared (D-39).
 *
 * `null` for the library's own `<div>`: dropping the element *is* the undo, and
 * recording anything for it would be ceremony over a node nobody else can see.
 * An array is the whole mechanism — `activation.rollback` runs it in reverse.
 */
export type PlaceholderUndo = Array<() => void> | null;

/**
 * Records one undo, **before** the write it reverses.
 *
 * Before rather than after, so a mechanics run that stops mid-way — the
 * liveness readings below can return at six different points — leaves a ledger
 * that exactly covers what was written and nothing more. An undo for a write
 * that never happened is not harmless: restoring an attribute the library did
 * not touch is itself a mutation of a consumer's element.
 */
const willWrite = (undo: PlaceholderUndo, revert: () => void): void => {
  undo?.push(revert);
};

/**
 * Restores an attribute to the value it had, or removes it if it had none.
 *
 * **The removal is `removeNamedItem`, not `removeAttribute`, and that is a
 * measured platform difference rather than a style preference.** After an
 * inline style property has been written through the CSSOM,
 * `removeAttribute('style')` leaves `style=""` behind in Chromium — the name
 * survives in `getAttributeNames()` and in `outerHTML`, on connected and
 * detached elements alike — while `attributes.removeNamedItem('style')` removes
 * it cleanly. D-39's guarantee is stated as an attribute-map comparison, so an
 * empty leftover attribute is a real difference and not a cosmetic one.
 * `removeNamedItem` throws when the attribute is absent, hence the guard.
 */
const restoreAttribute = (element: HTMLElement, name: string): (() => void) => {
  const previous = element.getAttribute(name);

  return previous === null
    ? () => {
        if (element.hasAttribute(name)) {
          element.attributes.removeNamedItem(name);
        }
      }
    : () => {
        element.setAttribute(name, previous);
      };
};

/**
 * Applies the mechanics that are **always present and not configurable away**,
 * whether the element came from a feature factory or from the default below:
 * it occupies exactly one insertion position, is hidden from assistive
 * technology, inherits the item's slot, and is sized from the **footprint the
 * visual removed** — computed by the caller across the lift (D-43), never
 * measured here.
 *
 * **The sizing input changed and the measurement moved out** (D-43, D-52). It
 * used to read `visual.offsetWidth`/`offsetHeight` right here, which is the
 * visual's own box rather than the space its removal freed; where the box keeps
 * a sibling in flow those differ, and api-1 measured them 30 px apart. The
 * windows now straddle `acquireLift` — one owned by the kernel, one by
 * `activation.prepare` — and neither is reachable from this function, so it
 * takes the answer instead of computing it.
 *
 * Beyond this the library writes no visual styling.
 */
function applyMechanics(
  placeholder: HTMLElement,
  item: HTMLElement,
  footprint: OffsetBox,
  live: () => boolean,
  undo: PlaceholderUndo,
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
  const { width, height } = footprint;

  if (!live()) {
    return;
  }

  willWrite(undo, restoreAttribute(placeholder, 'data-drag-placeholder'));
  placeholder.setAttribute('data-drag-placeholder', '');

  if (!live()) {
    return;
  }

  willWrite(undo, restoreAttribute(placeholder, 'aria-hidden'));
  placeholder.setAttribute('aria-hidden', 'true');

  if (!live()) {
    return;
  }

  // Mirrored, not merely copied. A custom placeholder may arrive carrying a
  // `slot` of its own; leaving that in place when the item has none puts the
  // footprint in a different slot from the item it stands for, which is the
  // opposite of "inherits the item's slot".
  //
  // **Which is exactly why the undo is `restoreAttribute` and not
  // `removeAttribute`** (D-39): the branch below *removes* a consumer's own
  // `slot="mine"`, so an undo that only knew how to delete would leave the
  // element permanently missing an attribute the library never granted it.
  willWrite(undo, restoreAttribute(placeholder, 'slot'));

  if (slot === null) {
    placeholder.removeAttribute('slot');
  } else {
    placeholder.setAttribute('slot', slot);
  }

  if (!live()) {
    return;
  }

  // **One undo for all three property writes, and it is stronger than three**
  // (D-39). 05 asks for a normalizing undo registered first so LIFO runs it
  // last, because removing three *properties* leaves `style=""` behind — a
  // residue on a consumer-owned element and a real difference in an
  // attribute-map comparison. Restoring the whole attribute answers that and
  // the three property values at once, so there is nothing left for an ordering
  // rule to arrange: an element that arrived with `style="color:red"` gets that
  // string back, and one that arrived with no `style` attribute ends with none.
  //
  // Registered here rather than at the top so a mechanics run that stops before
  // the style block records no style undo at all. An undo for a write that
  // never happened is not free — it is a `removeAttribute` on someone else's
  // element.
  willWrite(undo, restoreAttribute(placeholder, 'style'));

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
 * `footprint` is what the visual removed from the layout, already computed
 * across the lift by the caller — see `activation.prepare`.
 *
 * `undo` is the rollback ledger (D-39), filled only for a `placeholder` slot's
 * element: the default `<div>` is dropped whole, so recording an undo for it
 * would be work no one can observe.
 */
export function createPlaceholder(
  realm: DOMRealm,
  context: PlaceholderContext,
  footprint: OffsetBox,
  factory: PlaceholderSlot | null,
  live: () => boolean,
  undo: PlaceholderUndo,
): HTMLElement {
  const { item, visual } = context;

  if (factory === null) {
    const placeholder = realm.document.createElement('div');

    // `null`, not `undo`, and this is the whole of D-39's "the library's own
    // `<div>` records no rollback": nothing outside this function has ever seen
    // it, so discarding the reference undoes every write at once.
    applyMechanics(placeholder, item, footprint, live, null);
    return placeholder;
  }

  const placeholder = factory(context, live);

  // **The terminal barrier on the factory** (I-36, C4-01). The factory is
  // consumer code, and everything below it touches consumer-owned elements:
  // the adoption check reads `isConnected`, and `applyMechanics` writes
  // attributes and inline styles onto the returned element, all overridable on
  // a consumer's custom element. The mechanics carry their own readings from
  // C5-02; this one covers the factory itself and the adoption check between
  // them.
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
    throw new TypeError('drag: sortable/placeholder-not-detached');
  }

  applyMechanics(placeholder, item, footprint, live, undo);
  return placeholder;
}

/**
 * Whether the placeholder already occupies `insertion`.
 *
 * Exported because inertness has to be decidable *before* the move: the move
 * pipeline brackets the write with `beforeMove`/`afterMove` hooks, and a hook
 * that measures the whole list must not be paid for a write that will not
 * happen (contract 06 §The coalesced spatial frame, whose sole writer
 * reports whether a move occurred).
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
    // Refused rather than obeyed: following the anchor would move the
    // placeholder out of the list it belongs to.
    throw new Error('drag: sortable/anchor-outside-container');
  }

  if (after !== null) {
    after.before(placeholder);
  } else {
    insertion.before!.after(placeholder);
  }

  return true;
}
