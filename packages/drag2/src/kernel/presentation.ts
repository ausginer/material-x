/**
 * Presentation resources: inline-style and top-layer leases, the three visual
 * lift strategies, and the active-movement transform writer.
 *
 * A lift promotes the dragged visual with a manual popover: the top layer
 * escapes any transformed, filtered, or contained ancestor, so a
 * `position: fixed` box placed at the item's viewport rect paints above
 * everything without a `z-index`. The element stays in the DOM and only its
 * rendering moves, so it keeps its own styles and inherited custom properties.
 */
import {
  ancestry,
  box,
  coordinates,
  space,
  type Space,
} from '@ydinjs/box-quad';
import type { Disposer } from './lifetimes.ts';
import type { DOMRealm } from './realm.ts';
import type { Point } from './types.ts';
import type { WarnOnThrow } from './warn-on-throw.ts';

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
const SPACE_A = 0;
const SPACE_B = 1;
const SPACE_C = 2;
const SPACE_D = 3;
const SPACE_ANCESTOR_ZOOM = 4;

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

/**
 * Inline properties a lift overwrites, expanded to longhands.
 *
 * The lift writes shorthands (`inset`, `margin`, `padding`, `border-width`…),
 * but the page can author anything, and the two do not correspond. A
 * `style="margin-left: 8px"` yields `''` for `getPropertyValue('margin')`,
 * because a shorthand only serializes when every longhand is present and
 * consistent. So capturing by shorthand records nothing, and restoring by
 * shorthand then calls `removeProperty('margin')`, which permanently drops the
 * authored `margin-left`. The same holds for `inset`, `overflow`, `border-*`
 * and `transition`.
 *
 * Longhands also keep `!important`: priority is per declaration, so one
 * shorthand entry cannot express an authored `padding-top: 4px !important`
 * beside three ordinary paddings.
 *
 * Restoring by longhand needs no separate "clear the shorthand" pass: removing
 * every longhand of a shorthand is the same as removing the shorthand.
 */
const LIFTED_PROPS: readonly string[] = [
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'zoom',
  'box-sizing',
  'transform',
  'transform-origin',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'transition-behavior',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'overflow-x',
  'overflow-y',
  'color',
  'background-color',
];

// ---------------------------------------------------------------------------
// InlineStyleLease
// ---------------------------------------------------------------------------

/**
 * Captures the inline lifted properties before the first write; restores once.
 *
 * Restoration is per property, never the whole `style` attribute. The
 * consumer's own code runs during a drag (`onStart`, the resolver, a readiness
 * promise), and it may legitimately write inline styles the lift never touches.
 * Rewriting the whole attribute would silently revert those. This reverts
 * exactly the declarations the lift is responsible for.
 */
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

/**
 * Enters and restores top-layer/popover state, remembering the prior state.
 *
 * Acquisition is transactional. Promotion is two writes: setting the `popover`
 * attribute, which by itself closes a popover the page had already opened, and
 * then `showPopover()`. Either can throw; `showPopover()` throws whenever the
 * element is not in a state the UA will promote. Until this function returns,
 * its disposer does not exist, so nothing else in the package can restore what
 * the first write already changed. So acquisition rolls itself back and
 * rethrows: it either fully owns the top layer or leaves the element exactly as
 * it found it.
 */
