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
 * apart. Two complete `BehaviorSpec`s are written against it — y sortable
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
 *
 * **Thirteen negative assertions and one positive shape check** (`n12`, the
 * seven-field kernel frame). The plan said twelve directives before pass 4;
 * there were eleven, and counting a positive assignment among them overstated
 * the negative evidence by one (C4-06). Pass 5 added `n13` and `n14`.
 *
 * ## What pass 4 added, and why it matters
 *
 * C4-03 and C4-06 both asked the same thing in different places: **instantiate
 * the ownership paths instead of describing them.** So this file now compiles
 * `unbrand → factory → arm`, creates one runtime inside one install factory,
 * builds a `LandingContext` whose `from` *is* `lift.rendered`, and branches both
 * sortable seams on `pointerId`. Every one of those replaced a `declare` that
 * proved two aliases were compatible and nothing more.
 *
 * ## What pass 5 added
 *
 * The same lesson one level down. `BehaviorLiftSession` is now a **positive**
 * `Pick`, so `rendered` and `dispose` are both unreachable from a behavior and
 * `n13`/`n14` prove it; activation publishes `rt.placeholder` and `rt.lift` and
 * inserts the placeholder **at home**, so release is what moves it to the
 * destination and the release body reads fields this file assigns rather than
 * asserting around fields it never did.
 *
 * ## What pass 6 added
 *
 * Ownership hygiene that the pass-5 publication created: `retire()` now clears
 * `placeholder` and `lift` as well as `pendingRequest`, and the impossible
 * missing-resource branch in `release.effect` **throws** instead of returning —
 * a normal return would leave the staged `ResolutionCommand` eligible for
 * execution, so `onReorder` would run for an operation whose presentation was
 * never assembled. Publishing state is not free: it adds a clearing obligation
 * and a failure path, and pass 5 added the publication without either.
 */
import type { CancelStage, FailureStage } from '../../src/kernel/failures.ts';
import type {
  Draft,
  Frame,
  FramePartOf,
  KernelFrame,
} from '../../src/kernel/frames.ts';
import type { LifetimeScope } from '../../src/kernel/lifetimes.ts';
import type { Transition } from '../../src/kernel/seams.ts';
import type {
  BehaviorContext,
  PreparedSettlement,
  ResolutionCommand,
  SettlementInput,
  SettlementTransition,
} from '../../src/kernel/spec.ts';
import type { Point } from '../../src/kernel/types.ts';
import type { SortableController } from '../../src/sortable/controller.ts';
import {
  type ReorderRequest,
  ReorderResolution,
  type ReorderResolution as ReorderResolutionValue,
} from '../../src/sortable/domain.ts';

/* ========================================================== D-35 ========== */

/**
 * **The lift session records what it rendered.**
 *
 * Conforming behavior rendering goes through `write` from acquisition until
 * `LandingContext.from` is sampled; after that the landing runner is the
 * deliberate writer, until `destroy()` (C4-02). `compose` builds a string for a
 * runner and records nothing.
 */
type KernelVisualLiftSession = Readonly<{
  visual: HTMLElement;
  baseTransform: string;
  compose(x: number, y: number): string;
  write(x: number, y: number): void;
  /** The delta `write` last composed. `(0, 0)` before the first write. */
  readonly rendered: Point;
  dispose(): void;
}>;

/**
 * **What a behavior is handed** (C4-02, corrected at C5-01).
 *
 * Two members are kernel-only, for two different reasons:
 *
 * - **`rendered`** — reading it is how a behavior would start mirroring the
 *   delta into its own state, which is the duplication D-35 exists to delete.
 * - **`dispose`** — a *sequencing* hazard, and the worse of the two. A behavior
 *   that disposes from `activation.effect` or `moved` restores the inline-style
 *   lease (and, in a lifted mode, the top-layer lease) while the session's
 *   recorded delta still describes its last `write`. The landing then samples
 *   `from` for a visual that is no longer lifted — I-34 broken through a
 *   first-class SPI method rather than through the tier-C escape hatch.
 *
 * The first version of this fixture wrote `Omit<…, 'rendered'>`, which left
 * `dispose` visible, and contract 02 handed over the whole session. **Positive
 * selection, not `Omit`**: the list says what a behavior may do, so a member
 * added to the session later is kernel-only by default.
 *
 * **Two things this projection does not do**, both tier-C residues (I-34):
 *
 * - direct `visual.style.transform` writes stay available — the behavior holds
 *   the element through `visual` here and through `ActivationScope.visual`;
 * - **`write` is retained and stays effective.** A behavior may call it only
 *   before `LandingContext.from` is sampled; calling it after that fights the
 *   landing runner, and calling it after `retire()` writes onto an element no
 *   live operation owns. Neither is refused, deliberately — a phase guard would
 *   put a branch on the hot path and turn a violation into a silent no-op
 *   (C6-01). Structural projection cannot express a *temporal* rule, because
 *   the member has to exist for rendering to happen at all.
 */
