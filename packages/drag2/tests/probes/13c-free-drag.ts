/**
 * **Probe 13c — free drag as a second behavior, against the frozen SPI.**
 *
 * Write-up: `.plan/probes/13c-free-drag.md`.
 *
 * ## What this file is
 *
 * The `contract.ts` treatment, applied to the *implemented* SPI rather than to a
 * restatement of it: every `BehaviorSpec` member is written out, typed against
 * `../../src/kernel/spec.ts`, with inert stubs wherever a lifecycle would be
 * needed. It is **not** an implementation and must not be read as one — 00 warns
 * that typecheck cannot catch a lifecycle error, and a file this size can look
 * executable.
 *
 * ## What it found
 *
 * Two things the frozen SPI cannot express, both structural rather than
 * cosmetic:
 *
 * - **N-1 — activation is typed for a placeholder.** `BehaviorSpec.activation`
 *   is `Transition<Part, HTMLElement, ActivationScope>`: `prepare` must return
 *   an `HTMLElement`, and `null` means *discard the activation*. A free drag
 *   stages no resource at activation, so it has no honest value to return.
 * - **N-2 — the kernel derives the visual's position from the pointer.**
 *   `LandingContext.from` is `pointerX - originX`, which is true only for a
 *   behavior whose visual tracks the pointer exactly. Axis constraint, bounds
 *   clamping and a controlled position all break it, and nothing in
 *   `BehaviorSpec` can tell the kernel otherwise.
 *
 *   **Decided as D-35, and deliberately still failing to compile here.** The
 *   probe proposed a `renderedDelta(current): Point` seam; the revision records
 *   the delta inside `VisualLiftSession.write` instead, so **no behavior member
 *   reports it and none needs to**. N-2's assertion below therefore stays a
 *   compile error after the revision as well as before it — for the opposite
 *   reason. It is implemented with the second behavior (Phases 19–20), not in
 *   Phase 15, which is why this file still reads against the pointer-derived
 *   `from`.
 *
 * Everything else on the Phase 13c question list **fits** — see the `P-*` rows,
 * which are as much the deliverable as the `N-*` rows.
 */
import type { Draft, Frame, FramePartOf } from '../../src/kernel/frames.ts';
import type {
  LiftMode,
  VisualLiftSession,
} from '../../src/kernel/presentation.ts';
import type {
  ActivationScope,
  BehaviorSpec,
  BehaviorContext,
  PreparedSettlement,
  ResolutionCommand,
} from '../../src/kernel/spec.ts';
import type { Point } from '../../src/kernel/types.ts';

/* ------------------------------------------------------------ domain types */

/** As the shipped package: `'both' | 'x' | 'y'`, renumbered to constants. */
export const AXIS_BOTH = 0;
export const AXIS_X = 1;
export const AXIS_Y = 2;
export type DragAxis = typeof AXIS_BOTH | typeof AXIS_X | typeof AXIS_Y;

/** The shipped `CoordinateMapper`, unchanged. */
export type CoordinateMapper = Readonly<{
  toViewport(point: Point): Point;
  fromViewport(point: Point): Point;
  deltaFromViewport(delta: Point): Point;
}>;

/** The shipped `DragGeometry`, unchanged. */
export type DragGeometry = Readonly<{
  pointer: Point;
  originPointer: Point;
  viewportDelta: Point;
  localDelta: Point;
  originRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}>;

export type FreeHomeTarget = Readonly<{ position: Point; space: 'viewport' }>;

/** A source of bounds, resolved per read, as `free-drag/bounds.ts` does. */
export type BoundsSource =
  | 'viewport'
  | HTMLElement
  | (() => DOMRectReadOnly | null);

/**
 * The behavior's frame part. Note what is here and what is not: the *rendered*
 * delta is behavior state, because the kernel's `pointerX/pointerY` are the
 * pointer's position and free drag does not put the visual there.
 */
type FreeDragPart = {
  visual: HTMLElement | null;
  /** The delta actually written to the visual: axis-projected and clamped. */
  renderedX: number;
  renderedY: number;
  bounds: DOMRectReadOnly | null;
  boundsVersion: number;
  axis: DragAxis;
  /** Externally driven position, in the consumer space. `null` when free. */
  controlled: Point | null;
  outcome: number;
  domain: unknown;
};

/** The behavior's private runtime — H-2: the kernel cannot name or type it. */
type FreeDragRuntime = Readonly<{
  kernel: BehaviorContext;
  mapper: CoordinateMapper;
  boundsSource: BoundsSource | null;
  liftMode: LiftMode;
  onMove: ((geometry: DragGeometry) => void) | null;
  resolveHome: (() => FreeHomeTarget) | null;
  originRect: DOMRectReadOnly | null;
  lift: VisualLiftSession | null;
}>;