export function acquireTopLayer(
  visual: HTMLElement,
  warnOnThrow: WarnOnThrow,
): Disposer {
  const priorAttribute = visual.getAttribute('popover');
  const priorOpen = visual.matches(':popover-open');

  let disposed = false;

  // Built before the first mutation, so the rollback path and the disposer are
  // the same code against the same captured prior state.
  const restore = (): void => {
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

  try {
    visual.popover = 'manual';

    if (!visual.matches(':popover-open')) {
      visual.showPopover();
    }
  } catch (error) {
    // Run through `warnOnThrow` and not called directly, because the rollback
    // re-enters the same popover API that just failed and can therefore fail
    // again: restoring a previously-open popover is the same call that threw.
    // The statement after it must run: the acquisition error explains why the
    // lift was refused, and it must still reach the caller.
    warnOnThrow(restore);
    throw error;
  }

  return restore;
}

// ---------------------------------------------------------------------------
// Shared lift helpers
// ---------------------------------------------------------------------------

function neutralizeUA(visual: HTMLElement, style: CSSStyleDeclaration): void {
  // Read every UA value up front, while the computed style is still clean.
  // Interleaving these reads with the writes below forces a style recalc per
  // property: each `setProperty` dirties the style that the next
  // `getPropertyValue` must then flush. Batching reduces this to one recalc.
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
   * Allocation-free in every mode. The two lifted modes translate the viewport
   * delta directly. The in-place mode projects it through the inverse of its
   * inherited box space, which is four multiplies over scalars the session
   * captured at acquisition. Nothing on this path allocates except the
   * transform string itself.
   */
  compose(x: number, y: number): string;
  /**
   * The delta `write` last composed and assigned: where the visual is, in the
   * origin-relative viewport space that `compose` and `write` consume. It is
   * `(0, 0)` until the first `write`, which is correct for an operation that
   * never rendered and for a pointerless one.
   *
   * The landing animation starts from here and not from the pointer. A behavior
   * that constrains, clamps, snaps or externally drives its visual writes
   * something other than the raw pointer delta, and a pointerless operation has
   * no pointer at all. So the pointer form would interpolate from a position
   * the visual has never been at.
   *
   * Only the kernel reads this. A behavior receives a {@link
   * BehaviorLiftSession}, which does not have this member.
   *
   * `compose` records nothing: composing is not rendering.
   */
  rendered: Point;
  /**
   * Composes a viewport delta and writes it to the visual's inline transform.
   *
   * The behavior is the only caller. The kernel writes nothing during
   * finalization: the visual reaches its decided position when presentation is
   * disposed and it returns to flow. Any interpolation after the drop happens
   * on the visual after presentation is disposed, through a property this
   * session never writes.
   *
   * The caller classifies a throw here as `FAILURE_RENDERER_WRITE`. This
   * classification is semantic because the write matters: a visual that stops
   * tracking the pointer is a fault the user sees, and the drop lands where the
   * visual is.
   */
  write(x: number, y: number): void;
  dispose: Disposer;
}>;

/**
 * What a behavior receives: the same physical session, narrowed to the four
 * members it may use.
 *
 * `rendered` and `dispose` are kernel-only. The kernel owns the session's
 * lifetime. Disposing it from `activation.effect` or `moved` would drop the
 * inline-style lease and, in a lifted mode, the top-layer lease, while the
 * recorded delta still describes the last `write`. The landing animation would
 * then start from a visual that is no longer lifted.
 *
 * The narrowing is type-level. The kernel passes the same object under the
 * narrower type, so it costs no allocation.
 *
 * The narrowing does not restrict timing. `write` stays callable and stays
 * effective, with no phase test and no operation check. Calling it after the
 * kernel has sampled the delta the drop travels from moves a visual the
 * settlement has already read. Calling it after retirement writes onto an
 * element no live operation owns. Both are outside the contract and neither is
 * refused.
 */
export type BehaviorLiftSession = Readonly<
  Pick<VisualLiftSession, 'visual' | 'baseTransform' | 'compose' | 'write'>
>;

/**
 * The inverse of an inherited linear part, or `null` for the identity, a
 * singular space or a non-finite one.
 *
 * `null` means that the local delta is the viewport delta. This is correct for
 * an untransformed ancestry and is the only available answer for a space that
 * cannot be inverted. It also lets `compose` skip the projection entirely on
 * the hot path.
 *
 * The shape does not say which element's ancestry it describes, and three
 * values of it are live at once: the space above the visual, the space above
 * the item, and the session's own projection. The session's projection is the
 * space an in-place translate acts in, and is `null` for both lifted modes,
 * because a lifted visual is repositioned into the viewport. Each is named
 * where it is published, and none of them is the only inherited space.
 */
export type InheritedSpace = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
}> | null;

