/**
 * The placeholder: its default mechanics, and the single canonical writer of
 * its position.
 *
 * The placeholder is the dragged item's authoritative layout footprint for the
 * whole operation. It is created detached during `activation.prepare` and
 * inserted as a post-commit effect. It is never duplicated or lost. It is
 * removed when presentation is disposed, which is after the landing target is
 * measured and before the terminal callback.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import type { OffsetBox } from '../kernel/types.ts';
import type { Insertion } from './domain.ts';

/** What a `placeholder` factory receives: the geometry and each element. */
export type PlaceholderContext = Readonly<{
  item: HTMLElement;
  /** The node the drag lifts. */
  visual: HTMLElement;
  /** The geometry source, or `visual` when the config named no `box`. */
  box: HTMLElement;
  rect: DOMRectReadOnly;
}>;

export type PlaceholderFactory = (context: PlaceholderContext) => HTMLElement;

/**
 * Applies the mechanics that are always present and cannot be configured away,
 * whether the element came from a feature factory or from the default below.
 * The placeholder occupies exactly one insertion position, is hidden from
 * assistive technology, inherits the item's slot, and is sized from the
 * footprint the visual removed. The caller computes that footprint across the
 * lift, and this function does not measure it. The two measurement windows
 * straddle `acquireLift`, one owned by the kernel and one by
 * `activation.prepare`. This function can reach neither, so it takes the result
 * as a parameter.
 *
 * Beyond this the library writes no visual styling.
 */
function applyMechanics(
  placeholder: HTMLElement,
  item: HTMLElement,
  footprint: OffsetBox,
): void {
  const slot = item.getAttribute('slot');
  const { width, height } = footprint;

  placeholder.setAttribute('data-drag-placeholder', '');
  placeholder.setAttribute('aria-hidden', 'true');

  // Mirror the attribute; do not merely copy it. A custom placeholder may
  // arrive with a `slot` of its own. Leaving that in place when the item has
  // none puts the footprint in a different slot from the item it stands for.
  if (slot === null) {
    placeholder.removeAttribute('slot');
  } else {
    placeholder.setAttribute('slot', slot);
  }

  // Read once: `style` is an overridable accessor on a custom element, and a
  // consumer declaration's property setters are consumer code like any other.
  const { style } = placeholder;

  style.boxSizing = 'border-box';
  style.width = `${width}px`;
  style.height = `${height}px`;
}

/**
 * Creates the operation's placeholder, detached. The behavior always creates
 * one, and the `placeholder` config slot only customises the element.
 *
 * `footprint` is what the visual removed from the layout, already computed
 * across the lift by the caller. See `activation.prepare`.
 */
export function createPlaceholder(
  realm: DOMRealm,
  context: PlaceholderContext,
  footprint: OffsetBox,
  factory: PlaceholderFactory | null,
): HTMLElement {
  const { item } = context;

  if (!factory) {
    const placeholder = realm.document.createElement('div');

    applyMechanics(placeholder, item, footprint);
    return placeholder;
  }

  const placeholder = factory(context);

  // Nothing checks the factory's result. The library adopts it: activation
  // inserts it, every move relocates it, and teardown removes it. `config.ts`
  // publishes the detachedness requirement on the slot itself, as a documented
  // boundary and not a guard. An author who ignores the requirement gives the
  // library ownership of a node the page owns, and teardown removes that node.
  applyMechanics(placeholder, item, footprint);
  return placeholder;
}

/**
 * Whether the placeholder already occupies `insertion`.
 *
 * Exported because inertness must be decidable before the move, and the
 * committed-move path starts only on the answer. A frame whose gap is already
 * correct performs no write, advances no cache, starts no contribution and
 * marks nothing stale. So that path is skipped completely, not entered and then
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

  // An empty destination view has no gap to express, so the placeholder is
  // trivially where it belongs.
  if (!before) {
    return true;
  }

  return before.nextElementSibling === placeholder;
}

/**
 * Moves the placeholder into `insertion` and reports whether it moved. Does
 * nothing when it is already there.
 *
 * Anchored on `after`, with an append fallback for an end gap. Anchoring on
 * `before` instead is a silent no-op for a start gap, where `before` is `null`,
 * and the placeholder never reaches the head of the list.
 *
 * The inertness check is not an optimisation. `Node.before()` and `append()` on
 * an already-correct position are a remove-and-reinsert, which resets CSS
 * transitions on the placeholder and forces a reflow. Release calls this
 * unconditionally, and in the common case nothing needs to move.
 *
 * The anchor must be in the placeholder's own container, and this function
 * checks that. `before()` and `after()` are relative to the anchor, so an
 * anchor the consumer has reparented mid-drag does not fail. It silently moves
 * the placeholder into the other container, which takes the drag's layout
 * footprint out of the list it belongs to. Every caller reaches this with an
 * insertion built from a snapshot that may be older than the DOM: the spatial
 * move, the release write, home recovery and destination recovery. This
 * function throws, so each caller classifies the fault at its own stage
 * (`PLACEHOLDER_MOVE`, `RELEASE`, `LANDING_TARGET`) and does not discover it as
 * DOM corruption.
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
    throw new Error('drag: sortable/anchor-outside-container');
  }

  if (after) {
    after.before(placeholder);
  } else {
    insertion.before!.after(placeholder);
  }

  return true;
}