declare const rt: FreeDragRuntime;
declare const kernel: BehaviorContext;

/* ------------------------------------------------------- pure helpers ----- */

declare function resolveBounds(
  source: BoundsSource | null,
): DOMRectReadOnly | null;
declare function buildGeometry(
  current: Readonly<Frame<FreeDragPart>>,
  rt: FreeDragRuntime,
): DragGeometry;
declare function resolveFreeHandle(event: PointerEvent): HTMLElement | null;

/* ---- inert stubs: everything a lifecycle would own lives outside the probe */

declare function invokeOnDrop(signal: AbortSignal): unknown;
declare function declaresPresentation(value: unknown): boolean;
declare function reportTerminal(outcome: number, domain: unknown): void;
declare function reportToConsumer(error: unknown): void;

/**
 * Axis projection then bounds clamp, over the *origin-relative delta* — the
 * space `lift.write` consumes. Pure arithmetic over numbers the frame already
 * holds: no DOM read.
 *
 * **Split into two scalar functions rather than one returning a `Point`.** The
 * first version of this probe returned `{ x, y }` while its own comment claimed
 * the path allocated nothing, which was simply false — one `Point` per pointer
 * sample (Checkpoint C, C-07). Type expressibility and hot-path cost are
 * separate claims and the probe must not blur them: P-1 is about whether the
 * constraint *fits* the seam, and it fits in the shape that also happens to be
 * allocation-free, which is the shape worth writing down.
 */
function constrainX(
  dx: number,
  axis: DragAxis,
  bounds: DOMRectReadOnly | null,
  origin: DOMRectReadOnly,
): number {
  const x = axis === AXIS_Y ? 0 : dx;

  if (bounds === null) {
    return x;
  }

  const min = bounds.left - origin.left;
  const max = bounds.right - origin.right;

  return x < min ? min : x > max ? max : x;
}

function constrainY(
  dy: number,
  axis: DragAxis,
  bounds: DOMRectReadOnly | null,
  origin: DOMRectReadOnly,
): number {
  const y = axis === AXIS_X ? 0 : dy;

  if (bounds === null) {
    return y;
  }

  const min = bounds.top - origin.top;
  const max = bounds.bottom - origin.bottom;

  return y < min ? min : y > max ? max : y;
}

/* ============================================================ P — it fits = */

/**
 * **P-1. Clamp-before-write costs nothing on the hot path.** `moved` receives
 * the committed frame and the lift session; the constraint is arithmetic over
 * fields the frame already holds, and the bounds rect is cached in the frame
 * part with a version, so a thunk source is resolved on invalidation rather than
 * per sample. 00's claim that P-2 is resolved at no hot-path cost survives its
 * first real test — *as a shape*. The number is Phase 21's.
 *
 * **P-2. A consumer coordinate space is behavior-private.** `CoordinateMapper`
 * is pure and lives in the behavior's runtime. The kernel is never told about
 * it: it commits viewport pointer coordinates, and the mapper is applied when
 * geometry is handed to the consumer. No seam changes.
 *
 * **P-3. `onMove` per sample is expressible.** It is one call at the end of
 * `moved`. Whether a per-sample consumer callback is *affordable* is an M-1
 * question, not an SPI one.
 *
 * **P-4. Lift mode as a public option is a surface decision, not a seam
 * change.** `BehaviorConfig.liftMode` is static spec data chosen by the behavior
 * at install (`src/sortable/spec.ts:254` picks `LIFT_FAITHFUL` and says why), so
 * a feature can supply it. What is undecided is whether a *kernel-internal enum*
 * should become public — Phase 18, not Phase 14.
 *
 * **P-5. `anchorTarget` covers `resolveHomeTarget`.** It returns a viewport
 * point and receives `authoredReady`, which is exactly the shipped synchronous
 * home-target contract. Rejected and canceled drops answer with the home target;
 * accepted ones answer with the drop position.
 *
 * **P-6. Live policy update is an ordinary behavior action.** `controller.update`
 * dispatches; `action.prepare` writes the new axis/bounds/mapper into the draft.
 * 00's P-1 ("policy updates are behavior actions and the kernel supplies the
 * transition envelope") holds. The *controlled position* half of `update()` does
 * not — see N-2.
 */

/* ======================================================= the typed behavior */

const createFreeDragPart = (): FramePartOf<FreeDragPart> => ({
  visual: null,
  renderedX: 0,
  renderedY: 0,
  bounds: null,
  boundsVersion: -1,
  axis: AXIS_BOTH,
  controlled: null,
  outcome: 0,
  domain: null,
});