function makeSession(
  visual: HTMLElement,
  baseTransform: string,
  projection: InheritedSpace,
  dispose: Disposer,
): VisualLiftSession {
  const suffix = baseTransform ? ` ${baseTransform}` : '';

  const compose = projection
    ? (x: number, y: number): string =>
        `translate(${projection.a * x + projection.c * y}px, ${
          projection.b * x + projection.d * y
        }px)${suffix}`
    : (x: number, y: number): string => `translate(${x}px, ${y}px)${suffix}`;

  // The recorded delta, mutable here and `Point` everywhere else. One object
  // per operation, written in place. Recording costs these two field writes per
  // sample. Publishing a new `{ x, y }` would add an allocation to the
  // pointer-sample path, which is allocation-free.
  const rendered = { x: 0, y: 0 };

  return {
    visual,
    baseTransform,
    compose,
    rendered,
    write(x: number, y: number): void {
      // Record after the assignment. The caller classifies a composition or
      // style write that throws as `FAILURE_RENDERER_WRITE`, and the visual
      // then stays where it was. Recording first would leave the session
      // reporting a delta the element never took, and the drop would travel
      // from a position that exists only in the record.
      visual.style.transform = compose(x, y);
      rendered.x = x;
      rendered.y = y;
    },
    dispose,
  };
}

/**
 * The inverse of an inherited linear part, ready to turn a viewport delta into
 * the local translation that produces it, or `null` when that space is the
 * identity or is unusable.
 *
 * The caller decides whose ancestry this describes, and the two results are
 * used in different places.
 *
 * Above the visual, it is the space an in-place translate acts in. An in-place
 * lift prepends its translate to the visual's authored transform, so the
 * translate is outside that transform and is scaled only by what the visual
 * inherits. Inverting the visual's own space would divide its scale out twice,
 * and a `scale(2)` visual would move half as far as asked.
 *
 * Above the item, it is what a behavior needs to write a translate on a sibling
 * of the dragged item. That is a different element and therefore a different
 * space whenever the two do not coincide.
 *
 * The basis comes from `ancestry`, which walks the flat tree. `offsetParent`
 * stops at a shadow boundary and is `null` for a fixed-position visual. So
 * every flat-tree, shadow-root and `display: contents` rule stays in the
 * package that owns them.
 */
