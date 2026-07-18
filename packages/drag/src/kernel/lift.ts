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
import { ancestorZoom } from './coordinate.ts';

/**
 * Properties the UA popover stylesheet forces on a `[popover]` element that would
 * change the visual's box or appearance (its own size, borders, fill, and text
 * colour). Each is re-asserted from the element's authored computed value at lift
 * time so the promotion is visually transparent, and `box-sizing: border-box`
 * keeps the pinned size exact regardless of border/padding.
 */
const UA_PROPS: readonly string[] = [
  'padding',
  'border-width',
  'border-style',
  'border-color',
  'overflow',
  'color',
  'background-color',
];

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
  'zoom',
  'box-sizing',
  'transform',
  'transform-origin',
  ...UA_PROPS,
];

/**
 * Re-asserts the authored box and appearance so the UA popover chrome
 * (`border: solid`, `padding: 0.25em`, `overflow: auto`, opaque `Canvas` fill,
 * `CanvasText` colour, centring `margin: auto`) does not change how the visual
 * looks once promoted. Read the computed values before the popover attribute is
 * set, so they are the author's, not the popover's. `box-sizing: border-box`
 * makes the caller's pinned `width`/`height` the true outer size.
 */
function neutralizeUA(visual: HTMLElement): void {
  const style = getComputedStyle(visual);

  visual.style.boxSizing = 'border-box';
  // The pinned box owns its position; layout margin (and the UA `margin: auto`)
  // would only offset it.
  visual.style.margin = '0';

  // The top layer escapes ancestor transforms but not ancestor `zoom`, which
  // still compounds onto the lifted element and would scale its pinned size,
  // position, and translate. Cancel it so everything stays in viewport pixels.
  const zoom = ancestorZoom(visual);

  if (zoom !== 1) {
    visual.style.zoom = `${1 / zoom}`;
  }

  for (const prop of UA_PROPS) {
    visual.style.setProperty(prop, style.getPropertyValue(prop));
  }
}

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
  neutralizeUA(visual);

  visual.style.position = 'fixed';
  // Cancel the UA popover `inset: 0` before pinning top/left, or the visual
  // would stretch to the viewport edges.
  visual.style.inset = 'auto';
  visual.style.top = `${rect.top}px`;
  visual.style.left = `${rect.left}px`;
  visual.style.width = `${rect.width}px`;
  visual.style.height = `${rect.height}px`;
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

/**
 * Lifts the visual into the top layer while preserving its transformed
 * appearance. The top layer drops ancestor transforms, so the caller re-applies
 * the element's captured local→viewport matrix as its `transform`.
 *
 * The box is pinned at the viewport origin with its untransformed layout size
 * (border-box), and its transform origin is the top-left corner, so the matrix —
 * which maps the border-box local space to the viewport — reproduces the
 * element's exact on-screen position, size, and orientation.
 */
export function enterTopLayerTransformed(visual: HTMLElement): void {
  // Read the layout size before the popover attribute brings in the UA chrome.
  const width = visual.offsetWidth;
  const height = visual.offsetHeight;

  neutralizeUA(visual);

  visual.style.position = 'fixed';
  visual.style.inset = 'auto';
  visual.style.top = '0';
  visual.style.left = '0';
  visual.style.width = `${width}px`;
  visual.style.height = `${height}px`;
  visual.style.transformOrigin = '0 0';
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