type BehaviorLiftSession = Readonly<
  Pick<
    KernelVisualLiftSession,
    'visual' | 'baseTransform' | 'compose' | 'write'
  >
>;

/**
 * **`LandingContext` itself is imported.** D-35 changed where `from` is
 * *sourced* — the lift session's record rather than the pointer delta — and not
 * the shape a runner sees, so restating the type here would assert nothing.
 * What is still restated is `KernelVisualLiftSession.rendered`, which is the
 * part `src/` does not have yet.
 */

/**
 * **The source path D-35 depends on, compiled** (C4-06). Declaring both
 * `lift.rendered` and a published origin proves two aliases have the same
 * shape; it does not prove the kernel builds one from the other. This does, and
 * it is also where the sampling boundary in C4-02's narrowed rule sits: the
 * origin is read **once**, here, and D-155 moves that read to the join without
 * moving where it comes from.
 */
export function sampleLandingOrigin(
  lift: KernelVisualLiftSession,
  target: Point,
): Readonly<{
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
}> {
  return {
    fromX: lift.rendered.x,
    fromY: lift.rendered.y,
    targetX: target.x,
    targetY: target.y,
  };
}

/* ========================================================== D-33 ========== */

/**
 * **Implemented in Phase 15, so the restatement is gone.**
 *
 * `SettlementScope`, `PreparedSettlement` and `SettlementTransition` are now
 * imported from `src/` rather than restated here: `holdForReadiness()` takes
 * nothing, the gate plan is `{ presentation: boolean }`, and the
 * acknowledgement arrives through `BehaviorContext.presentationCommitted()`. A
 * restatement that outlives its implementation is how a fixture starts lying,
 * which is why each half is deleted the moment `src/` agrees with it rather
 * than at the end of the roadmap.
 *
 * The same is true of the public half below — `ResolutionOptions`,
 * `ReorderResolution` and `SortableController.ready(request)` are the shipped
 * ones. What is still restated in this file is D-32, D-34 and D-35, which land
 * with Phases 16 and 19–20.
 */

/* ========================================================== D-32 ========== */

/** Discrete, pointerless admission. One member, no staged value. */
type CommandAdmission<Part extends object> = Readonly<{
  types: readonly string[];
  admit(event: Event, draft: Draft<Part>): HTMLElement | null;
}>;

/* ===================================================== host and spec ====== */

/**
 * **`BehaviorContext` is imported.** Seven members: six unchanged — D-32 added none,
 * which is the result it claims — and `presentationCommitted`, which is D-33's
 * and shipped with Phase 15. The kernel-side contradiction rule it carries is
 * kernel-private and therefore not expressible in this fixture; the behavior
 * half of the same rule *is*, in `createSortableController` below.
 */

type RevisedActivationScope = Readonly<{
  visual: HTMLElement;
  originRect: DOMRectReadOnly;
  lift: BehaviorLiftSession;
  motion: LifetimeScope;
  presentation: LifetimeScope;
}>;

/**
 * **Restated locally, and only the release arm needed it** (D-152). The
 * revision's release and settlement `prepare` returned `… | SeamRejection`, and
 * the type is deleted from `src/` — a non-discardable seam now fails by
 * throwing, like every other seam. A fixture of a past surface keeps the
 * surface, so the arm is declared here rather than dropped: what this file
 * pins is that the **revision** compiled as one system, and editing it to
 * today's shape would erase the evidence rather than update it.
 *
 * The **settlement** half needs no restatement, by this file's own rule: it
 * imports `SettlementTransition` from `src/` because the revision's shape was
 * implemented, and `src/` still agrees with it — the arm was the only thing
 * D-152 took, and neither settlement site here returns one.
 */
type RevisedSeamRejection = Readonly<{
  stage: FailureStage;
  error: unknown;
}>;

type RevisedReleaseTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>): ResolutionCommand | RevisedSeamRejection;
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
  settlement: SettlementTransition<Part>;
  action: RevisedActionTransition<Part>;

  moved(current: Readonly<Frame<Part>>, lift: BehaviorLiftSession): void;
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
  kernel: BehaviorContext,
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

/**
 * The other half of the brand, and the **only** place the erasure is undone.
 * `object` / `{}` are the widest bounds the parameters permit, which is sound
 * because nothing inside the executor is generic over either: the kernel threads
 * the staged value and drops it.
 */