function inheritedSpaceOf(above: Space): InheritedSpace {
  const a = above[SPACE_A]!;
  const b = above[SPACE_B]!;
  const c = above[SPACE_C]!;
  const d = above[SPACE_D]!;

  if (a === 1 && b === 0 && c === 0 && d === 1) {
    // The common case. A null projection makes `compose` skip the arithmetic on
    // the hot path.
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
 * What one acquisition produces: the session, and the two pre-lift ancestry
 * facts read beside the measurement.
 *
 * The spaces are separate products and not members of the session, because
 * their lifetimes differ. Every member of `VisualLiftSession` describes the
 * state that acquisition created, while both spaces describe the state it
 * destroyed. Putting them on the session would put pre-lift facts inside the
 * post-lift write capability, next to a same-shaped projection holding a third
 * value. The kernel copies them onto `ActivationScope`, which already holds the
 * other pre-lift facts, `originRect` and `boxPre`.
 *
 * The two are the same object whenever the visual is the item, which is the
 * common case, so that case pays nothing for a difference it does not have.
 */
export type LiftAcquisition = Readonly<{
  session: VisualLiftSession;
  visualSpace: InheritedSpace;
  itemSpace: InheritedSpace;
}>;

/**
 * Acquires a lift.
 *
 * Everything geometric is read here, before anything is mutated: the two
 * ancestries, then the visual's box measured through the first of them. This
 * one sequence produces all of the following:
 * - The composed element→viewport matrix, which is the faithful mode's base
 *   transform.
 * - The untransformed border-box size, which is the fixed box of both lifted
 *   modes.
 * - The inherited zoom. The top layer does not escape it, so a lifted visual
 *   divides it back out.
 * - The inverse used by the in-place projection.
 * - The two spaces the activation scope publishes.
 *
 * All of these reads must happen here, and this is not only for efficiency.
 * Everything below them mutates the visual: positioning, dimensions, top-layer
 * state and transforms. A traversal taken afterwards reads a different
 * ancestry, and box-quad's own contract says two walks may legitimately
 * disagree. So a behavior that measured for itself could lift on one coordinate
 * snapshot and report consumer deltas from another.
 *
 * The item's ancestry needs a second walk, and that cost is accepted. No layout
 * is read for it and no rect is measured. It reads computed style up the flat
 * tree, once per activation, and only when the item is not the visual. One walk
 * that publishes both would need a designated boundary element inside the
 * measurement. This library would then have to carry that concept for a
 * consumer that knows both elements before it calls.
 *
 * Throws when either space cannot be read, or the visual has no single box: a
 * disconnected or fragmented visual, or a 3D transform this library does not
 * model. The caller classifies the throw as `FAILURE_ACTIVATION`. Silently
 * flattening 3D to its 2D projection would produce a wrong lift and not a
 * refused one.
 *
 * Style capture and top-layer acquisition are composed into the returned
 * `dispose` in reverse acquisition order.
 */
export function acquireLift(
  visual: HTMLElement,
  item: HTMLElement,
  mode: LiftMode,
  originRect: DOMRectReadOnly,
  realm: DOMRealm,
  warnOnThrow: WarnOnThrow,
): LiftAcquisition {
  const above = space();
  // One buffer when the two coincide, which is the common case. This provides
  // the identity guarantee: the two published spaces are then the same value,
  // not two values that happen to agree.
  const itemAbove = item === visual ? above : space();
  const measured = box();

  if (
    !ancestry(visual, above) ||
    (itemAbove !== above && !ancestry(item, itemAbove)) ||
    // The visual is measured through the ancestry just read, so the matrix and
    // the space it is decomposed against are one observation.
    !coordinates(visual, measured, above)
  ) {
    // No readable space: the visual is disconnected, fragmented across lines,
    // or something on either chain is not representable in 2D.
    throw new Error('drag: presentation/visual-no-box-space');
  }

  // Read before anything mutates, and published for every mode. The in-place
  // branch below passes the visual's space to `compose`. The lifted branches
  // pass `compose` the identity, because a lifted visual is repositioned into
  // the viewport, and still publish both of these.
  const visualSpace = inheritedSpaceOf(above);
  const itemSpace =
    itemAbove === above ? visualSpace : inheritedSpaceOf(itemAbove);
  const width = measured[BOX_WIDTH]!;
  const height = measured[BOX_HEIGHT]!;
  const ancestorZoom = above[SPACE_ANCESTOR_ZOOM]!;
  const style = realm.window.getComputedStyle(visual);
  const styleLeaseDisposer = captureInlineStyles(visual);

  // Everything below mutates the visual. The style lease is already held, but
  // the caller only learns about it through the returned session. So a throw
  // from here on would leave the visual promoted and restyled with nothing that
  // could restore it. Acquisition is all-or-nothing.
  try {
    if (mode === LIFT_IN_PLACE) {
      // Stay in the container, compose with the authored transform, and
      // suppress transitions so engine transform writes apply instantly.
      const own = style.transform;
      visual.style.transition = 'none';

      return {
        session: makeSession(
          visual,
          own === 'none' ? '' : own,
          visualSpace,
          styleLeaseDisposer,
        ),
        visualSpace,
        itemSpace,
      };
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
      // Write this now and do not leave it to the first `moved()`. A faithful
      // lift puts the visual at the viewport origin and encodes its entire
      // position in the matrix. So until something writes a transform, the row
      // paints in the top-left corner at its untransformed size. The kernel
      // activates on a pointer sample and renders only from the next one, so
      // that window is a real frame whenever the pointer pauses or its samples
      // coalesce. Promotion has to be visually transparent on its own, which is
      // also why `neutralizeUA` re-asserts the authored UA properties. The flat
      // branch below needs no equivalent: it positions from `originRect` and
      // its base transform is empty.
      visual.style.transform = base;
    } else {
      if (ancestorZoom !== 1) {
        visual.style.zoom = `${1 / ancestorZoom}`;
      }

      visual.style.top = `${originRect.top + originRect.height / 2 - height / 2}px`;
      visual.style.left = `${originRect.left + originRect.width / 2 - width / 2}px`;
    }

    const topLayerDisposer = acquireTopLayer(visual, warnOnThrow);

    const session = makeSession(visual, base, null, () => {
      // Use `finally` and not sequence: restoring the inline styles is the one
      // guarantee this module owns completely. A `hidePopover()` or
      // prior-popover restoration that throws must not permanently cost the
      // visual its authored `position`, `width` and `transform`.
      try {
        topLayerDisposer();
      } finally {
        styleLeaseDisposer();
      }
    });

    return { session, visualSpace, itemSpace };
  } catch (error) {
    styleLeaseDisposer();
    throw error;
  }
}
