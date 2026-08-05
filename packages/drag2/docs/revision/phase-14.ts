/**
 * **Phase 14 revision fixture — does the revised contract compile as one
 * system?**
 *
 * Checkpoint C, C-06. The three Phase 13 probes import the **pre-revision** SPI
 * from `../../src/` and their negative assertions are permanent evidence of the
 * gaps Phase 13 found; they say nothing about whether D-32…D-35 fit together.
 * The broken `BehaviorInstall` generic the review found is exactly the class of
 * defect a compiled fixture catches and prose does not.
 *
 * ## What this file is
 *
 * The `contract.ts` treatment applied to the **revised** surface: the parts of
 * the SPI the revision changed are **restated here**, and everything it did not
 * change is imported from `../../src/` so the two halves cannot silently drift
 * apart. Two complete `BehaviorSpec`s are written against it — vertical sortable
 * with `Activation = HTMLElement`, free drag with the `true` default — plus the
 * construction handshake, so inference is exercised rather than asserted, and
 * D-33's **request-identity path** end to end: built in `release.prepare`,
 * published by `release.effect`, compared in `controller.ready`, cleared by
 * `retire()`.
 *
 * ## What it is not
 *
 * It is not an implementation and it is not lifecycle validation. Every value is
 * `declare`d or inert, apart from the one report call the protocol requires to
 * be visible. Contract 00 is explicit that typecheck cannot catch a lifecycle
 * error, and this file is large enough to look executable while remaining a
 * type-only fixture. The lifecycle cases belong to Phases 15, 16 and 19–20.
 *
 * ## The rule that makes it evidence
 *
 * `tsc` errors on an unused `@ts-expect-error`, so a green
 * `npx just typecheck` from `packages/drag2` asserts both halves: the positive
 * shapes compile, and each negative one still does not.
 */
import { DEV } from '../../src/kernel/dev.ts';
import type { CancelStage, FailureStage } from '../../src/kernel/failures.ts';
import type {
  Draft,
  Frame,
  FramePartOf,
  KernelFrame,
} from '../../src/kernel/frames.ts';
import type { LifetimeScope } from '../../src/kernel/lifetimes.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';
import { report } from '../../src/kernel/reporter.ts';
import type { Transition } from '../../src/kernel/seams.ts';
import {
  type ResolutionCommand,
  type SeamRejection,
  SETTLED_FULFILLED,
  type SettlementInput,
} from '../../src/kernel/spec.ts';
import type { Point } from '../../src/kernel/types.ts';

/* ========================================================== D-35 ========== */

/**
 * **The lift session records what it rendered.**
 *
 * `write` is the sole rendering entry point between acquisition and the join;
 * `compose` builds a string for a runner and records nothing. `rendered` is
 * kernel-read only — no behavior member reports it, which is why 13c N-2's
 * assertion still fails to compile after the revision.
 */
type RevisedVisualLiftSession = Readonly<{
  visual: HTMLElement;
  baseTransform: string;
  compose(x: number, y: number): string;
  write(x: number, y: number): void;
  /** The delta `write` last composed. `(0, 0)` before the first write. */
  readonly rendered: Point;
  dispose(): void;
}>;

type RevisedLandingContext = Readonly<{
  visual: HTMLElement;
  compose(x: number, y: number): string;
  /** Sourced from `lift.rendered`, never from `pointerX - originX` (D-35). */
  from: Point;
  target: Point;
  realm: DOMRealm;
}>;

type RevisedLandingHandle = Readonly<{
  destroy(): void;
  retarget?(target: Point): void;
}>;

