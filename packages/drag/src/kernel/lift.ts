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
 * Forces the lifted element's *net* rendered `zoom` to exactly 1, by overriding
 * its own `zoom` with the inverse of its ancestors'. The faithful matrix lift
 * reproduces all zoom (own and ancestor) itself, and browsers disagree on
 * whether inherited `zoom` scales a `position: fixed` element's transform
 * (Chromium does, Firefox does not) — so zoom is taken out of the browser's
 * hands entirely and the matrix is the single source of truth. Restored via
 * `zoom` in {@link LIFTED_PROPS}.
 */
function neutralizeZoom(visual: HTMLElement): void {
  visual.style.zoom = `${1 / ancestorZoom(visual)}`;
}

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
  // Suppressed during the lift so engine transform writes apply instantly; an
  // authored `transition: transform` would otherwise animate every write.
  'transition',
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
function neutralizeUA(visual: HTMLElement, style: CSSStyleDeclaration): void {
  visual.style.boxSizing = 'border-box';
  // The pinned box owns its position; layout margin (and the UA `margin: auto`)
  // would only offset it.
  visual.style.margin = '0';

  for (const prop of UA_PROPS) {
    visual.style.setProperty(prop, style.getPropertyValue(prop));
  }
}

/**
 * The element's untransformed border-box size in fractional CSS pixels.
 * `offsetWidth`/`offsetHeight` round to integers, and a `scale`/`zoom` visual
 * amplifies the rounding error; the computed `width`/`height` are sub-pixel
 * accurate. They already resolve to the border box when `box-sizing:
 * border-box`; otherwise they are the content box, so padding and border are
 * added to reach the border box the pinned (border-box) element uses.
 */
function borderBox(style: CSSStyleDeclaration): readonly [number, number] {
  let width = Number.parseFloat(style.width);
  let height = Number.parseFloat(style.height);

  if (style.boxSizing !== 'border-box') {
    width +=
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth);
    height +=
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
  }

  return [width, height];
}

/**
 * Suppresses CSS transitions on the lifted element so engine-written `transform`
 * updates apply instantly. Without this, an authored `transition: transform`
 * would animate the lift matrix and retarget on every pointer move, producing an
 * activation jump and severe lag. Snapshotted/restored via `transition`.
 */
export function suppressTransitions(visual: HTMLElement): void {
  visual.style.transition = 'none';
}

/**
 * Cancels the inherited (ancestor) `zoom` on the lifted element. The top layer
 * escapes ancestor transforms but not ancestor `zoom`, which still compounds
 * onto the element and would scale its pinned size and position. Used by the
 * flatten lift, which renders in true viewport pixels at the element's natural
 * size; the faithful lift uses {@link neutralizeZoom} instead (net zoom 1, own
 * zoom reproduced by the matrix).
 */
function cancelZoom(visual: HTMLElement): void {
  const zoom = ancestorZoom(visual);

  if (zoom !== 1) {
    visual.style.zoom = `${1 / zoom}`;
  }
}

/**
 * The visual's `popover` state before the lift, so teardown can restore it: a
 * visual that was already a popover keeps its `attribute` value, and one that
 * was already `open` is re-shown rather than left hidden. `attribute: null`
 * means it had no `popover` attribute.
 */
const priorPopover = new WeakMap<
  HTMLElement,
  Readonly<{ attribute: string | null; open: boolean }>
>();

/** Promotes the visual to a manual popover, remembering its prior state. */
function showAsPopover(visual: HTMLElement): void {
  priorPopover.set(visual, {
    attribute: visual.getAttribute('popover'),
    open: visual.matches(':popover-open'),
  });
  visual.popover = 'manual';

  // A visual that was already an open popover must not be shown again (that
  // throws); the `manual` re-assignment keeps it in the top layer.
  if (!visual.matches(':popover-open')) {
    visual.showPopover();
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

/**
 * Lifts the visual into the top layer, reproducing its exact transformed
 * appearance. The top layer drops ancestor transforms, so the caller re-applies
 * the element's captured full local→viewport matrix (zoom included) as its
 * `transform`.
 *
 * The box is pinned at the viewport origin with its *untransformed, unzoomed*
 * layout size (border-box), transform origin at the top-left corner, so the
 * matrix — which maps that border-box local space to the viewport — reproduces
 * the element's exact position, size, and orientation with no double-application:
 * unlike pinning the (already transformed) bounding rect, a `scale`/`rotate`/
 * `skew` visual is not distorted. Net `zoom` is neutralized to 1 so the matrix
 * is the sole source of scale — browsers disagree on whether inherited `zoom`
 * scales a fixed element's transform, so it is kept out of their hands.
 */
export function enterTopLayerMatrix(visual: HTMLElement): void {
  // Read the authored box before the popover attribute brings in the UA chrome.
  const style = getComputedStyle(visual);
  const [width, height] = borderBox(style);

  neutralizeUA(visual, style);
  suppressTransitions(visual);
  // Net zoom 1: the caller's matrix (which includes all zoom) is the sole
  // source of scale, so the browser must not also apply inherited zoom.
  neutralizeZoom(visual);

  visual.style.position = 'fixed';
  visual.style.inset = 'auto';
  visual.style.top = '0';
  visual.style.left = '0';
  visual.style.width = `${width}px`;
  visual.style.height = `${height}px`;
  visual.style.transformOrigin = '0 0';
  showAsPopover(visual);
}

/**
 * Lifts the visual into the top layer *flattened*: axis-aligned at its natural
 * (untransformed layout) size, escaping ancestor transforms entirely. It is
 * centred on its current on-screen centre (`rect`) so the grab does not jump.
 * The caller applies only a translation — no matrix — so a scaled or rotated
 * visual renders upright at its true size rather than distorted.
 */
export function enterTopLayerFlat(
  visual: HTMLElement,
  rect: DOMRectReadOnly,
): void {
  const style = getComputedStyle(visual);
  const [width, height] = borderBox(style);

  neutralizeUA(visual, style);
  suppressTransitions(visual);
  cancelZoom(visual);

  visual.style.position = 'fixed';
  // Cancel the UA popover `inset: 0` before pinning, or the visual would
  // stretch to the viewport edges.
  visual.style.inset = 'auto';
  // Centre the natural-size box on the visual's current centre.
  visual.style.top = `${rect.top + rect.height / 2 - height / 2}px`;
  visual.style.left = `${rect.left + rect.width / 2 - width / 2}px`;
  visual.style.width = `${width}px`;
  visual.style.height = `${height}px`;
  showAsPopover(visual);
}

/** Returns the visual from the top layer, restoring its prior popover state. */
export function exitTopLayer(visual: HTMLElement): void {
  if (visual.matches(':popover-open')) {
    visual.hidePopover();
  }

  // Restore the authored `popover` value rather than always removing it, so a
  // visual that was itself a popover keeps its state.
  const prior = priorPopover.get(visual);
  priorPopover.delete(visual);

  if (prior?.attribute == null) {
    visual.removeAttribute('popover');
  } else {
    visual.setAttribute('popover', prior.attribute);
  }

  // Re-open a visual that was an open popover before the lift.
  if (prior?.open && visual.matches('[popover]')) {
    visual.showPopover();
  }
}
