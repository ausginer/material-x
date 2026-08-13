/**
 * The behavior–kernel SPI (contract 02).
 *
 * Everything here is a *type* plus a handful of discriminant constants. The
 * kernel executor lives in `kernel.ts`; this module exists so the behavior side
 * can be authored against the contract without importing the executor, and so
 * the frozen surface is readable in one place.
 */
import type { CancelStage, FailureStage } from './failures.ts';
import type { Draft, Frame, FramePartOf } from './frames.ts';
import type { LifetimeScope } from './lifetimes.ts';
import type { LiftMode, VisualLiftSession } from './presentation.ts';
import type { DOMRealm } from './realm.ts';
import type { Transition } from './seams.ts';
import type { Point } from './types.ts';

/**
 * The whole construction-time surface. Six members, none of which lets the
 * behavior drive a transition (contract D-2).
 *
 * Created once and stable for the controller's life, so a behavior that
 * captures it captures one object.
 */
export type KernelHost = Readonly<{
  /** The owning document/window. Every DOM access goes through it. */
  realm: DOMRealm;

  /** The ingress boundary passed to `draggable()`. */
  root: HTMLElement;

  /**
   * Enqueue one behavior action. `tag` is behavior-local and must be in
   * `0 .. config.actionTags - 1`; the kernel offsets it internally and
   * bounds-checks it here. An out-of-range tag is reported and dropped, never
   * enqueued — the kernel computes `BEHAVIOR_BASE + tag`, so a negative or
   * fractional tag would otherwise alias a kernel action.
   */
  dispatch(tag: number, argument: unknown): void;

  /**
   * Queue a classified failure against the operation the kernel currently
   * holds. Never thrown at the producer.
   *
   * Valid **only inside a kernel-driven seam of the current operation**; a call
   * outside one is downgraded to a platform report, because a late continuation
   * from operation A could otherwise classify a failure against operation B
   * (F-23).
   */
  fail(stage: FailureStage, error: unknown): void;

  /**
   * The authored presentation for the operation the kernel currently holds is
   * final (D-33).
   *
   * Latched while a resolution attempt is open — which is what makes a
   * **synchronous** commit, one that lands inside `onReorder` before the
   * settlement exists, acknowledge successfully. Releases the readiness hold
   * once armed. Ignored and reported outside both windows.
   *
   * Not a transition and not a classification: a gate release is not a frame
   * transition, so this belongs to `cancel`'s family rather than `commit`'s.
   * The behavior calls it only after checking that the acknowledgement the
   * consumer gave names *this* operation; the kernel never learns what the
   * identity is.
   */
  presentationCommitted(): void;

  /**
   * **Is this controller logically closed?** The sanctioned liveness reading,
   * and the only one (D-53, I-37).
   *
   * This is the latch itself, not a proxy for it. No physical-teardown
   * observation may answer a liveness question: under D-36 physical teardown is
   * deferred to the transaction boundary, so `presentation.signal.aborted`, a
   * disposed session and a detached node all **lag** the logical close. They
   * were chosen because they are strictly *stronger* than the latch — they also
   * fire for a kernel-internal `panic()` — and deferral turns that same
   * property into strictly weaker.
   *
   * Readonly by construction: a behavior may consult the latch, never set it,
   * which is what keeps closure the kernel's to decide.
   */
  readonly closed: boolean;

  /** Base controller methods, for the behavior to spread into its controller. */
  cancel(reason?: unknown): void;

  /**
   * Closes the controller **logically**, immediately, on this statement. The
   * returned promise settles **once**, after physical teardown — which is this
   * call when no library transaction is active, and the boundary of the
   * outermost one when there is (D-36).
   *
   * Idempotent: repeated destruction closes nothing further and every returned
   * promise still settles exactly once.
   */
  destroy(): Promise<void>;
}>;