type RevisedLandingStart = (
  context: RevisedLandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => RevisedLandingHandle;

/* ========================================================== D-33 ========== */

/**
 * **The gate plan is a boolean, and the acknowledgement is a host signal.**
 *
 * No public protocol object: the consumer declares *that* a presentation is
 * coming through its resolution, and acknowledges it through the controller,
 * keyed on the request it was handed. `holdForReadiness()` takes nothing.
 */
type RevisedSettlementScope = Readonly<{
  holdForReadiness(): void;
  holdForLanding(start: RevisedLandingStart): void;
}>;

type RevisedPreparedSettlement = Readonly<{ presentation: boolean }>;

type RevisedSettlementTransition<Part extends object> = Readonly<{
  prepare(
    draft: Draft<Part>,
    input: SettlementInput,
  ): RevisedPreparedSettlement | SeamRejection;
  effect(
    current: Readonly<Frame<Part>>,
    prepared: RevisedPreparedSettlement,
    scope: RevisedSettlementScope,
  ): void;
}>;

/* ========================================================== D-32 ========== */

/** Discrete, pointerless admission. One member, no staged value. */
type CommandAdmission<Part extends object> = Readonly<{
  types: readonly string[];
  admit(event: Event, draft: Draft<Part>): HTMLElement | null;
}>;

/* ===================================================== host and spec ====== */

/**
 * Seven members. Six of them are unchanged — D-32 added none, which is the
 * result it claims — and `presentationCommitted` is D-33's.
 */
type RevisedKernelHost = Readonly<{
  realm: DOMRealm;
  root: HTMLElement;
  dispatch(tag: number, argument: unknown): void;
  fail(stage: FailureStage, error: unknown): void;
  /**
   * The authored presentation for the operation the kernel currently holds is
   * final. Latched while a resolution attempt is open, releases the readiness
   * hold once armed, ignored and reported outside both windows.
   *
   * Not a transition and not a classification: a gate release is not a frame
   * transition, so this is `cancel`'s family, not `commit`'s.
   *
   * **The kernel-side contradiction (C3-02).** An early acknowledgement is
   * latched before the kernel can know whether a presentation will be declared,
   * so the contradiction is resolved at seal — not dropped:
   *
   * ```text
   * seal:
   *   attempt.authoredReady = !attempt.readinessHeld
   *   if (attempt.presentationLatched && !attempt.readinessHeld)
   *       report(new Error('drag: ready() … declared no presentation'))
   *       attempt.presentationLatched = false      ← discarded, not applied
   * arm:
   *   attempt.presentationLatched ? dispatch(READINESS_SETTLED)
   *                               : start the readiness deadline
   * ```
   *
   * It is kernel-private and therefore not expressible in this fixture — the
   * behavior half of the same rule *is*, in `createSortableController` below.
   * Both take {@link report}, both are `DEV`-gated, and neither classifies.
   */
  presentationCommitted(): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

type RevisedActivationScope = Readonly<{
  visual: HTMLElement;
  originRect: DOMRectReadOnly;
  lift: RevisedVisualLiftSession;
  motion: LifetimeScope;
  presentation: LifetimeScope;
}>;

type RevisedReleaseTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>): ResolutionCommand | SeamRejection;
  effect(current: Readonly<Frame<Part>>, prepared: ResolutionCommand): void;
}>;

type RevisedActionTransition<Part extends object> = Readonly<{
  prepare(tag: number, argument: unknown, draft: Draft<Part>): {} | null;
  effect(
    tag: number,
    argument: unknown,
    current: Readonly<Frame<Part>>,
    prepared: {},
  ): void;
  rollback?(tag: number, prepared: {}): void;
}>;

/** D-34: the behavior chooses what activation stages. */
type RevisedBehaviorSpec<
  Part extends object,
  Activation extends {} = true,
> = Readonly<{
  createFramePart(): FramePartOf<Part>;
  resetFramePart(frame: Part): void;

  config: Readonly<{
    threshold: number;
    liftMode: number;
    readinessTimeout: number;
    actionTags: number;
  }>;

  admit(event: PointerEvent, draft: Draft<Part>): HTMLElement | null;
  command?: CommandAdmission<Part>;

  activation: Transition<Part, Activation, RevisedActivationScope>;
  release: RevisedReleaseTransition<Part>;
  settlement: RevisedSettlementTransition<Part>;
  action: RevisedActionTransition<Part>;

  moved(current: Readonly<Frame<Part>>, lift: RevisedVisualLiftSession): void;
  anchorTarget(current: Readonly<Frame<Part>>, authoredReady: boolean): Point;
  finalized(current: Readonly<Frame<Part>>): void;
  reportFailure(stage: FailureStage, error: unknown): void;
  retire(): void;
}>;

/* ================================================ C-04: the handshake ===== */

/**
 * **The construction generics, threaded.** The review found `BehaviorInstall`
 * requiring three arguments while `Behavior` supplied two, which did not
 * compile and could not infer `HTMLElement` for one behavior and `true` for
 * another. The chain below is exercised by `sortableController` and
 * `freeController` at the bottom of this file.
 */
type RevisedBehaviorInstall<
  Controller,
  Part extends object,
  Activation extends {},
> = Readonly<{
  spec: RevisedBehaviorSpec<Part, Activation>;
  controller: Controller;
}>;