declare function unbrandBehavior<Controller>(
  behavior: RevisedBehavior<Controller>,
): RevisedBehaviorFactory<Controller, object, {}>;

/**
 * The kernel controller, as `draggable()` holds it: the behavior-facing
 * interface plus the arming member the interface does not carry.
 */
declare function createKernel<Part extends object>(
  root: HTMLElement,
): BehaviorContext &
  Readonly<{ arm(spec: RevisedBehaviorSpec<Part, {}>): void }>;

/**
 * **The construction bridge, compiled** (C4-03).
 *
 * The previous fixture `declare`d this signature after the brand, which proved
 * the two aliases were assignable and nothing else. Written out, it proves the
 * step D-34 actually needs: `Activation` is erased at the brand, survives
 * `unbrand` as `{}`, and reaches `arm` without the driver ever being generic
 * over it.
 *
 * `arm` takes `{}` for `Activation`, which is the same erasure 01 describes: the
 * kernel calls `activation.prepare`, hands whatever it returns straight back to
 * `activation.effect`, and never inspects or constructs one. Both behaviors'
 * specs are assignable to it without a cast, which is the property being
 * checked — if the driver had to name `HTMLElement`, D-34 would not have worked.
 */
function draggable<Controller>(
  root: HTMLElement,
  behavior: RevisedBehavior<Controller>,
): Controller {
  const factory = unbrandBehavior(behavior);
  const kernel = createKernel<object>(root);
  const { spec, controller } = factory(kernel);

  kernel.arm(spec);
  return controller;
}

/* ============================================= the public resolution ====== */

/**
 * **Also imported now.** ~~`ResolutionOptions`,~~ `ReorderResolution` and
 * `SortableController` shipped with Phase 15, so what this file once restated as
 * "the consumer surface D-33 produces" is the surface itself. The property the
 * restatement existed to check is unchanged and now checked against the real
 * thing: **no settlement machinery crosses the public boundary** —
 * ~~`presentation: true` is a declaration and `ready(request)` is an
 * acknowledgement keyed on the object the callback was handed~~ (both deleted
 * by D-41).
 *
 * **The alias points at the union rather than at its accepted arm** since
 * D-143 unpublished the arms: the resolution is opaque, so there is no narrower
 * type to name — which strengthens the property this line checks rather than
 * weakening it, since an opaque value is the strongest form of *no settlement
 * machinery crosses the boundary* this file could have asked for.
 */
type AcceptedResolution = ReorderResolution;

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
 * `pendingRequest` is one of the **seven** mutable fields of the behavior's
 * private runtime — six before D-33 added it, beside three readonly ones
 * (`host`, `slots`, `frame`). An earlier count said "the eighth mutable field",
 * which counted the readonly three as mutable (C4-08).
 *
 * It holds the *exact* `ReorderRequest` object this operation handed
 * `onReorder` — published by `release.effect` before the kernel executes the
 * round-trip, compared by identity in `controller.ready`, cleared by `retire()`.
 */
type SortableRuntime = {
  readonly kernel: BehaviorContext;
  placeholder: HTMLElement | null;
  lift: BehaviorLiftSession | null;
  pendingRequest: ReorderRequest | null;
};

/**
 * **One runtime, created inside the install factory** (C4-06). The previous
 * fixture used an ambient `rt` that the spec closed over while the controller
 * was handed a separately declared one, so TypeScript never checked the
 * normative coupling: `createSortableSpec(rt)` and `createSortableController(host,
 * rt)` must receive the **same** object, and neither can exist before a `host`.
 */
declare function createSortableRuntime(
  kernel: BehaviorContext,
): SortableRuntime;
declare function createPlaceholder(item: HTMLElement): HTMLElement;
/** `item.after(placeholder)` — the home slot, at activation, on both paths. */
declare function insertAtHome(
  item: HTMLElement,
  placeholder: HTMLElement,
): void;
declare function homeInsertion(item: HTMLElement): number;
declare function invalidateInsertion(): void;
declare function resolveInsertion(draft: Draft<SortablePart>): number | null;
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
declare const rejection: RevisedSeamRejection;

/**
 * The sortable stages a detached placeholder, so it names `HTMLElement`
 * explicitly — the one declaration site D-34 costs.
 */
