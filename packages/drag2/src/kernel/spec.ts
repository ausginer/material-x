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
/**
 * **One declaration each, re-exported** (F-61). `ActionTransition` and
 * `SeamRejection` were declared here *and* in `seams.ts`, structurally
 * identical and independently maintained. Harmless while both were internal;
 * publishing one of each at the kernel tier (D-68) makes it exactly the hazard
 * 03 §The export topology's identity clauses exist to prevent — a consumer's
 * compiler resolves the published declaration while the driver consumes the
 * other, and the two drift apart with nothing to notice.
 *
 * They live in `seams.ts` beside `Transition`, which is the sibling envelope
 * and already the direction this module's imports run.
 */
import type { ActionTransition, SeamRejection, Transition } from './seams.ts';
import type { OffsetBox, Point } from './types.ts';

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
  /**
   * **Window 1 of 2** — the box's offset box, read by the *kernel*, immediately
   * before `acquireLift` (D-43, D-52).
   *
   * The behavior reads window 2 itself, at the top of `activation.prepare`, and
   * the footprint is the difference. The split of owners is not arbitrary: the
   * two reads have to straddle `acquireLift`, and only the kernel is on the
   * near side of it. Handing this down rather than letting the behavior take
   * its own pre-read keeps the behavior out of a window it cannot reach.
   *
   * **`originRect` is derived from neither window** and stays the *visual's*
   * grab rect. It is the basis of the origin-relative landing space, so
   * deriving it from a box the consumer chose for layout reasons would make the
   * landing coordinate space a function of that choice.
   */
  boxPre: OffsetBox;
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

export type { ActionTransition, SeamRejection } from './seams.ts';

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
 * The settlement seam's `Prepared` sentinel.
 *
 * It carried one field, `presentation` — a *declaration* that an authored
 * presentation was coming, whose acknowledgement arrived later through
 * `KernelHost.presentationCommitted()`. **D-41 deletes the declaration with the
 * protocol**: the gate it planned had no producer, because under the serial
 * authored commit a consumer that must render first `await`s its own commit
 * inside `onReorder`. Nothing travels through `Prepared` now, so it is the bare
 * `true` sentinel every other seam with nothing to stage already uses.
 */
export type PreparedSettlement = true;

/**
 * **One coordinate space, and this is it.**
 *
 * `from` and `target` are both
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
   * Where it should land, as a delta. **Authoritative, and measured once**
   * (D-41): the serial authored commit guarantees the authored DOM is final
   * before `anchorTarget` runs at arm, so there is no interval in which this is
   * provisional and no second measurement to supersede it. The kernel's pin at
   * the join uses this same value.
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
   * ~~Optional trajectory-quality capability.~~ **Deleted with the readiness
   * protocol (D-41).** Its only producer was the readiness-time re-anchor, and
   * with one authoritative measurement there is nothing left to retarget
   * *from*: a completed trajectory cannot be improved, and an in-flight one is
   * already heading at the final answer.
   */
}>;