type RevisedBehaviorFactory<
  Controller,
  Part extends object,
  Activation extends {},
> = (
  host: RevisedKernelHost,
) => RevisedBehaviorInstall<Controller, Part, Activation>;

declare const BEHAVIOR_BRAND: unique symbol;

/** Both `Part` and `Activation` are erased at the brand; no consumer names either. */
type RevisedBehavior<Controller> = Readonly<{
  [BEHAVIOR_BRAND]: Controller;
}>;

declare function brandBehavior<
  Controller,
  Part extends object,
  Activation extends {},
>(
  factory: RevisedBehaviorFactory<Controller, Part, Activation>,
): RevisedBehavior<Controller>;

declare function draggable<Controller>(
  root: HTMLElement,
  behavior: RevisedBehavior<Controller>,
): Controller;

/* ============================================= the public resolution ====== */

type ReorderRequest = Readonly<{ from: number; to: number; version: number }>;

type ResolutionOptions = Readonly<{
  /** An authored presentation will follow, and will be acknowledged. */
  presentation?: boolean;
}>;

type AcceptedResolution = Readonly<{
  type: 'accepted';
  presentation: boolean;
}>;
type RejectedResolution = Readonly<{
  type: 'rejected';
  reason: unknown;
  presentation: boolean;
}>;
type ReorderResolutionValue = AcceptedResolution | RejectedResolution;

declare const ReorderResolution: Readonly<{
  accept(options?: ResolutionOptions): AcceptedResolution;
  reject(reason?: unknown, options?: ResolutionOptions): RejectedResolution;
}>;

/**
 * The consumer surface D-33 produces. **No settlement machinery crosses it**:
 * `presentation: true` is a declaration, and `ready(request)` is an
 * acknowledgement keyed on the object the callback was handed.
 */
type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  /**
   * The authored presentation for `request` is committed. A request that is not
   * the operation's own is ignored and reported — which is what makes a late
   * acknowledgement from a timed-out operation unable to release a newer one.
   */
  ready(request: ReorderRequest): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

/* ================================================= behavior 1: sortable === */

type SortablePart = {
  item: HTMLElement | null;
  visual: HTMLElement | null;
  insertion: number | null;
  proposal: Readonly<{ request: ReorderRequest }> | null;
  outcome: number;
  recovery: number;
  domain: unknown;
  cancelStage: CancelStage | null;
};

/**
 * **C2-02: the request-identity data path, compiled.**
 *
 * `pendingRequest` is the eighth mutable field of the behavior's private
 * runtime. It holds the *exact* `ReorderRequest` object this operation handed
 * `onReorder` — published by `release.effect` before the kernel executes the
 * round-trip, compared by identity in `controller.ready`, cleared by `retire()`.
 */
type SortableRuntime = {
  readonly host: RevisedKernelHost;
  placeholder: HTMLElement | null;
  lift: RevisedVisualLiftSession | null;
  pendingRequest: ReorderRequest | null;
};

declare const rt: SortableRuntime;
declare function createPlaceholder(item: HTMLElement): HTMLElement;
declare function movePlaceholder(placeholder: HTMLElement, gap: number): void;
declare function resolveItem(event: Event): HTMLElement | null;
declare function commandInsertion(
  item: HTMLElement,
  direction: number,
): number | null;
declare function directionOf(event: KeyboardEvent): number | null;
declare function buildRequest(part: Draft<SortablePart>): ReorderRequest;
declare function onReorder(
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
): ReorderResolutionValue | PromiseLike<ReorderResolutionValue>;
declare function classify(
  draft: Draft<SortablePart>,
  input: SettlementInput,
): void;
declare const startLanding: RevisedLandingStart | null;
declare const rejection: SeamRejection;

/**
 * The sortable stages a detached placeholder, so it names `HTMLElement`
 * explicitly — the one declaration site D-34 costs.
 */
