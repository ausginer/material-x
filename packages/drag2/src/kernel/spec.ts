/**
 * The behavior–kernel SPI.
 *
 * Everything here is a *type* plus a handful of discriminant constants. The
 * kernel executor lives in `kernel.ts`; this module exists so the behavior side
 * can be authored against the contract without importing the executor, and so
 * the frozen surface is readable in one place.
 */
import type { DraggableError, DraggableWarning } from './errors.ts';
import type { CancelStage, FailureStage } from './failures.ts';
import type { Draft, Frame, FramePartOf } from './frames.ts';
import type { LifetimeScope } from './lifetimes.ts';
import type {
  BehaviorLiftSession,
  InheritedSpace,
  LiftMode,
} from './presentation.ts';
import type { DOMRealm } from './realm.ts';
// `ActionTransition` has exactly one declaration, in `seams.ts`, and is
// re-exported from here. A second structurally identical declaration at this
// tier would let a consumer's compiler resolve one while the driver consumes
// the other (F-61).
import type { ActionTransition, Transition } from './seams.ts';
import type { OffsetBox, Point } from './types.ts';

/**
 * The whole construction-time surface. No member lets the behavior drive a
 * transition.
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
   * Enqueue one behavior action. `tag` is behavior-local and must be an integer
   * in `0 .. config.actionTags - 1`. An out-of-range tag is reported and
   * dropped, never enqueued.
   */
  dispatch(tag: number, argument: unknown): void;

  /**
   * Queue a classified failure against the operation the kernel currently
   * holds. Never thrown at the producer.
   *
   * Valid **only inside a kernel-driven seam of the current operation**; a call
   * outside one is downgraded to a platform report, because a late continuation
   * from operation A could otherwise classify a failure against operation B.
   */
  fail(stage: FailureStage, error: unknown): void;

  /**
   * **Is this controller logically closed?** The only sanctioned liveness
   * reading.
   *
   * This is the latch itself, not a proxy for it. No physical-teardown
   * observation may answer a liveness question: physical teardown is deferred
   * to the transaction boundary, so `presentation.signal.aborted`, a disposed
   * session and a detached node all **lag** the logical close.
   *
   * Readonly by construction: a behavior may consult the latch, never set it.
   */
  readonly closed: boolean;

  /** Base controller methods, for the behavior to spread into its controller. */
  cancel(reason?: unknown): void;

  /**
   * Closes the controller **logically**, immediately, on this statement. The
   * returned promise settles **once**, after physical teardown — which is this
   * call when no library transaction is active, and the boundary of the
   * outermost one when there is.
   *
   * Idempotent: repeated destruction closes nothing further and every returned
   * promise still settles exactly once.
   */
  destroy(): Promise<void>;
}>;

// Discrete, pointerless admission is a second ingress, not a second protocol
// (D-32). A section header rather than a doc block: it documents the group
// below it and no single declaration, and as JSDoc it shipped orphaned into
// `kernel/spec.d.ts`.
//
// A command's feasibility must be answered synchronously, inside the native
// listener, so `preventDefault()` is called only when the command is possible;
// otherwise an arrow key on an edge item loses its native meaning. Nothing in
// the frozen SPI can answer it: `dispatch` returns `void`, so the decision
// would land on the drain, after the listener returned.
//
// It is internal: a behavior declares which events the kernel binds; a consumer
// does not.
/**
 * What an admission member returns when it admits.
 *
 * A bare `HTMLElement` is the common form and means `box === visual`. The pair
 * form names a separate geometry source: what leaves flow is the **visual**,
 * while what the layout loses is the **box**.
 *
 * Discriminated by `'visual' in subject`, never `instanceof HTMLElement`:
 * `instanceof` is realm-sensitive, and {@link DOMRealm} exists precisely
 * because an element may come from another document.
 *
 * `box` is **required** inside the pair, so that *the box is the visual* has
 * exactly one encoding.
 */
export type AdmissionSubject =
  | HTMLElement
  | Readonly<{ visual: HTMLElement; box: HTMLElement }>;