export type LandingStart = (
  context: LandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => LandingHandle;

/**
 * The gate method **records a request and arms nothing**. Arming happens once,
 * after the scope seals, when the complete gate plan is known (contract
 * §Request, seal, then arm).
 *
 * **One gate since D-41.** The three-step request-seal-arm survives the
 * narrowing, and not by inertia: it exists for `landing({ duration: 0 })` and
 * any custom runner that calls `done()` from inside `start`. Reserving the hold
 * before calling `start` is what stops that completion finding no hold — which
 * has nothing to do with readiness, and holds for one gate exactly as it held
 * for two.
 */
export type SettlementScope = Readonly<{
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

export type BehaviorConfig = Readonly<{
  /** Activation travel in viewport pixels. The kernel owns the distance test. */
  threshold: number;
  /** Which lift strategy the kernel acquires at activation. */
  liftMode: LiftMode;
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
   * behavior's** — the ingress owner performs it, and the behavior answers
   * feasibility with its return value and nothing else (C-03). Since D-54 the
   * pointer path's call is made at the **activation threshold crossing**, not
   * here: admission runs on `pointerdown`, which is before the threshold, so
   * preventing here spends a press on a drag that may never happen — six of
   * probe E's ten cases consumed a native interaction with no drag ever
   * activating.
   *
   * **What a `null` may mean is therefore wider than feasibility** (D-46).
   * Admission also answers *what did the event land on*: a press whose composed
   * path reaches an interactive or editable descendant declines, unless a
   * `handle` scoped dragging there (D-50). See contract 02 §Input policy.
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
  anchorTarget(current: Readonly<Frame<Part>>): Point;

  /** Presentation is released and both gates are complete. Terminal callback. */
  finalized(current: Readonly<Frame<Part>>): void;

  /**
   * A failure the kernel must surface **without queueing a checkpoint**.
   *
   * This member is a deviation from the frozen `BehaviorSpec` listing, which
   * answers Q-1 with "the kernel reports through `onError`" while giving the
   * kernel no way to reach `onError` — the consumer callbacks belong to the
   * behavior's callbacks slot. One hook is the smallest way to make the
   * answer implementable; see plan.md, phase 4.
   *
   * **There are two legitimate callers, and Revision 2 added the second.** The
   * hook was documented as "a failure with *no operation to settle*", which was
   * a true description of its only caller and was mistaken for its contract.
   * The invariant that actually holds is the one both callers need: *reach
   * `onError` without replacing a settlement.*
   *
   * 1. **Admission (Q-1, the original).** `admit` threw, so identity was never
   *    minted, there is no checkpoint to queue and no `REPORTING` phase to
   *    enter. The controller stays idle and usable. Stage:
   *    `FAILURE_ADMISSION`.
   * 2. **The landing measurement (D-49, added at Revision 2).** An operation
   *    exists and its reorder has already been committed, so failing it would
   *    settle a drop that really happened. The landing is **skipped rather
   *    than faked**, the domain result stands, and the fault is reported here.
   *    Stage: `FAILURE_LANDING_TARGET`, the first stage that is classified,
   *    non-consequential and has no recovery.
   *
   * The two have opposite reasons — no operation at all versus an operation
   * that must not be disturbed — and the same requirement, which is why one
   * hook serves both. The kernel reaches caller 2 through
   * `SeamContext.reportQuality`, never through `fail` or `report`.
   *
   * **Consequence for a behavior implementing this member:** a report from
   * caller 2 is *not* proof that the operation is over, and the terminal for
   * that operation still publishes afterwards (D-60, D-66). The hook is handed
   * no frame, so a behavior that wants to attach its domain result to the
   * report cannot; the sortable's `onError` context therefore carries
   * `domain: null` for both callers, and the non-null case comes from the
   * settlement failure path instead.
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
 * The install function itself — **public at the kernel tier since D-48**.
 *
 * ~~Internal and unstable, because it is a function between `KernelHost` and
 * `BehaviorSpec`, both of which are internal.~~ D-47 publishes the kernel, so
 * both of those are kernel-tier public now and this is what an author writes.
 *
 * **There is no brand.** `Behavior<Controller>`, `brandBehavior` and
 * `unbrandBehavior` are withdrawn (D-55): with `sortable()` returning its
 * controller directly and `draggable()` taking a plain factory, the opaque type
 * had no producer left, and an exported opaque type nothing constructs is a
 * boundary marker with no boundary to mark.
 *
 * `Part` is inferred from the factory's return position rather than supplied.
 * It defaults to `object` so a behavior that never names its own part — the
 * kernel's own view of one — still satisfies the constraint.
 */
export type BehaviorFactory<Controller, Part extends object = object> = (
  host: KernelHost,
) => BehaviorInstall<Controller, Part>;
