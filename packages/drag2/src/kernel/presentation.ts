/**
 * Presentation resources: inline-style and top-layer leases, the three visual
 * lift strategies, and the active-movement transform writer.
 *
 * A lift promotes the dragged visual with a manual popover: the top layer
 * escapes any transformed, filtered, or contained ancestor, so a `position:
 * fixed` box placed at the item's viewport rect paints above everything without
 * a `z-index`. The element stays in the DOM — only its rendering moves — so it
 * keeps its own styles and inherited custom properties.
 */
import { box, coordinates, type Box } from '@ydinjs/box-quad';
import type { Disposer } from './lifetimes.ts';
import type { DOMRealm } from './realm.ts';

/** Which lift strategy a free/sortable operation uses. */
export const LIFT_FAITHFUL = 61;
export const LIFT_FLAT = 62;
export const LIFT_IN_PLACE = 63;

export type LiftMode =
  | typeof LIFT_FAITHFUL
  | typeof LIFT_FLAT
  | typeof LIFT_IN_PLACE;

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const BOX_ANCESTOR_ZOOM = 8;
const BOX_ANCESTOR_A = 9;
const BOX_ANCESTOR_B = 10;
const BOX_ANCESTOR_C = 11;
const BOX_ANCESTOR_D = 12;

/**
 * UA popover stylesheet properties that would change the visual's box or
 * appearance; re-asserted from the authored computed value so promotion is
 * visually transparent.
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

/** Inline properties a lift overwrites; teardown restores or removes each. */
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
  'transition',
  ...UA_PROPS,
];

// ---------------------------------------------------------------------------
// InlineStyleLease
// ---------------------------------------------------------------------------

/** Captures the inline lifted properties before the first write; restores once. */
export function captureInlineStyles(visual: HTMLElement): Disposer {
  const saved = new Map<string, readonly [string, string]>();

  for (const prop of LIFTED_PROPS) {
    const value = visual.style.getPropertyValue(prop);

    if (value) {
      saved.set(prop, [value, visual.style.getPropertyPriority(prop)]);
    }
  }

  let restored = false;

  return () => {
    if (restored) {
      return;
    }

    restored = true;

    for (const prop of LIFTED_PROPS) {
      const value = saved.get(prop);

      if (value) {
        visual.style.setProperty(prop, value[0], value[1]);
      } else {
        visual.style.removeProperty(prop);
      }
    }
  };
}

// ---------------------------------------------------------------------------
// TopLayerLease
// ---------------------------------------------------------------------------

/** Enters and restores top-layer/popover state, remembering the prior state. */
export function acquireTopLayer(visual: HTMLElement): Disposer {
  const priorAttribute = visual.getAttribute('popover');
  const priorOpen = visual.matches(':popover-open');

  visual.popover = 'manual';

  if (!visual.matches(':popover-open')) {
    visual.showPopover();
  }

  let disposed = false;

  return () => {
    if (disposed) {
      return;
    }

    disposed = true;

    if (visual.matches(':popover-open')) {
      visual.hidePopover();
    }

    if (priorAttribute == null) {
      visual.removeAttribute('popover');
    } else {
      visual.setAttribute('popover', priorAttribute);
    }

    if (priorOpen && visual.matches('[popover]')) {
      visual.showPopover();
    }
  };
}

// ---------------------------------------------------------------------------
// Shared lift helpers
// ---------------------------------------------------------------------------

function neutralizeUA(visual: HTMLElement, style: CSSStyleDeclaration): void {
  // Read every UA value up front, while the computed style is still clean.
  // Interleaving these reads with the writes below forces a style recalc per
  // property (each `setProperty` dirties the style the next `getPropertyValue`
  // must then flush); batching collapses that whole cluster into one recalc.
  const values = UA_PROPS.map((prop) => style.getPropertyValue(prop));

  visual.style.boxSizing = 'border-box';
  visual.style.margin = '0';

  for (let i = 0; i < UA_PROPS.length; i += 1) {
    visual.style.setProperty(UA_PROPS[i]!, values[i]!);
  }
}

// ---------------------------------------------------------------------------
// VisualLiftSession
// ---------------------------------------------------------------------------

/**
 * One visual's active presentation mode. Composes the inline-style lease and,
 * where applicable, the top-layer lease. It exposes only the transform
 * composition downstream movement and landing need, and never updates geometry,
 * animates, or invokes callbacks.
 */
export type VisualLiftSession = Readonly<{
  visual: HTMLElement;
  /** The authored/lift base transform the drag translation is composed with. */
  baseTransform: string;
  /**
   * The full transform string for a viewport delta.
   *
   * **Allocation-free in every mode.** The two lifted modes translate the
   * viewport delta directly; the in-place mode projects it through the inverse
   * of its inherited box space, which is four multiplies over scalars the
   * session captured at acquisition. The shipped package allocated a `{ x, y }`
   * projection here per pointer sample (contract F-24) — nothing on this path
   * allocates now except the transform string itself.
   */
  compose(x: number, y: number): string;
  /**
   * Composes a viewport delta and writes it to the visual's inline transform.
   *
   * This is how the kernel performs the **authoritative pin** at the join
   * (contract D-16, I-24). Correctness deliberately does not depend on the
   * landing runner: the runner drives the transform while it is alive, and the
   * kernel re-measures and writes the final position through the lift session
   * it already owns, after `LandingHandle.destroy()` has relinquished control.
   *
   * A throw here is classified `FAILURE_RENDERER_WRITE` by the caller.
   */
  write(x: number, y: number): void;
  dispose: Disposer;
}>;