export const sortableSpec: RevisedBehaviorSpec<SortablePart, HTMLElement> = {
  createFramePart: (): FramePartOf<SortablePart> => ({
    item: null,
    visual: null,
    insertion: null,
    proposal: null,
    outcome: 0,
    recovery: 0,
    domain: null,
    cancelStage: null,
  }),

  resetFramePart(frame): void {
    frame.item = null;
    frame.visual = null;
    frame.insertion = null;
    frame.proposal = null;
    frame.domain = null;
    frame.cancelStage = null;
  },

  config: {
    threshold: 8,
    liftMode: 0,
    readinessTimeout: 500,
    // Three, not two: spatial, collection, and the behavior-local invalidation
    // tag the implementation has carried since Checkpoint B.
    actionTags: 3,
  },

  admit(event, draft): HTMLElement | null {
    const item = resolveItem(event);

    if (item === null) {
      return null;
    }

    // No `preventDefault()` here: C-03 moved it to the kernel, which calls it
    // exactly when an admission member returns non-null.
    draft.item = item;
    draft.visual = item;
    return item;
  },

  command: {
    types: ['keydown'],

    admit(event, draft): HTMLElement | null {
      const direction = directionOf(event as KeyboardEvent);
      const item = resolveItem(event);

      if (direction === null || item === null) {
        return null;
      }

      const gap = commandInsertion(item, direction);

      // The edge case, and the whole reason the decision is synchronous: an
      // item already at the edge yields `null`, the kernel does not prevent the
      // default, and the arrow key keeps its native meaning.
      if (gap === null) {
        return null;
      }

      // The destination travels in the draft, exactly as `item` does for a
      // press. No staged value crosses the ingress boundary.
      draft.item = item;
      draft.visual = item;
      draft.insertion = gap;
      return item;
    },
  },

  activation: {
    prepare(draft, scope): HTMLElement | null {
      draft.visual = scope.visual;
      return createPlaceholder(scope.visual);
    },

    effect(current, placeholder, scope): void {
      scope.presentation.use(() => {
        placeholder.remove();
      });
      movePlaceholder(placeholder, current.insertion ?? 0);
    },
  },

  release: {
    prepare(draft): ResolutionCommand | SeamRejection {
      if (draft.item === null) {
        return rejection;
      }

      const request = buildRequest(draft);

      draft.proposal = { request };
      return { invoke: (signal): unknown => onReorder(request, { signal }) };
    },

    effect(current): void {
      // The committed presentation writes come FIRST (C3-04). `release.effect`
      // throwing classifies `FAILURE_RELEASE` and the staged command is never
      // executed, so publishing ahead of the render would name a round-trip
      // that cannot happen.
      rt.lift?.write(
        current.pointerX - current.originX,
        current.pointerY - current.originY,
      );

      // Still published before the kernel executes the command — both are
      // inside this effect — so the request the consumer is about to receive is
      // already the one `ready()` will be checked against, including under a
      // synchronous commit (C-01).
      //
      // Reached through the **committed frame**, which is what makes this the
      // same object the staged `invoke` closure captured. `ResolutionCommand`
      // does not carry it and does not need to: putting a sortable domain value
      // on a kernel SPI type is the mistake D-34 and D-35 just corrected.
      rt.pendingRequest = current.proposal?.request ?? null;
    },
  },

  settlement: {
    prepare(draft, input): RevisedPreparedSettlement | SeamRejection {
      classify(draft, input);

      // Only a fulfilled round-trip can declare an authored presentation.
      return {
        presentation:
          input.type === SETTLED_FULFILLED &&
          (input.value as ReorderResolutionValue).presentation,
      };
    },

    effect(_current, prepared, scope): void {
      if (prepared.presentation) {
        scope.holdForReadiness();
      }

      if (startLanding !== null) {
        scope.holdForLanding(startLanding);
      }
    },
  },

  action: {
    prepare(_tag, _argument, _draft): {} | null {
      return true;
    },
    effect(): void {},
  },

  moved(current, lift): void {
    lift.write(
      current.pointerX - current.originX,
      current.pointerY - current.originY,
    );
  },

  anchorTarget(_current, _authoredReady): Point {
    return { x: 0, y: 0 };
  },

  finalized(): void {},
  reportFailure(): void {},

  retire(): void {
    rt.pendingRequest = null;
  },
};

/**
 * **The identity check itself.** Written out rather than `declare`d, because it
 * is the mechanism C2-02 asks to see, and C3-02 asks to see its report path.
 *
 * Note what typecheck can and cannot say here: it cannot prove *object
 * identity*, because a structurally equal `ReorderRequest` literal is
 * assignable to the parameter. The `===` below is a **runtime** check, and the
 * matrix row that pins it is 05 §Authored-presentation acknowledgement, "a
 * `ready()` for a request the operation never issued". The fixture's job is to
 * show that the path exists and composes, not to prove the comparison.
 */