/**
 * **Discrete, pointerless admission — a second ingress, not a second protocol**
 * (D-32).
 *
 * The load-bearing half of probe 13a's case is not the absence of a pointer: it
 * is that a command's **feasibility must be answered synchronously, inside the
 * native listener**, so `preventDefault()` is called only when the command is
 * possible. An arrow key on an edge item has to keep its native meaning. Every
 * behavior-initiated entry in the frozen SPI is fire-and-forget — `dispatch`
 * returns `void` and the decision would land on the drain, after the listener
 * returned.
 *
 * It is **internal**: a behavior declares which events the kernel binds; a
 * consumer does not.
 */
/**
 * What an admission member returns when it admits (D-59).
 *
 * A bare `HTMLElement` is the common form and means `box === visual`, which is
 * `box(item) = visual(item)`'s default (D-43) written as the absence of a
 * choice rather than as a repeated one. The pair form names a separate geometry
 * source, because what leaves flow is the **visual** while what the layout
 * loses is the **box**, and api-1 measured that no single-window rule
 * reproduces the removed footprint in both nested cases.
 *
 * Discriminated by `'visual' in subject`, never `instanceof HTMLElement`:
 * `instanceof` is realm-sensitive, and {@link DOMRealm} exists precisely
 * because an element may come from another document.
 *
 * `box` is **required** inside the pair. An optional `box` would give
 * *the box is the visual* two encodings, which this contract refuses
 * everywhere else.
 */
export type AdmissionSubject =
  | HTMLElement
  | Readonly<{ visual: HTMLElement; box: HTMLElement }>;

export type CommandAdmission<Part extends object> = Readonly<{
  /**
   * The event types the kernel binds on `root`, for the controller's life,
   * inside the same ingress abort that owns `pointerdown`. Static spec data:
   * `arm()` validates it once, exactly as it validates `config.actionTags`.
   */
  types: readonly string[];

  /**
   * Runs synchronously inside the native listener, after the kernel's own
   * guards, with the draft open — the position `admit` occupies, and the only
   * position from which feasibility can still reach the producer.
   *
   * Returns the subject to lift, or `null` to decline. Declining is total: no
   * operation, no phase change, and the kernel does not prevent the default.
   *
   * The D-59 widening applies here identically, and `null` remains the single
   * decline value: a command lifts a visual and the footprint it removes is
   * measured from a box, so both admission members answer the same question
   * with the same type.
   */
  admit(event: Event, draft: Draft<Part>): AdmissionSubject | null;
}>;

/**
 * What the kernel grants `activation.prepare` and `activation.effect`. One
 * object per operation.
 *
 * `dispose` is projected away from both lifetimes, so I-11's "the behavior has
 * no opportunity to sequence release incorrectly" is a type property rather
 * than an aspiration (contract D-21).
 */
export type ActivationScope = Readonly<{
  /** The element the kernel is lifting — the visual half of what `admit` returned. */
  visual: HTMLElement;
  /** Its viewport rect at grab. Basis for every landing measurement. */
  originRect: DOMRectReadOnly;
  /**
   * The geometry source — what `admit` returned as the box half of its subject,
   * or `visual` when it returned a bare element (D-59). Held by the kernel from
   * admission, never read out of the behavior's frame part: a kernel that named
   * one behavior-authored field would contradict H-2 and D-15.
   */
  box: HTMLElement;
  /** The lift session. The behavior keeps it for `moved`. */
  lift: VisualLiftSession;
  /** Closed at release, cancel, destroy, panic. */
  motion: LifetimeScope;
  /** Closed at finalization, after both gates. */
  presentation: LifetimeScope;
}>;

/**
 * The release choice, **staged rather than called** (contract §`ResolutionCommand`).
 *
 * Exactly one choice, made exactly once, executed by the kernel after
 * `release.effect` returns and only if it returned normally. There is no
 * `unused → used → sealed` state machine and no missing-call failure stage.
 */