/** Behavior action tags. */
const UPDATE_POLICY = 0;
const UPDATE_POSITION = 1;
const FREE_ACTION_TAGS = 2;

export const freeDragSpec: BehaviorSpec<FreeDragPart> = {
  createFramePart: createFreeDragPart,

  resetFramePart(frame): void {
    frame.visual = null;
    frame.renderedX = 0;
    frame.renderedY = 0;
    frame.bounds = null;
    frame.boundsVersion = -1;
    frame.controlled = null;
    frame.outcome = 0;
    frame.domain = null;
  },

  config: {
    threshold: 8,
    liftMode: rt.liftMode,
    actionTags: FREE_ACTION_TAGS,
  },

  /** Handle resolution, exactly as the sortable does it. Fits unchanged. */
  admit(event, draft): HTMLElement | null {
    const visual = resolveFreeHandle(event);

    if (visual === null) {
      return null;
    }

    draft.visual = visual;
    return visual;
  },

  activation: {
    /**
     * **N-1, in situ — and resolved by D-34, which has now landed.**
     *
     * There is nothing to stage, and the honest return value is "proceed". At
     * probe time the frozen `Prepared` type was `HTMLElement`, whose only other
     * inhabitant — `null` — means *discard the activation*, so this returned
     * `scope.visual`: an element the kernel already holds, chosen as the least
     * misleading lie available. It was still a lie, and `effect` had to ignore
     * what it was handed — the "staged resource" contract inverted.
     *
     * `BehaviorSpec<Part, Activation extends {} = true>` makes the honest
     * answer expressible, and this probe now takes it by writing nothing: the
     * spec above names no `Activation`, so the default applies and `prepare`
     * returns `true`. The line below is the probe's finding, discharged.
     */
    prepare(draft): true | null {
      draft.bounds = resolveBounds(rt.boundsSource);
      return true;
    },

    effect(current, _prepared, scope): void {
      scope.presentation.use(() => {
        // Free drag registers no presentation resource of its own; the lift is
        // the kernel's. The disposer exists so the shape matches.
      });
      rt.onMove?.(buildGeometry(current, rt));
    },
  },

  release: {
    prepare(draft): ResolutionCommand {
      // **Updated with the live SPI** (D-152). This file is typed against
      // `src/kernel/spec.ts` rather than restating it, so the deleted rejection
      // arm goes here too: the seam is already open at `FAILURE_RELEASE`, so a
      // throw is classified at exactly the stage this used to name.
      if (draft.visual === null) {
        throw new Error('free drag: no visual at release');
      }

      // The consumer round-trip. `null` would assert a proven semantic no-op,
      // which a free drop never is: it always has a position to report.
      return {
        invoke: (signal: AbortSignal): unknown => invokeOnDrop(signal),
      };
    },

    effect(): void {
      // Motion is already closed by the kernel. Nothing to do.
    },
  },

  settlement: {
    prepare(draft, input): PreparedSettlement {
      draft.outcome = input.type;

      // **Stale as of D-41**: the authored-presentation declaration this used
      // to compute is deleted with the protocol, so `Prepared` is the bare
      // sentinel.
      return true;
    },

    // **Stale as of D-155**: the landing gate this used to request is deleted
    // with the protocol, and what replaces it is a timing policy the kernel
    // asks for at the join rather than a runner the settlement arms.
    effect(): void {},
  },

  action: {
    prepare(tag, argument, draft): {} | null {
      if (tag === UPDATE_POLICY) {
        const next = argument as Readonly<{ axis?: DragAxis }>;

        if (next.axis !== undefined) {
          draft.axis = next.axis;
        }

        draft.bounds = resolveBounds(rt.boundsSource);
        return {};
      }

      if (tag === UPDATE_POSITION) {
        // **N-2, in situ.** This writes the behavior's own idea of where the
        // visual is. It cannot write `pointerX`/`pointerY` — those are the
        // kernel's, and `Draft` presents them readonly — so from here on the
        // kernel's pointer fields and the visual's real position disagree, and
        // the kernel is the one that computes `LandingContext.from`.
        draft.controlled = argument as Point;
        return {};
      }

      return null;
    },

    effect(tag, _argument, current): void {
      if (tag !== UPDATE_POSITION) {
        return;
      }

      // Writing directly, because there is no way to make the kernel emit a
      // `moved` for a position it did not sample. The write is therefore
      // outside the kernel's `FAILURE_RENDERER_WRITE` wrapper.
      rt.lift?.write(current.renderedX, current.renderedY);
    },
  },

  /**
   * The hot path. Constrain, write, then notify — and record what was actually
   * written, which is the value the kernel will not ask for (N-2).
   */
  moved(current, lift): void {
    const origin = rt.originRect!;

    lift.write(
      constrainX(
        current.pointerX - current.originX,
        current.axis,
        current.bounds,
        origin,
      ),
      constrainY(
        current.pointerY - current.originY,
        current.axis,
        current.bounds,
        origin,
      ),
    );
    rt.onMove?.(buildGeometry(current, rt));
  },

  /** P-5: the shipped synchronous home target, unchanged. */
  anchorTarget(current): Point {
    // D-41: measured once, authoritatively — there is no provisional pass, so
    // the `authoredReady` arm this used to branch on is gone.
    if (rt.resolveHome === null) {
      const origin = rt.originRect!;

      return {
        x: origin.left + current.renderedX,
        y: origin.top + current.renderedY,
      };
    }

    return rt.resolveHome().position;
  },

  finalized(current): void {
    reportTerminal(current.outcome, current.domain);
  },

  reportError(error): void {
    reportToConsumer(error);
  },

  retire(): void {
    // Inert stub: the real behavior drops per-operation references here.
  },
};