/**
 * The inverse linear part of a box space, or `null` for the identity — which is
 * what both lifted modes use, and what lets `compose` skip the projection.
 */
type Projection = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
}> | null;

function makeSession(
  visual: HTMLElement,
  baseTransform: string,
  projection: Projection,
  dispose: Disposer,
): VisualLiftSession {
  const suffix = baseTransform ? ` ${baseTransform}` : '';

  const compose = projection
    ? (x: number, y: number): string =>
        `translate(${projection.a * x + projection.c * y}px, ${
          projection.b * x + projection.d * y
        }px)${suffix}`
    : (x: number, y: number): string => `translate(${x}px, ${y}px)${suffix}`;

  return {
    visual,
    baseTransform,
    compose,
    write(x: number, y: number): void {
      visual.style.transform = compose(x, y);
    },
    dispose,
  };
}

/**
 * The inverse linear part of the space an in-place translate acts in, or `null`
 * when that space is the identity or is unusable.
 *
 * The **inherited** space, not the visual's own: an in-place lift *prepends* its
 * translate to the visual's authored transform, so the translate sits outside
 * that transform and is scaled only by what the visual inherits. Inverting the
 * visual's own space would divide the visual's own scale out twice — a
 * `scale(2)` visual would move half as far as asked.
 *
 * The shipped package made the same distinction by building its mapper from
 * `item.offsetParent`, which stops at a shadow boundary and is `null` for a
 * fixed-position visual. This reads the basis box-quad produced during the one
 * traversal it already performed, so every flat-tree, shadow-root and
 * `display: contents` rule stays in the package that owns them.
 */
function inPlaceProjection(measured: Box): Projection {
  const a = measured[BOX_ANCESTOR_A]!;
  const b = measured[BOX_ANCESTOR_B]!;
  const c = measured[BOX_ANCESTOR_C]!;
  const d = measured[BOX_ANCESTOR_D]!;

  if (a === 1 && b === 0 && c === 0 && d === 1) {
    // The common case. A null projection makes `compose` skip the arithmetic
    // entirely on the hot path.
    return null;
  }

  const determinant = a * d - b * c;

  if (determinant === 0 || !Number.isFinite(determinant)) {
    return null;
  }

  return {
    a: d / determinant,
    b: -b / determinant,
    c: -c / determinant,
    d: a / determinant,
  };
}

/**
 * Acquires a lift.
 *
 * The visual's box space is read **once**, here: the composed
 * element→viewport matrix (the faithful mode's base transform), the
 * untransformed border-box size (both lifted modes' fixed box), the inherited
 * zoom (which the top layer does not escape, so a lifted visual divides it back
 * out), and the inverse used by the in-place projection all come from that one
 * traversal.
 *
 * Throws when the space cannot be read — a disconnected or fragmented visual,
 * or a 3D transform this library does not model. The caller classifies it as
 * `FAILURE_ACTIVATION`. The shipped package silently flattened 3D to its 2D
 * projection instead, which produced a wrong lift rather than a refused one.
 *
 * Style capture and top-layer acquisition are composed into the returned
 * `dispose` in reverse acquisition order.
 */
export function acquireLift(
  visual: HTMLElement,
  mode: LiftMode,
  originRect: DOMRectReadOnly,
  realm: DOMRealm,
): VisualLiftSession {
  const measured = box();

  if (!coordinates(visual, measured)) {
    throw new Error(
      'drag: the dragged visual has no readable box space (disconnected, fragmented, or 3D-transformed).',
    );
  }

  const width = measured[BOX_WIDTH]!;
  const height = measured[BOX_HEIGHT]!;
  const ancestorZoom = measured[BOX_ANCESTOR_ZOOM]!;
  const style = realm.window.getComputedStyle(visual);
  const styleLeaseDisposer = captureInlineStyles(visual);

  if (mode === LIFT_IN_PLACE) {
    // Stay in the container, ride the authored transform, and suppress
    // transitions so engine transform writes apply instantly.
    const own = style.transform;
    visual.style.transition = 'none';

    return makeSession(
      visual,
      own === 'none' ? '' : own,
      inPlaceProjection(measured),
      styleLeaseDisposer,
    );
  }

  neutralizeUA(visual, style);
  visual.style.transition = 'none';
  visual.style.position = 'fixed';
  visual.style.inset = 'auto';
  visual.style.width = `${width}px`;
  visual.style.height = `${height}px`;

  let base = '';

  if (mode === LIFT_FAITHFUL) {
    const a = measured[BOX_A]!;
    const b = measured[BOX_B]!;
    const c = measured[BOX_C]!;
    const d = measured[BOX_D]!;

    base = `matrix(${a}, ${b}, ${c}, ${d}, ${measured[BOX_E]!}, ${measured[BOX_F]!})`;
    // Net zoom 1: the matrix is the sole source of scale.
    visual.style.zoom = `${1 / ancestorZoom}`;
    visual.style.top = '0';
    visual.style.left = '0';
    visual.style.transformOrigin = '0 0';
  } else {
    if (ancestorZoom !== 1) {
      visual.style.zoom = `${1 / ancestorZoom}`;
    }

    visual.style.top = `${originRect.top + originRect.height / 2 - height / 2}px`;
    visual.style.left = `${originRect.left + originRect.width / 2 - width / 2}px`;
  }

  const topLayerDisposer = acquireTopLayer(visual);

  return makeSession(visual, base, null, () => {
    topLayerDisposer();
    styleLeaseDisposer();
  });
}