function createSortableController(
  host: RevisedKernelHost,
  runtime: SortableRuntime,
): SortableController {
  return {
    updateItems(): void {},

    ready(request): void {
      if (request !== runtime.pendingRequest) {
        // Stale, forged, or a duplicate after retirement. Reported, never
        // applied — this is what stops operation A's late layout effect from
        // releasing operation B's gate (I-35).
        //
        // C3-02: *reported* is half the contract, so the call is here rather
        // than in a comment. It takes the platform channel, gated on `DEV`,
        // and it does not reach `host.fail` — a consumer-protocol error must
        // never classify the operation the consumer got right.
        if (DEV) {
          report(
            new Error(
              'drag: controller.ready() received a request this operation never issued; ignored.',
            ),
          );
        }

        return;
      }

      // The matching-but-undeclared contradiction is NOT checked here. The
      // behavior does not know what the resolution declared — `presentation`
      // travels through `Prepared` to the kernel — so the kernel owns that
      // report, at seal or on arrival. See `RevisedKernelHost` above.
      host.presentationCommitted();
    },

    cancel: host.cancel,
    destroy: host.destroy,
  };
}

export const sortableBehavior: RevisedBehavior<SortableController> =
  brandBehavior(
    (
      host,
    ): RevisedBehaviorInstall<
      SortableController,
      SortablePart,
      HTMLElement
    > => ({
      spec: sortableSpec,
      controller: createSortableController(host, rt),
    }),
  );

/* ================================================ behavior 2: free drag === */

type FreeDragPart = {
  visual: HTMLElement | null;
  renderedX: number;
  renderedY: number;
  axis: number;
  outcome: number;
  domain: unknown;
};

type FreeController = Readonly<{
  update(policy: Readonly<{ axis?: number }>): void;
  destroy(): void;
}>;

declare function constrainX(dx: number, axis: number): number;
declare function constrainY(dy: number, axis: number): number;
declare function invokeOnDrop(signal: AbortSignal): unknown;

/**
 * Free drag stages **nothing** at activation, so it names no second argument
 * and gets `true`. Under the pre-revision `BehaviorSpec` this had to return
 * `scope.visual` — an element it does not own, which `effect` then ignored.
 */
export const freeDragSpec: RevisedBehaviorSpec<FreeDragPart> = {
  createFramePart: (): FramePartOf<FreeDragPart> => ({
    visual: null,
    renderedX: 0,
    renderedY: 0,
    axis: 0,
    outcome: 0,
    domain: null,
  }),

  resetFramePart(frame): void {
    frame.visual = null;
    frame.renderedX = 0;
    frame.renderedY = 0;
    frame.domain = null;
  },

  config: { threshold: 8, liftMode: 0, readinessTimeout: 500, actionTags: 2 },

  admit(_event, draft): HTMLElement | null {
    return draft.visual;
  },

  activation: {
    /** The honest return value, which the pre-revision SPI had no way to say. */
    prepare(_draft, _scope): true | null {
      return true;
    },
    effect(_current, prepared: true, _scope): void {
      void prepared;
    },
  },

  release: {
    prepare(): ResolutionCommand | SeamRejection {
      return { invoke: (signal): unknown => invokeOnDrop(signal) };
    },
    effect(): void {},
  },

  settlement: {
    prepare(): RevisedPreparedSettlement | SeamRejection {
      return { presentation: false };
    },
    effect(_current, _prepared, scope): void {
      if (startLanding !== null) {
        scope.holdForLanding(startLanding);
      }
    },
  },

  action: {
    prepare(_tag, _argument, _draft): {} | null {
      return true;
    },
    effect(): void {},
  },

  /**
   * The hot path, written the way P-1 claims it can be: **scalars only, no
   * `Point` allocation** (C-07). The constrained delta reaches `lift.write`
   * directly, and the session records it — which is the whole of D-35 for a
   * behavior whose visual does not track the pointer.
   */
  moved(current, lift): void {
    lift.write(
      constrainX(current.pointerX - current.originX, current.axis),
      constrainY(current.pointerY - current.originY, current.axis),
    );
  },

  anchorTarget(current): Point {
    return { x: current.renderedX, y: current.renderedY };
  },

  finalized(): void {},
  reportFailure(): void {},
  retire(): void {},
};

declare function createFreeController(host: RevisedKernelHost): FreeController;

export const freeBehavior: RevisedBehavior<FreeController> = brandBehavior(
  (host): RevisedBehaviorInstall<FreeController, FreeDragPart, true> => ({
    spec: freeDragSpec,
    controller: createFreeController(host),
  }),
);

/* ============================================ inference through draggable = */

declare const root: HTMLElement;