export type CommandAdmission<Part extends object> = Readonly<{
  /**
   * The event types the kernel binds on `root`, for the controller's life,
   * inside the same ingress abort that owns `pointerdown`. Static spec data,
   * validated once at arm; an entry colliding with the kernel's own pointer
   * ingress is refused. **An empty array is a supported spelling of binding no
   * discrete listener**, identical to omitting this member.
   */
  types: readonly string[];

  /**
   * Runs synchronously inside the native listener, after the kernel's own
   * guards, with the draft open — the only position from which feasibility can
   * still reach the producer.
   *
   * Returns the subject to lift, or `null` to decline. Declining is total: no
   * operation, no phase change, and the kernel does not prevent the default.
   */
  admit(event: Event, draft: Draft<Part>): AdmissionSubject | null;
}>;

/**
 * What the kernel grants `activation.prepare` and `activation.effect`. One
 * object per operation.
 *
 * `dispose` is projected away from both lifetimes, so a behavior has no
 * opportunity to sequence release incorrectly.
 */
export type ActivationScope = Readonly<{
  /** The element the kernel is lifting — the visual half of what `admit` returned. */
  visual: HTMLElement;
  /** Its viewport rect at grab. Basis for every landing measurement. */
  originRect: DOMRectReadOnly;
  /**
   * The geometry source — what `admit` returned as the box half of its subject,
   * or `visual` when it returned a bare element. Held by the kernel from
   * admission, never read out of the behavior's frame part.
   */
  box: HTMLElement;
  /**
   * **Window 1 of 2** — the box's offset box, read by the *kernel*, immediately
   * before `acquireLift`.
   *
   * The behavior reads window 2 itself, at the top of `activation.prepare`, and
   * the footprint is the difference. The two reads have to straddle
   * `acquireLift`, and only the kernel is on the near side of it.
   *
   * **`originRect` is derived from neither window** and stays the *visual's*
   * grab rect. It is the basis of the origin-relative landing space, which must
   * not become a function of the box the consumer chose for layout reasons.
   */
  boxPre: OffsetBox;
  /**
   * The inverse of the linear part the visual **inherits** — everything
   * strictly above it, its own transform and zoom excluded — or `null` for the
   * identity, which is the common case.
   *
   * Derived from the measurement `acquireLift` has already taken, before it
   * mutates anything: one activation snapshot, with no second traversal and no
   * DOM read. A behavior that needs a local delta multiplies rather than
   * measures — a second walk would run *after* positioning, dimensions,
   * top-layer state and transforms have changed.
   *
   * **Not the same value as the lift session's own projection**, and the two
   * must never be conflated: `compose`'s is the space an *in-place* translate
   * acts in and is `null` for both lifted modes. This one is a fact about the
   * **ancestry at grab** and is computed for every mode.
   *
   * **A delta, never a point.** The linear part alone maps a delta; a point
   * would additionally need the translation, which box-quad does not expose.
   *
   * `acquireLift` throws `FAILURE_ACTIVATION` for an unreadable space; singular
   * and non-finite spaces resolve to `null`, the identity.
   */
  inheritedSpace: InheritedSpace;
  /**
   * The lift capability. The behavior keeps it for `moved`.
   *
   * **A projection, not the session**: `rendered` and `dispose` are kernel-only.
   * The same physical object arrives under the narrower type.
   */
  lift: BehaviorLiftSession;
  /** Closed at release, cancel, destroy, panic. */
  motion: LifetimeScope;
  /** Closed at finalization, after both gates. */
  presentation: LifetimeScope;
}>;

/**
 * The release choice, **staged rather than called**.
 *
 * Exactly one choice, made exactly once, executed by the kernel after
 * `release.effect` returns and only if it returned normally.
 */
