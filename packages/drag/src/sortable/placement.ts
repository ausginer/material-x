/**
 * The placeholder is the dragged item's layout footprint for the whole operation:
 * created at activation, removed when presentation is released.
 */
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

/** Must return a detached element, which the library then owns. */
export type PlaceholderFactory = (context: PlaceholderContext) => HTMLElement;

/**
 * Creates the operation's placeholder, detached. The mechanics here cannot be
 * configured away: one insertion position, hidden from assistive technology, in
 * the item's slot, sized from the footprint the visual removed. Beyond this the
 * library writes no styling.
 */
export function createPlaceholder(
  document: Document,
  context: PlaceholderContext,
  width: number,
  height: number,
  factory: PlaceholderFactory | null,
): HTMLElement {
  const placeholder = factory
    ? factory(context)
    : document.createElement('div');
  const slot = context.item.getAttribute('slot');

  placeholder.setAttribute('data-drag-placeholder', '');
  placeholder.setAttribute('aria-hidden', 'true');

  // Mirrored and not copied: a custom placeholder may arrive with its own `slot`.
  if (slot === null) {
    placeholder.removeAttribute('slot');
  } else {
    placeholder.setAttribute('slot', slot);
  }

  const { style } = placeholder;

  style.boxSizing = 'border-box';
  style.width = `${width}px`;
  style.height = `${height}px`;
  return placeholder;
}

/** Whether the placeholder already occupies `insertion`. */
export function placeholderAt(
  placeholder: HTMLElement,
  insertion: Insertion,
): boolean {
  const { after, before } = insertion;

  if (after) {
    return after.previousElementSibling === placeholder;
  }

  // An empty destination view has no gap to express.
  return !before || before.nextElementSibling === placeholder;
}

/**
 * Moves the placeholder into `insertion`, or does nothing when it is there: a
 * re-insertion would reset transitions and force a reflow. An anchor the consumer
 * moved out of the container throws, so that the footprint does not silently go
 * with it.
 */
export function movePlaceholder(
  placeholder: HTMLElement,
  insertion: Insertion,
): void {
  if (placeholderAt(placeholder, insertion)) {
    return;
  }

  const { after, before } = insertion;
  const anchor = after ?? before!;

  if (anchor.parentNode !== placeholder.parentNode) {
    throw new Error('sortable/anchor-outside-container');
  }

  if (after) {
    after.before(placeholder);
  } else {
    before!.after(placeholder);
  }
}