/** Both controllers infer, from behaviors whose `Activation` differs. */
export const sortableController: SortableController = draggable(
  root,
  sortableBehavior,
);
export const freeController: FreeController = draggable(root, freeBehavior);

/* =========================================== the reference integration ==== */

/**
 * **C-01: the acknowledgement capability exists before the mutation it
 * acknowledges**, because it *is* the argument to the callback that asks for
 * the mutation. A synchronous commit — `flushSync`, a synchronous renderer, a
 * non-React consumer — finds `pending` already written.
 */
export function referenceIntegration(
  controller: SortableController,
  setOrder: (request: ReorderRequest) => void,
): Readonly<{
  onReorder(request: ReorderRequest): AcceptedResolution;
  layoutEffect(): void;
}> {
  let pending: ReorderRequest | null = null;

  return {
    onReorder(request): AcceptedResolution {
      // Written **before** the mutation, which is the ordering the token
      // protocol could not establish: the kernel minted its token after
      // `onReorder` returned.
      pending = request;
      setOrder(request);
      return ReorderResolution.accept({ presentation: true });
    },

    layoutEffect(): void {
      if (pending !== null) {
        controller.ready(pending);
        pending = null;
      }
    },
  };
}

/* ================================================= negative assertions ==== */

declare const host: RevisedKernelHost;
declare const spec: RevisedBehaviorSpec<SortablePart, HTMLElement>;

/** The behavior still cannot mint an operation (13a N-5 survives D-32). */
// @ts-expect-error — no `activate` on the revised host.
export const n1: unknown = host.activate;

/** Nor drive motion (13c N-4 survives D-35). */
// @ts-expect-error — no `move` on the revised host.
export const n2: unknown = host.move;

/** Nor read a decision back out of the queue (13a N-3 survives D-32). */
// @ts-expect-error — `dispatch` returns void.
export const n3: boolean = host.dispatch(0, null);

/** Nor register ingress itself: `types` is a declaration, not a listener. */
// @ts-expect-error — no ingress registration on the revised host.
export const n4: unknown = host.addIngress;

/** D-35 adds no behavior member; nothing reports the rendered delta. */
// @ts-expect-error — the delta is the session's, not the spec's.
export const n5: unknown = spec.renderedDelta;

/** The kernel slice stays read-only through the draft (13c N-3). */
export const n6 = (draft: Draft<SortablePart>): void => {
  // @ts-expect-error — `pointerId` is readonly on the draft.
  draft.pointerId = -1;
};

/** D-34 binds in both directions, not just the permissive one. */
declare const staged: Readonly<{
  prepare(
    draft: Draft<FreeDragPart>,
    scope: RevisedActivationScope,
  ): true | null;
  effect(
    current: Readonly<Frame<FreeDragPart>>,
    prepared: true,
    scope: RevisedActivationScope,
  ): void;
}>;

// @ts-expect-error — a spec declaring `HTMLElement` cannot stage `true`.
export const n7: RevisedBehaviorSpec<FreeDragPart, HTMLElement>['activation'] =
  staged;

declare const elementStaged: Readonly<{
  prepare(
    draft: Draft<FreeDragPart>,
    scope: RevisedActivationScope,
  ): HTMLElement | null;
  effect(
    current: Readonly<Frame<FreeDragPart>>,
    prepared: HTMLElement,
    scope: RevisedActivationScope,
  ): void;
}>;

// @ts-expect-error — a spec defaulting to `true` cannot stage an element.
export const n8: RevisedBehaviorSpec<FreeDragPart>['activation'] =
  elementStaged;

/** D-33: the promise is gone from the prepared gate plan. */
declare const promised: Readonly<{ ready: PromiseLike<void> }>;

// @ts-expect-error — `PreparedSettlement` carries a boolean, not a thenable.
export const n9: RevisedPreparedSettlement = promised;

/** And no settlement primitive crosses the public surface. */
declare const scope: RevisedSettlementScope;

// @ts-expect-error — `holdForReadiness` yields no token to hand out.
export const n10: object = scope.holdForReadiness();

/** An acknowledgement without an identity is not expressible. */
export const n11 = (): void => {
  // @ts-expect-error — `ready` requires the request it acknowledges.
  sortableController.ready();
};

/** The kernel slice is untouched by the revision: still seven fields. */
export const n12: KernelFrame = {
  phase: 0,
  operation: null,
  pointerId: -1,
  originX: 0,
  originY: 0,
  pointerX: 0,
  pointerY: 0,
};
