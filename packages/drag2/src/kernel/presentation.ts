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
import { guarded } from './reporter.ts';
import type { Point } from './types.ts';

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

/**
 * Inline properties a lift overwrites, **expanded to longhands**.
 *
 * The lift writes shorthands (`inset`, `margin`, `padding`, `border-width`…),
 * but the page authors whatever it likes, and the two do not correspond. A
 * `style="margin-left: 8px"` yields `''` for `getPropertyValue('margin')` —
 * a shorthand only serializes when every longhand is present and consistent —
 * so capturing by shorthand records nothing, and restoring by shorthand then
 * calls `removeProperty('margin')`, which drops the authored `margin-left` for
 * good. The same holds for `inset`, `overflow`, `border-*` and `transition`.
 *
 * Longhands are also what makes `!important` survive: priority is per
 * declaration, so an authored `padding-top: 4px !important` beside three
 * ordinary paddings cannot be expressed as one shorthand entry at all.
 *
 * Restoring longhand-by-longhand needs no separate "clear the shorthand" pass:
 * removing every longhand of a shorthand is exactly removing the shorthand.
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
 * Restoration is **per property, never the whole `style` attribute**. A drag is
 * a window in which the consumer's own code runs — `onStart`, the resolver, a
 * readiness promise — and it may legitimately write inline styles the lift never
 * touches. Rewriting the attribute wholesale would silently revert those; this
 * reverts exactly the declarations the lift is responsible for.
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
 * **Transactional.** Promotion is two writes, not one: setting the `popover`
 * attribute, which by itself closes a popover the page had already opened, and
 * then `showPopover()`. Either can throw — `showPopover()` does whenever the
 * element is not in a state the UA will promote — and until this function
 * returns, its disposer does not exist, so nothing else in the package can
 * possibly restore what the first write already changed. So acquisition rolls
 * itself back and rethrows: it either fully owns the top layer or leaves the
 * element exactly as it found it.
 */