export type ResolutionCommand = Readonly<{
  /**
   * The consumer round-trip, or `null` to settle immediately with no round-trip.
   *
   * `null` asserts a **proven semantic no-op** and nothing else. A release that
   * finds no view, item, snapshot or insertion has a broken invariant and
   * returns a {@link SeamRejection}; reporting that as a successful no-op drop
   * would tell the consumer the drag completed normally.
   */
  invoke: ((signal: AbortSignal) => unknown) | null;
}>;

/**
 * Shared by the two non-discardable seams, which still need to say *this is a
 * failure, at this stage* (F-20). The kernel classifies it itself.
 */
export type SeamRejection = Readonly<{
  stage: FailureStage;
  error: unknown;
}>;

export type ReleaseTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>): ResolutionCommand | SeamRejection;
  effect(current: Readonly<Frame<Part>>, prepared: ResolutionCommand): void;
}>;

// ---------------------------------------------------------------------------
// Settlement (types here; the driver is phase 5)
// ---------------------------------------------------------------------------

/** The round-trip produced a value. */
export const SETTLED_FULFILLED = 40;
/** The thenable rejected, or `invoke` threw. A resolver malfunction. */
export const SETTLED_REJECTED = 41;
/** `invoke` was `null` — a proven semantic no-op. */
export const SETTLED_SKIPPED = 42;
/** A latched cancellation decided the operation. */
export const SETTLED_CANCELED = 43;
/** A classified failure decided the operation. */
export const SETTLED_FAILED = 44;

/**
 * Five cases, discriminated and exhaustive.
 *
 * `canceled` and `failed` are kernel-*triggered* but behavior-*owned*:
 * `outcome`, `recovery` and `domain` are fields of the behavior's frame part,
 * which the kernel cannot name or write, and `BehaviorSpec` has no other
 * terminal-classification hook (F-33).
 */
export type SettlementInput =
  | Readonly<{ type: typeof SETTLED_FULFILLED; value: unknown }>
  | Readonly<{ type: typeof SETTLED_REJECTED; error: unknown }>
  | Readonly<{ type: typeof SETTLED_SKIPPED }>
  | Readonly<{
      type: typeof SETTLED_CANCELED;
      reason: unknown;
      stage: CancelStage;
    }>
  | Readonly<{
      type: typeof SETTLED_FAILED;
      stage: FailureStage;
      error: unknown;
    }>;

/**
 * The gate plan travels through `Prepared`, not a private write.
 *
 * `presentation` is a **declaration**, not a capability: the behavior says an
 * authored presentation is coming, and the acknowledgement arrives later
 * through `KernelHost.presentationCommitted()` (D-33). It carried a
 * `PromiseLike<void>` until Phase 15, which put four consumer-owned obligations
 * behind one silent 500 ms timeout.
 */
export type PreparedSettlement = Readonly<{ presentation: boolean }>;

/**
 * **One coordinate space, and this is it.**
 *
 * `from`, `target` and `LandingHandle.retarget()`'s argument are all
 * *origin-relative viewport deltas*: CSS pixels to translate the visual by,
 * measured from where its border box sat when the drag was admitted. That is
 * exactly the space `compose()` and the kernel's own
 * `lift.write()` consume, so a runner never converts anything —
 * `compose(from.x, from.y)` reproduces the transform the drag last wrote, and
 * `compose(target.x, target.y)` is where the visual has to end up.
 *
 * It is deliberately **not** a viewport point. `anchorTarget` produces one, and
 * the kernel converts before the context is built, because a runner's only
 * writer is `compose`, which cannot convert a point: the context carries no
 * origin rect and is not given one. Handing over a point would make every
 * runner re-derive the grab basis the kernel already holds.
 *
 * The space is unaffected by the lift mode. Both lifted modes translate the
 * delta directly; the in-place mode projects it through the inverse of its
 * inherited box space, inside `compose`. A runner sees the same numbers either
 * way.
 */
