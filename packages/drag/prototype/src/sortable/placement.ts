/**
 * The placeholder is the dragged item's layout footprint for the whole
 * operation: created at activation, removed when presentation is released.
 */
import type { Insertion } from './domain.ts';

export type Footprint = Readonly<{ width: number; height: number }>;

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
 * The mechanics no factory can configure away: one insertion position, hidden
 * from assistive technology, in the item's slot, sized from the footprint the
 * visual removed. Beyond this the library writes no styling.
 */
function applyMechanics(
  placeholder: HTMLElement,
  item: HTMLElement,
  footprint: Footprint,
): void {
  const slot = item.getAttribute('slot');
  const { width, height } = footprint;

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
}

/** Creates the operation's placeholder, detached. */
export function createPlaceholder(
  document: Document,
  context: PlaceholderContext,
  footprint: Footprint,
  factory: PlaceholderFactory | null,
): HTMLElement {
  const { item } = context;

  if (!factory) {
    const placeholder = document.createElement('div');

    applyMechanics(placeholder, item, footprint);
    return placeholder;
  }

  const placeholder = factory(context);

  applyMechanics(placeholder, item, footprint);
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
  if (!before) {
    return true;
  }

  return before.nextElementSibling === placeholder;
}

/**
 * Moves the placeholder into `insertion`, or does nothing when it is there: a
 * re-insertion would reset transitions and force a reflow. An anchor the consumer
 * reparented mid-drag throws, instead of silently taking the footprint with it.
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
    throw new Error('sortable/anchor-outside-container');
  }

  if (after) {
    after.before(placeholder);
  } else {
    insertion.before!.after(placeholder);
  }

  return true;
}