export function acquireTopLayer(visual: HTMLElement): Disposer {
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
    // `guarded`, because the rollback re-enters the same popover API that just
    // failed and can therefore fail again — restoring a previously-open
    // popover is literally the call that threw. The **acquisition** error is
    // the one that explains why the lift was refused and stays primary; a
    // rollback failure is non-consequential and takes the platform channel
    // (I-29).
    guarded(restore);
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
   * **The delta `write` last composed and assigned** — where the visual *is*,
   * in the origin-relative viewport space `compose` and `write` consume (D-35).
   * `(0, 0)` until the first `write`, which is the truth for an operation that
   * never rendered and for a pointerless one.
   *
   * `LandingContext.from` is read from here. It was `pointerX - originX`, which
   * is the same number for exactly **one** behavior — one whose `moved` writes
   * the raw pointer delta on both axes. Any behavior that constrains, clamps,
   * snaps or externally drives its visual writes something else, and a
   * pointerless operation (D-32) has no pointer at all, so the pointer form
   * would open the landing from a position the visual has never been at. The
   * failure signature is the expensive one: **the landing jumps at its start
   * and still ends correctly**, because the target is behavior-supplied and the
   * kernel re-pins at the join — Phase 11 met the same shape in the lift
   * geometry with every test green.
   *
   * **Recorded here rather than asked for through a seam.** This object is the
   * kernel's own and `write` is the library's only rendering entry point during
   * an operation, so the recording costs two scalar field writes on the hot
   * path and no call, no allocation and no member on any behavior. A
   * `renderedDelta(current)` seam would have obliged every behavior to mirror
   * every write into its frame part — which is the duplication that produced
   * the defect in the first place.
   *
   * **Kernel-read.** The behavior is handed a {@link BehaviorLiftSession},
   * which does not carry this member: a behavior that could sample the delta
   * could disagree with the kernel about it, and there is nothing it could
   * correctly do with the disagreement (C5-01).
   *
   * `compose` records nothing — composing is not rendering, and a landing
   * runner composes on every frame.
   */
  rendered: Point;
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
 * What a **behavior** is handed: the same physical session, positively
 * projected to the four members it may use (D-35, C5-01).
 *
 * `rendered` and `dispose` are kernel-only, and the two are excluded for
 * different reasons. `rendered` is a reading hazard only in the weak sense —
 * but a behavior that samples it has no correct use for the answer, since the
 * kernel is the one that acts on it. `dispose` is a **sequencing** hazard: a
 * behavior calling it from `activation.effect` or `moved` restores the inline
 * style lease — and, in a lifted mode, the top-layer lease — while `rendered`
 * still describes its last `write`, so the landing then samples `from` for a
 * visual that is no longer lifted. That is I-34 broken through a first-class
 * SPI method rather than through a documented residue, and the difference
 * matters: a residue is a rule a participant may break, this was the API
 * handing out the thing it claims to own.
 *
 * **Positively selected, not `Omit`-ed**, so a member added to the session
 * later is kernel-only by default rather than leaking until someone remembers
 * to exclude it.
 *
 * The projection is type-level. The kernel passes the *same object* under the
 * narrower type, so it costs no allocation — the identical argument
 * `LifetimeScope` already makes for `Lifetime`.
 *
 * **What it does not project away is the timing** (C6-01). `write` stays
 * callable and stays *effective* — no phase test, no operation check — so
 * calling it after `LandingContext.from` is sampled fights the landing runner
 * for the same property, and calling it after retirement writes onto an element
 * no live operation owns. Both are outside the contract and neither is refused:
 * a guard would put a branch on the one path M-1 measures, to defend against a
 * bug no reference behavior has, and would turn a violation into a *silent*
 * no-op — which is the harder defect to find of the two.
 */
export type BehaviorLiftSession = Readonly<
  Pick<VisualLiftSession, 'visual' | 'baseTransform' | 'compose' | 'write'>
>;

/**
 * The inverse of an inherited linear part, or `null` for the identity, a
 * singular space or a non-finite one (D-85).
 *
 * `null` means **the local delta is the viewport delta** — the correct answer
 * for an untransformed ancestry and the honest one for a space that cannot be
 * inverted. It is also what lets `compose` skip the projection entirely on the
 * hot path.
 *
 * **The same shape serves two readers with two different values, deliberately.**
 * `ActivationScope.inheritedSpace` is a fact about the ancestry at grab and is
 * computed for every lift mode; the session's own projection is the space an
 * *in-place* translate acts in and is `null` for both lifted modes, because a
 * lifted visual is repositioned into the viewport. Conflating them would hand a
 * behavior the identity under `LIFT_FLAT`, wrong and silent.
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
  // per operation, written in place: D-35's cost is these two field writes per
  // sample, and re-publishing a fresh `{ x, y }` would put an allocation on the
  // one path F-24 spent a whole measurement keeping allocation-free.
  const rendered = { x: 0, y: 0 };

  return {
    visual,
    baseTransform,
    compose,
    rendered,
    write(x: number, y: number): void {
      // Recorded **after** the assignment, deliberately. A composition or style
      // write that throws is classified `FAILURE_RENDERER_WRITE` by the caller,
      // and the visual is then wherever it already was — so recording first
      // would leave the session claiming a delta the element never took, and
      // the landing would open from a position that only the record believes.
      visual.style.transform = compose(x, y);
      rendered.x = x;
      rendered.y = y;
    },
    dispose,
  };
}

/**
 * The inverse of the linear part the visual **inherits** — everything strictly
 * above it, its own transform and zoom excluded — or `null` when that space is
 * the identity or is unusable.
 *
 * **Two callers, one read** (D-85). It is the space an in-place translate acts
 * in, because an in-place lift *prepends* its translate to the visual's
 * authored transform, so the translate sits outside that transform and is
 * scaled only by what the visual inherits — inverting the visual's own space
 * would divide its scale out twice, and a `scale(2)` visual would move half as
 * far as asked. It is **also** the projection a behavior needs to report a
 * local delta, and that caller wants it under every lift mode rather than only
 * in place. So it is computed once here and published twice: to `compose` for
 * the in-place mode alone, and to `ActivationScope.inheritedSpace` always.
 *
 * The shipped package made the same distinction by building its mapper from
 * `item.offsetParent`, which stops at a shadow boundary and is `null` for a
 * fixed-position visual. This reads the basis box-quad produced during the one
 * traversal it already performed, so every flat-tree, shadow-root and
 * `display: contents` rule stays in the package that owns them.
 */
function inheritedSpaceOf(measured: Box): InheritedSpace {
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
 * What one acquisition produces: the session, and the pre-lift ancestry fact
 * derived from the same measurement (D-85).
 *
 * **Two products rather than one member on the session**, and the reason is
 * lifetime: every member of `VisualLiftSession` describes the state acquisition
 * *created*, while `inheritedSpace` describes the state it *destroyed*. Putting
 * it on the session would put a pre-lift fact inside the post-lift write
 * capability, next to a same-shaped projection holding a different value. The
 * kernel copies it onto `ActivationScope`, where the other pre-lift facts —
 * `originRect`, `boxPre` — already live.
 */
export type LiftAcquisition = Readonly<{
  session: VisualLiftSession;
  inheritedSpace: InheritedSpace;
}>;

/**
 * Acquires a lift.
 *
 * The visual's box space is read **once**, here: the composed
 * element→viewport matrix (the faithful mode's base transform), the
 * untransformed border-box size (both lifted modes' fixed box), the inherited
 * zoom (which the top layer does not escape, so a lifted visual divides it back
 * out), the inverse used by the in-place projection, and the inherited space
 * the activation scope publishes all come from that one traversal.
 *
 * **That "once" is now load-bearing rather than merely efficient** (D-85,
 * E-01). Everything below this measurement mutates the visual — positioning,
 * dimensions, top-layer state, transforms — so a second traversal taken
 * afterwards reads a different ancestry, and box-quad's own contract says the
 * two walks may legitimately disagree. A behavior that measured for itself
 * could therefore lift on one coordinate snapshot and report consumer deltas
 * from another.
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
): LiftAcquisition {
  const measured = box();

  if (!coordinates(visual, measured)) {
    // No readable box space: the visual is disconnected, fragmented across
    // lines, or inside a 3D-transformed subtree, so there is no single rect to
    // lift from.
    throw new Error('drag: presentation/visual-no-box-space');
  }

  // **Read before anything mutates, published for every mode.** The in-place
  // branch below hands the same value to `compose`; the lifted branches hand
  // `compose` the identity, because a lifted visual is repositioned into the
  // viewport, and still publish this one — which is the divergence D-85 exists
  // to state.
  const inheritedSpace = inheritedSpaceOf(measured);
  const width = measured[BOX_WIDTH]!;
  const height = measured[BOX_HEIGHT]!;
  const ancestorZoom = measured[BOX_ANCESTOR_ZOOM]!;
  const style = realm.window.getComputedStyle(visual);
  const styleLeaseDisposer = captureInlineStyles(visual);

  // Everything below mutates the visual. The style lease is already held, but
  // the *caller* only learns about it through the returned session — so a throw
  // from here on would leave the visual promoted and restyled with nothing that
  // could ever restore it. Acquisition is all-or-nothing (contract 02
  // §Acquisition is all-or-nothing).
  try {
    if (mode === LIFT_IN_PLACE) {
      // Stay in the container, ride the authored transform, and suppress
      // transitions so engine transform writes apply instantly.
      const own = style.transform;
      visual.style.transition = 'none';

      return {
        session: makeSession(
          visual,
          own === 'none' ? '' : own,
          inheritedSpace,
          styleLeaseDisposer,
        ),
        inheritedSpace,
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
      // **Written now, not left to the first `moved()`.** A faithful lift puts
      // the visual at the viewport origin and encodes its entire position in
      // the matrix, so until something writes a transform the row paints in
      // the top-left corner at its untransformed size. The kernel activates
      // *on* a pointer sample and renders only from the next one, so that
      // window is a real frame whenever the pointer pauses or its samples
      // coalesce. Promotion has to be visually transparent on its own — the
      // same reason `neutralizeUA` re-asserts the authored UA properties.
      // The flat branch below needs no equivalent: it positions from
      // `originRect` and its base transform is empty.
      visual.style.transform = base;
    } else {
      if (ancestorZoom !== 1) {
        visual.style.zoom = `${1 / ancestorZoom}`;
      }

      visual.style.top = `${originRect.top + originRect.height / 2 - height / 2}px`;
      visual.style.left = `${originRect.left + originRect.width / 2 - width / 2}px`;
    }

    const topLayerDisposer = acquireTopLayer(visual);

    const session = makeSession(visual, base, null, () => {
      // `finally`, not sequence: restoring the inline styles is the one
      // guarantee this module owns outright, and a `hidePopover()` that throws
      // — or a prior-popover restoration that does — must not cost the visual
      // its authored `position`, `width` and `transform` permanently.
      try {
        topLayerDisposer();
      } finally {
        styleLeaseDisposer();
      }
    });

    return { session, inheritedSpace };
  } catch (error) {
    styleLeaseDisposer();
    throw error;
  }
}