export type ResolutionCommand = Readonly<{
  /**
   * The consumer round-trip, or `null` to settle immediately with no round-trip.
   *
   * `null` asserts a **proven semantic no-op** and nothing else. A release that
   * finds no view, item, snapshot or insertion has a broken invariant and must
   * **throw** instead; reporting that as a successful no-op drop would tell the
   * consumer the drag completed normally. The seam is already running at its
   * own stage, so a throw is classified there — this seam fails the way every
   * other seam fails.
   */
  invoke: ((signal: AbortSignal) => unknown) | null;
}>;

export type { ActionTransition } from './seams.ts';

export type ReleaseTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>): ResolutionCommand;
  effect(current: Readonly<Frame<Part>>, prepared: ResolutionCommand): void;
}>;

// ---------------------------------------------------------------------------
// Settlement
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
 * `recovery` and `domain` are fields of the behavior's frame part, which the
 * kernel cannot name or write.
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
      /**
       * The public error the consumer receives, **built by the kernel**. The
       * `stage` beside it is what the behavior maps to a recovery; this is what
       * it forwards to `onError`, unchanged and unexamined.
       */
      report: DraggableError;
    }>;

/** The settlement seam's `Prepared` sentinel. Nothing travels through it. */
export type PreparedSettlement = true;

/**
 * **One coordinate space, and this is it.**
 *
 * The four coordinates are all *origin-relative viewport deltas*: CSS pixels to
 * translate the visual by, measured from where its border box sat when the drag
 * was admitted. That is exactly the space `compose()` and the kernel's own
 * `lift.write()` consume, so a runner never converts anything —
 * `compose(fromX, fromY)` reproduces the transform the drag last wrote, and
 * `compose(targetX, targetY)` is where the visual has to end up.
 *
 * It is deliberately **not** a viewport point: a runner's only writer is
 * `compose`, which cannot convert a point, because the context carries no origin
 * rect.
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
  fromX: number;
  fromY: number;
  /**
   * Where it should land, as a delta. **Authoritative, and measured once**: the
   * authored DOM is final before `anchorTarget` runs, so this is never
   * provisional and no second measurement supersedes it. The kernel's pin at
   * the join uses these same two numbers.
   */
  targetX: number;
  targetY: number;
  realm: DOMRealm;
}>;

export type LandingHandle = Readonly<{
  /**
   * Stop, and relinquish control of the visual's transform so the kernel's
   * final pin is not overridden. Never writes a final position, never
   * dispatches.
   */
  destroy(): void;
}>;

export type LandingStart = (
  context: LandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => LandingHandle;

/**
 * The gate method **records a request and arms nothing**. Arming happens once,
 * after the scope seals, when the complete gate plan is known.
 *
 * Reserving the hold before calling `start` is what stops a runner that calls
 * `done()` from inside `start` — `landing({ duration: 0 })`, for instance —
 * finding no hold.
 */
export type SettlementScope = Readonly<{
  /**
   * Hold the landing gate. The kernel builds the context and owns the attempt.
   * At most once.
   */
  holdForLanding(start: LandingStart): void;
}>;

export type SettlementTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>, input: SettlementInput): PreparedSettlement;
  effect(
    current: Readonly<Frame<Part>>,
    prepared: PreparedSettlement,
    scope: SettlementScope,
  ): void;
}>;

// ---------------------------------------------------------------------------
// BehaviorSpec
// ---------------------------------------------------------------------------

export type BehaviorConfig = Readonly<{
  /** Activation travel in viewport pixels. The kernel owns the distance test. */
  threshold: number;
  /** Which lift strategy the kernel acquires at activation. */
  liftMode: LiftMode;
  /**
   * How many behavior action tags exist. Static spec data: it is what `arm()`
   * validates and what bounds a `dispatch` tag.
   */
  actionTags: number;
}>;

/**
 * The behavior's whole SPI.
 *
 * `Activation` is the behavior's choice of what `activation.prepare` stages, and
 * defaults to `true` — a behavior that stages nothing writes nothing. The kernel
 * treats the staged value as opaque and drops it.
 */
export type BehaviorSpec<
  Part extends object,
  Activation extends {} = true,
