/**
 * Promotes the dragged visual into the top layer and restores it afterwards.
 *
 * The lift uses a manual popover: the top layer escapes any transformed,
 * filtered, or contained ancestor, so a `position: fixed` box placed at the
 * item's viewport rect lands correctly and paints above everything without a
 * `z-index`. The element stays put in the DOM — only its rendering moves — so it
 * keeps its own styles and inherited custom properties.
 *
 * Ported from `@ydinjs/core`'s reorderable trait and generalized to plain
 * `HTMLElement`.
 */

/**
 * Inline properties the lift overwrites. Teardown restores each to its snapshot
 * value or removes it. No `z-index`: the top layer already paints above all.
 */
const LIFTED_PROPS: readonly string[] = [
  'position',
  'inset',
  'top',
  'left',
  'width',
  'height',
  'margin',
  'border',
  'transform',
];

/** Pre-existing inline values of the properties the lift overwrites. */
export type SavedStyles = ReadonlyMap<
  string,
  readonly [value: string, priority: string]
>;

/** Snapshots the inline lifted properties so teardown can restore them. */
export function snapshotStyles(visual: HTMLElement): SavedStyles {
  const saved = new Map<string, readonly [string, string]>();

  for (const prop of LIFTED_PROPS) {
    const value = visual.style.getPropertyValue(prop);

    if (value) {
      saved.set(prop, [value, visual.style.getPropertyPriority(prop)]);
    }
  }

  return saved;
}

/** Restores a {@link snapshotStyles} snapshot, clearing what it lacks. */
export function restoreStyles(visual: HTMLElement, saved: SavedStyles): void {
  for (const prop of LIFTED_PROPS) {
    const value = saved.get(prop);

    if (value) {
      visual.style.setProperty(prop, value[0], value[1]);
    } else {
      visual.style.removeProperty(prop);
    }
  }
}

/** Pins the visual as a fixed-position box exactly over `rect`. */
export function pinVisual(visual: HTMLElement, rect: DOMRectReadOnly): void {
  visual.style.position = 'fixed';
  // Cancel the UA popover `inset: 0` before pinning top/left, or the visual
  // would stretch to the viewport edges.
  visual.style.inset = 'auto';
  visual.style.top = `${rect.top}px`;
  visual.style.left = `${rect.left}px`;
  visual.style.width = `${rect.width}px`;
  visual.style.height = `${rect.height}px`;
  // Strip the UA popover chrome (`border: solid`, centering `margin: auto`).
  visual.style.margin = '0';
  visual.style.border = '0';
}

/** Lifts the visual into the top layer, pinned over its current viewport rect. */
export function enterTopLayer(
  visual: HTMLElement,
  rect: DOMRectReadOnly,
): void {
  pinVisual(visual, rect);
  visual.popover = 'manual';
  visual.showPopover();
}

/** Returns the visual from the top layer and clears the popover attribute. */
export function exitTopLayer(visual: HTMLElement): void {
  if (visual.matches(':popover-open')) {
    visual.hidePopover();
  }

  visual.removeAttribute('popover');
}