export type LandingContext = Readonly<{
  visual: HTMLElement;
  /** Full transform string for an origin-relative delta, including the base. */
  compose(x: number, y: number): string;
  /** Where the visual is now, as a delta. Equal to the last drag translation. */
  from: Point;
  /**
   * Where it should land, as a delta. Provisional: it may be superseded by
   * `LandingHandle.retarget()`, and correctness does not depend on it — the
   * kernel measures again at the join and performs the authoritative pin.
   */
  target: Point;
  realm: DOMRealm;
}>;

export type LandingHandle = Readonly<{
  /**
   * Stop, and relinquish control of the visual's transform so the kernel's
   * final pin is not overridden. Never writes a final position, never
   * dispatches.
   */
  destroy(): void;
  /**
   * Optional trajectory-quality capability. Absent runners are fully correct.
   *
   * `target` is in the same space as `LandingContext.target` — an
   * origin-relative viewport delta — so a runner can hand it straight to
   * `compose`.
   */
  retarget?(target: Point): void;
}>;

export type LandingStart = (
  context: LandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => LandingHandle;

/**
 * Both gate methods **record a request and arm nothing**. Arming happens once,
 * after the scope seals, when the complete gate plan is known (contract
 * §Request, seal, then arm).
 */
export type SettlementScope = Readonly<{
  /**
   * Hold the authored-presentation gate, bounded by `config.readinessTimeout`.
   * At most once.
   *
   * **Takes nothing**: the acknowledgement does not arrive through settlement,
   * it arrives through `KernelHost.presentationCommitted()` (D-33).
   */
  holdForReadiness(): void;
  /**
   * Hold the landing gate. The kernel builds the context and owns the attempt.
   * At most once.
   */
  holdForLanding(start: LandingStart): void;
}>;

export type SettlementTransition<Part extends object> = Readonly<{
  prepare(
    draft: Draft<Part>,
    input: SettlementInput,
  ): PreparedSettlement | SeamRejection;
  effect(
    current: Readonly<Frame<Part>>,
    prepared: PreparedSettlement,
    scope: SettlementScope,
  ): void;
}>;

// ---------------------------------------------------------------------------
// BehaviorSpec
// ---------------------------------------------------------------------------

/**
 * Behavior action tags get the same envelope, which is what makes "the behavior
 * never calls `begin()`/`commit()`" hold for behavior-initiated work too.
 *
 * `Prepared` is opaque to the kernel, which threads it; the behavior narrows it
 * by tag.
 */
export type ActionTransition<Part extends object> = Readonly<{
  prepare(tag: number, argument: unknown, draft: Draft<Part>): {} | null;
  effect(
    tag: number,
    argument: unknown,
    current: Readonly<Frame<Part>>,
    prepared: {},
  ): void;
  rollback?(tag: number, prepared: {}): void;
}>;

export type BehaviorConfig = Readonly<{
  /** Activation travel in viewport pixels. The kernel owns the distance test. */
  threshold: number;
  /** Which lift strategy the kernel acquires at activation. */
  liftMode: LiftMode;
  /** Bound on the authored-presentation gate, in ms. */
  readinessTimeout: number;
  /**
   * How many behavior action tags exist. Static spec data, because otherwise
   * there is nothing for `arm()` to validate and `dispatch` has no bound to
   * check a tag against (review 5 §13).
   */
  actionTags: number;
}>;

export type BehaviorSpec<Part extends object> = Readonly<{
  /** `FramePartOf` rejects a part that declares a kernel frame key. */
  createFramePart(): FramePartOf<Part>;
  resetFramePart(frame: Part): void;

  config: BehaviorConfig;

  /**
   * Runs synchronously inside `pointerdown`, after the kernel's own guards,
   * with the draft open. Returns the element the kernel should lift, or `null`
   * to leave the controller idle (D-5).
   *
   * `composedPath()` is valid only here. **`preventDefault()` is not the
   * behavior's** — the ingress owner performs it, exactly when an admission
   * member returns non-null, in both input modes. The behavior answers
   * feasibility with its return value and nothing else (C-03).
   *
   * Returns the element the kernel should lift — optionally paired with the
   * element the kernel should measure (D-59) — or `null` to leave the
   * controller idle.
   */
  admit(event: PointerEvent, draft: Draft<Part>): AdmissionSubject | null;

  /**
   * The optional second ingress (D-32). A behavior that omits it binds no
   * discrete listener at all, and `arm()` binds `pointerdown` and nothing else.
   */
  command?: CommandAdmission<Part>;

  /* ---- transactional seams ---- */
  activation: Transition<Part, HTMLElement, ActivationScope>;
  release: ReleaseTransition<Part>;
  settlement: SettlementTransition<Part>;
  action: ActionTransition<Part>;

  /* ---- non-transactional seams ---- */
  /**
   * The committed pointer sample changed. The hot path.
   *
   * **The kernel wraps this call** and classifies a throw as
   * `FAILURE_RENDERER_WRITE`. Rendering and scheduling stay one callback with
   * two stages, narrowed from the inside via
   * `host.fail(FAILURE_SCHEDULED_FRAME, …)`.
   */
  moved(current: Readonly<Frame<Part>>, lift: VisualLiftSession): void;

  /** Produce the viewport point the lifted visual should end at (D-16). */
  anchorTarget(current: Readonly<Frame<Part>>, authoredReady: boolean): Point;

  /** Presentation is released and both gates are complete. Terminal callback. */
  finalized(current: Readonly<Frame<Part>>): void;

  /**
   * A failure with **no operation to settle**: `admit` threw, so identity was
   * never minted, there is no failure checkpoint to queue and no `REPORTING`
   * phase to enter (Q-1). The controller stays idle and usable; the behavior
   * surfaces this to the consumer as a controller-level report.
   *
   * This member is a deviation from the frozen `BehaviorSpec` listing, which
   * answers Q-1 with "the kernel reports through `onError`" while giving the
   * kernel no way to reach `onError` — the consumer callbacks belong to the
   * behavior's `callbacks()` slot. One hook is the smallest way to make the
   * answer implementable; see plan.md, phase 4.
   */
  reportFailure(stage: FailureStage, error: unknown): void;

  /** Drop per-operation references. Idempotent, best-effort. */
  retire(): void;
}>;

/**
 * Both halves of the two-phase handshake, returned at once so "no input can be
 * admitted before `install()` returns" becomes unexpressible rather than a rule
 * (D-1).
 */
export type BehaviorInstall<Controller, Part extends object> = Readonly<{
  spec: BehaviorSpec<Part>;
  controller: Controller;
}>;

/**
 * The install function itself — **internal and unstable**. It is a function
 * between `KernelHost` and `BehaviorSpec`, both of which are internal, so
 * exporting it under a stability promise would make the whole SPI a semver
 * surface by reference (D-30).
 */
export type BehaviorFactory<Controller, Part extends object> = (
  host: KernelHost,
) => BehaviorInstall<Controller, Part>;

declare const BEHAVIOR_BRAND: unique symbol;

/**
 * What a consumer holds and passes to `draggable()`: **opaque** (D-30). It can
 * be named and passed, and cannot be constructed — the brand is declaration-only
 * and unexported, so a structurally matching function literal is not assignable.
 *
 * `Controller` is carried so `draggable()` can infer its return type; the frame
 * part is erased, because no consumer names it.
 */
export type Behavior<Controller> = Readonly<{
  [BEHAVIOR_BRAND]: Controller;
}>;

/** Declaration-only cast. Behaviors are built inside this package only. */
export function brandBehavior<Controller, Part extends object>(
  factory: BehaviorFactory<Controller, Part>,
): Behavior<Controller> {
  return factory as unknown as Behavior<Controller>;
}

export function unbrandBehavior<Controller>(
  behavior: Behavior<Controller>,
): BehaviorFactory<Controller, object> {
  return behavior as unknown as BehaviorFactory<Controller, object>;
}
