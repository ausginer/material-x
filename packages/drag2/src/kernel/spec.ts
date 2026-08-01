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

  /** Base controller methods, for the behavior to spread into its controller. */
  cancel(reason?: unknown): void;
  destroy(): void;
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
  /** The element the kernel is lifting — what `admit` returned. */
  visual: HTMLElement;
  /** Its viewport rect at grab. Basis for every landing measurement. */
  originRect: DOMRectReadOnly;
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

/** The readiness promise travels through `Prepared`, not a private write. */
export type PreparedSettlement = Readonly<{ ready: PromiseLike<void> | null }>;

export type LandingContext = Readonly<{
  visual: HTMLElement;
  /** Full transform string for a viewport delta, including the lift's base. */
  compose(x: number, y: number): string;
  from: Point;
  /** Provisional. May be superseded; correctness does not depend on it. */
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
  /** Optional trajectory-quality capability. Absent runners are fully correct. */
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
   * Hold the authored-presentation gate until `ready` settles, bounded by
   * `config.readinessTimeout`. At most once.
   */
  holdForReadiness(ready: PromiseLike<void>): void;
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
   * `composedPath()` and `preventDefault()` are valid only here.
   */
  admit(event: PointerEvent, draft: Draft<Part>): HTMLElement | null;

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

export type Behavior<Controller, Part extends object> = (
  host: KernelHost,
) => BehaviorInstall<Controller, Part>;