export function createSortableSpec(
  rt: SortableRuntime,
): RevisedBehaviorSpec<SortablePart, HTMLElement> {
  return {
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
      /**
       * **Branched on `pointerId`** (C4-01). The previous fixture seeded nothing
       * and so compiled a command path that was not the one the contract
       * specified for the real sortable: 02's seam table seeded home
       * *unconditionally*, which destroys the gap `command.admit` just wrote.
       */
      prepare(draft, scope): HTMLElement | null {
        draft.visual = scope.visual;

        if (draft.pointerId !== -1) {
          draft.insertion = homeInsertion(draft.item!);
        }
        // Pointerless: `draft.insertion` already holds the command's destination.
        // Nothing revalidates it here — a queued `updateItems()` is rebased or
        // cancelled by `action.prepare(COLLECTION)` before release runs.

        return createPlaceholder(scope.visual);
      },

      /**
       * **The normative I-30 order, and the home-then-destination sequence**
       * (C5-04). The previous fixture moved the placeholder straight to
       * `current.insertion` here, which for a pointerless operation is already
       * the command's destination — so the placeholder arrived before release,
       * and the file told a different lifecycle story from 02 while being cited
       * as the complete one.
       *
       * Activation inserts **at home** on both paths. Release is what moves it
       * to the final gap. And both `rt.placeholder` and `rt.lift` are published
       * here, so the release body below reads fields this file actually
       * assigns rather than relying on `!` and `?.` to typecheck around them.
       */
      effect(current, placeholder, scope): void {
        // 1 → 2: register the release before the resource can be observed.
        scope.presentation.use(() => {
          placeholder.remove();
        });
        insertAtHome(current.item!, placeholder);

        // 3: publish private-runtime references, once every resource is owned.
        rt.placeholder = placeholder;
        rt.lift = scope.lift;
      },
    },

    release: {
      /**
       * **Branched on `pointerId`** (C4-01), and the branch is only *where the
       * insertion comes from*. Both paths build the proposal from the same
       * `draft.insertion` through the same `buildRequest`, which is what makes
       * "a keyboard and a pointer reorder to the same gap produce identical
       * proposals" a statement about one code path.
       */
      prepare(draft): ResolutionCommand | RevisedSeamRejection {
        if (draft.item === null) {
          return rejection;
        }

        if (draft.pointerId !== -1) {
          invalidateInsertion();
          draft.insertion = resolveInsertion(draft) ?? draft.insertion;
        } else if (draft.insertion === null) {
          // A command that reached RELEASING with no destination has lost state
          // the kernel guaranteed to carry. Reporting it as a home-gap reorder
          // would tell the consumer a drop completed normally — so it is a
          // rejection, never a fallback.
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
        //
        // The placeholder move is UNCONDITIONAL — a command reorders too — and
        // only the lift write is branched on the pointerless discriminant.
        // This is where home becomes the destination, on both paths;
        // `activation.effect` published the placeholder at home (C5-04).
        const { placeholder, lift } = rt;

        if (placeholder === null || lift === null) {
          // Activation published both, so reaching here without them is a
          // broken invariant — stated rather than asserted away with `!`.
          //
          // It **throws** rather than returning (C6-02). A normal return would
          // leave the staged `ResolutionCommand` eligible for execution, so the
          // consumer's `onReorder` would run for an operation whose
          // presentation was never assembled. Throwing here is
          // `FAILURE_RELEASE` from the committed state, and the contract's rule
          // for that is exact: the staged command is **not** executed.
          throw new Error(
            'drag: release.effect reached without a presentation',
          );
        }

        movePlaceholder(placeholder, current.insertion ?? 0);

        if (current.pointerId !== -1) {
          lift.write(
            current.pointerX - current.originX,
            current.pointerY - current.originY,
          );
        }
        // Pointerless: there is no release sample and the visual has not moved
        // since acquisition, so the session's recorded delta stays `(0, 0)` —
        // the correct landing origin, not a missing one (D-35).

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
      prepare(draft, input): PreparedSettlement {
        classify(draft, input);

        // **Stale as of D-41, and left in place rather than rewritten.** The
        // authored-presentation declaration is deleted with the protocol, so
        // `Prepared` is the bare sentinel and there is one gate.
        return true;
      },

      // **Stale as of D-155**: the landing gate this requested is deleted, and
      // the timing that replaced it is asked for at the join.
      effect(): void {},
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

    /**
     * Drops **every** per-operation reference the spec published, not only the
     * acknowledgement identity (C6-02). `activation.effect` publishes
     * `placeholder` and `lift`; retiring without clearing them would retain a
     * detached element and a dead lift capability for the controller's life,
     * and would let the next operation's `release.effect` read the previous
     * one's resources instead of failing the check above.
     */
    retire(): void {
      rt.placeholder = null;
      rt.lift = null;
      rt.pendingRequest = null;
    },
  };
}

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
  kernel: BehaviorContext,
  _runtime: SortableRuntime,
): SortableController {
  return {
    invalidate(): void {},

    // Wrapped, not detached: the kernel's members are prototype methods, and
    // what a controller publishes is a closure over the call.
    cancel: (reason?: unknown): void => {
      kernel.cancel(reason);
    },
    destroy: (): Promise<void> => kernel.destroy(),
  };
}

export const sortableBehavior: RevisedBehavior<SortableController> =
  brandBehavior(
    (
      kernel,
    ): RevisedBehaviorInstall<
      SortableController,
      SortablePart,
      HTMLElement
    > => {
      // One `rt`, here, shared by both halves — the coupling 01 §The behavior
      // instance states and the previous fixture's ambient declaration hid.
      const rt = createSortableRuntime(kernel);

      return {
        spec: createSortableSpec(rt),
        controller: createSortableController(kernel, rt),
      };
    },
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
    prepare(): ResolutionCommand | RevisedSeamRejection {
      return { invoke: (signal): unknown => invokeOnDrop(signal) };
    },
    effect(): void {},
  },

  settlement: {
    prepare(): PreparedSettlement {
      return true;
    },
    // **Stale as of D-155**, exactly as the sortable's above is.
    effect(): void {},
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

declare function createFreeController(kernel: BehaviorContext): FreeController;

export const freeBehavior: RevisedBehavior<FreeController> = brandBehavior(
  (kernel): RevisedBehaviorInstall<FreeController, FreeDragPart, true> => ({
    spec: freeDragSpec,
    controller: createFreeController(kernel),
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
  _controller: SortableController,
  setOrder: (request: ReorderRequest) => void,
): Readonly<{
  onReorder(request: ReorderRequest): AcceptedResolution;
  layoutEffect(): void;
}> {
  let _pending: ReorderRequest | null = null;

  return {
    onReorder(request): AcceptedResolution {
      // **Superseded by D-41's serial authored commit.** The acknowledgement
      // this modelled is deleted: a consumer that must render first awaits its
      // own commit barrier inside `onReorder`, and the layout effect below has
      // nothing to acknowledge.
      _pending = request;
      setOrder(request);
      return ReorderResolution.accept();
    },

    layoutEffect(): void {
      _pending = null;
    },
  };
}

/* ================================================= negative assertions ==== */

declare const kernel: BehaviorContext;
declare const spec: RevisedBehaviorSpec<SortablePart, HTMLElement>;

/** The behavior still cannot mint an operation (13a N-5 survives D-32). */
// @ts-expect-error — no `activate` on the revised host.
export const n1: unknown = kernel.activate;

/** Nor drive motion (13c N-4 survives D-35). */
// @ts-expect-error — no `move` on the revised host.
export const n2: unknown = kernel.move;

/** Nor read a decision back out of the queue (13a N-3 survives D-32). */
// @ts-expect-error — `dispatch` returns void.
export const n3: boolean = kernel.dispatch(0, null);

/** Nor register ingress itself: `types` is a declaration, not a listener. */
// @ts-expect-error — no ingress registration on the revised host.
export const n4: unknown = kernel.addIngress;

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
export const n9: PreparedSettlement = promised;

/**
 * And no settlement primitive crosses the public surface. The scope itself is
 * retired (D-155), so what the assertion once read off a live type it now reads
 * off the shape that is left: no gates, no members, nothing to hold.
 */
declare const scope: Readonly<Record<never, never>>;

// @ts-expect-error — deleted with the readiness protocol (D-41).
export const n10: object = scope.holdForReadiness;

/** An acknowledgement without an identity is not expressible. */
export const n11 = (): void => {
  // @ts-expect-error — deleted with the readiness protocol (D-41); it required
  // the request it acknowledged, and there is no acknowledgement.
  void sortableController.ready;
};

/**
 * **The behavior cannot sample the recorded delta** (C5-01). If it could, D-35's
 * "the behavior supplies nothing" would be a convention rather than a type.
 */
declare const activationScope: RevisedActivationScope;

// @ts-expect-error — `rendered` is kernel-only on the projected session.
export const n13: unknown = activationScope.lift.rendered;

/**
 * **Nor unwind the lift it was handed.** This is the one C5-01 called a blocker:
 * `dispose()` is a sequencing capability, not a reading one, and a behavior
 * holding it can restore the visual while the recorded delta still describes its
 * last `write` — breaking I-34 through a first-class method rather than through
 * the documented tier-C escape hatch.
 */
// @ts-expect-error — `dispose` is kernel-sequenced, exactly as `Lifetime`'s is.
export const n14: unknown = activationScope.lift.dispose;

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