> = Readonly<{
  /** `FramePartOf` rejects a part that declares a kernel frame key. */
  createFramePart(): FramePartOf<Part>;
  resetFramePart(frame: Part): void;

  config: BehaviorConfig;

  /**
   * Runs synchronously inside `pointerdown`, after the kernel's own guards,
   * with the draft open.
   *
   * `composedPath()` is valid only here. **`preventDefault()` is not the
   * behavior's** — the ingress owner performs it, at the activation threshold
   * crossing rather than at admission, and the behavior answers feasibility
   * with its return value and nothing else.
   *
   * Admission also answers *what did the event land on*: a press whose composed
   * path reaches a `[data-drag-ignore]` region declines, unless a `handle`
   * scoped dragging there.
   *
   * Returns the element the kernel should lift — optionally paired with the
   * element the kernel should measure — or `null` to leave the controller idle.
   */
  admit(event: PointerEvent, draft: Draft<Part>): AdmissionSubject | null;

  /**
   * The optional second ingress. A behavior that omits it binds no discrete
   * listener at all, and `arm()` binds `pointerdown` and nothing else.
   */
  command?: CommandAdmission<Part>;

  /* ---- transactional seams ---- */
  activation: Transition<Part, Activation, ActivationScope>;
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
  moved(current: Readonly<Frame<Part>>, lift: BehaviorLiftSession): void;

  // The borrow below, and the per-controller cache it licenses: D-144, F-123.
  /**
   * Produce the viewport point the lifted visual should end at.
   *
   * **The result is borrowed, and the kernel never retains it.** Both
   * fields are read immediately on return — converted once into the
   * origin-relative delta the settlement carries as scalars — and the object
   * itself is dropped before any further code runs. Nothing stores it, and
   * nothing hands it to consumer code.
   *
   * So an implementation may return **one mutable buffer per controller**,
   * rewritten on every call, and both first-party behaviors do. What it may
   * *not* do is write the buffer before its last call into foreign code: an
   * implementation that measures, writes, and then calls a consumer's handler
   * has published a value the handler can reach.
   */
  anchorTarget(current: Readonly<Frame<Part>>): Point;

  /** Presentation is released and both gates are complete. Terminal callback. */
  finalized(current: Readonly<Frame<Part>>): void;

  /**
   * **Forward this to the consumer's `onError`, and do nothing else.** The
   * kernel hands over a finished error; the behavior chooses nothing and
   * re-derives nothing from it.
   *
   * **Which class arrives says whether the operation was affected.** A
   * `DraggableError` means the outcome changed: `admit` threw and the drag will
   * not start, or the controller panicked. A `DraggableWarning` means it did
   * not — a landing measurement that could not be trusted, a disposer that
   * refused, a gate hold that was already taken. A warning is therefore **not
   * proof that the operation is over**, and the terminal for that operation
   * still publishes afterwards.
   *
   * **The guard belongs here.** This is the one place in the library that
   * invokes a consumer's `onError`, so it is the one place a throw from it must
   * stop: an implementation catches and discards, and never reports the throw
   * back through itself. That single discard is what keeps the channel
   * non-recursive.
   */
  reportError(error: DraggableError | DraggableWarning): void;

  /** Drop per-operation references. Idempotent, best-effort. */
  retire(): void;
}>;

/**
 * Both halves of the two-phase handshake, returned at once so that no input can
 * be admitted before `install()` returns.
 */
export type BehaviorInstall<
  Controller,
  Part extends object,
  Activation extends {} = true,
> = Readonly<{
  spec: BehaviorSpec<Part, Activation>;
  controller: Controller;
}>;

/**
 * The install function itself — what a behavior author writes.
 *
 * `Part` is inferred from the factory's return position rather than supplied.
 * It defaults to `object` so a behavior that never names its own part still
 * satisfies the constraint. `Activation` is inferred the same way and defaults
 * the same way `BehaviorSpec` does.
 */
export type BehaviorFactory<
  Controller,
  Part extends object = object,
  Activation extends {} = true,
> = (host: KernelHost) => BehaviorInstall<Controller, Part, Activation>;