/* ============================================ N — what does not fit ======= */

/**
 * **N-1. Activation is typed for a placeholder — closed by D-34.**
 *
 * The honest free-drag activation stages nothing, so its `prepare` returns
 * "proceed". The frozen `Prepared` was `HTMLElement`, and `null` is already
 * spoken for: it means *discard the activation*. That was the sortable's shape
 * in the SPI rather than in the sortable. The generic already existed —
 * `Transition<Part, Prepared extends {} = true, …>` defaults `Prepared` to
 * `true` — and `BehaviorSpec` pinned it.
 *
 * **The assertion is inverted rather than deleted**, and deliberately: a
 * finding that becomes a compiling positive is evidence the decision landed,
 * while a deleted finding is evidence of nothing. `honestActivation` is the
 * same declaration it always was, and it is now assignable. The counterpart —
 * that a behavior *declaring* `HTMLElement` still cannot return `true`, so the
 * parameter narrows in both directions — is asserted in
 * `tests/kernel/vocabulary.node.test.ts` against the shipping sortable.
 */
declare const honestActivation: Readonly<{
  prepare(draft: Draft<FreeDragPart>, scope: ActivationScope): true | null;
  effect(
    current: Readonly<Frame<FreeDragPart>>,
    prepared: true,
    scope: ActivationScope,
  ): void;
}>;

export const n1: BehaviorSpec<FreeDragPart>['activation'] = honestActivation;

/**
 * **N-2. Nothing tells the kernel where the visual actually is.**
 *
 * `LandingContext.from` is computed as `pointerX - originX`
 * (`src/kernel/kernel.ts:1194-1197`) and documented as "equal to the last drag
 * translation". For the sortable it is: `moved` writes the raw pointer delta
 * (`src/sortable/spec.ts:437-440`). For a free drag with an axis constraint,
 * bounds, or a controlled position, it is not — the behavior wrote
 * `renderedX/renderedY`, and the kernel has no member to read them through.
 *
 * The consequence is not theoretical: the landing animation starts from a
 * position the visual is not at, so the drop opens with a jump and ends
 * correctly, because the *target* is behavior-supplied through `anchorTarget`
 * and the kernel re-pins at the join.
 */
// @ts-expect-error — no seam reports the rendered delta to the kernel.
export const n2: unknown = freeDragSpec.currentDelta;

/**
 * **N-3. A behavior cannot move the operation.** `Draft` presents the kernel
 * slice readonly (`Omit<Part, keyof KernelFrame> & Readonly<KernelFrame>`), so a
 * controlled position cannot be injected as a synthetic sample. That is correct
 * ownership — and it is why N-2 has no workaround inside the frame.
 */
declare const writeThroughDraft: (draft: Draft<FreeDragPart>) => void;

export const n3: typeof writeThroughDraft = (draft): void => {
  // @ts-expect-error — `pointerX` is readonly on the draft.
  draft.pointerX = 0;
};

/**
 * **N-4. There is no context route to a synthetic motion commit either.** The
 * seven `BehaviorContext` members are `realm`, `root`, `dispatch`, `fail`,
 * `closed`, `cancel`, `destroy`. A controlled position therefore has exactly
 * two options today:
 * write the lift directly from an action effect, outside the kernel's renderer
 * wrapper (what this probe does, and what makes N-2 visible), or nothing.
 */
// @ts-expect-error — no motion entry on the frozen context.
export const n4: unknown = kernel.move;
