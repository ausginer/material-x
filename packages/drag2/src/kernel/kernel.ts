/**
 * The kernel executor: admission → activation → move → release → teardown
 * (contract 01 and 02).
 *
 * Every field below is closure-private. There is no `KernelRuntime` type, no
 * exported container, and nothing a behavior can read that the kernel did not
 * deliberately pass as an argument (contract 01 §The privacy boundary). What
 * the kernel holds of the behavior is **one `spec` reference**; what the
 * behavior holds of the kernel is one `host` with six members, none of which
 * drives a transition.
 */
import {
  BEHAVIOR_BASE,
  CANCEL,
  ERROR_REPORTED,
  FAILED,
  LANDING_SETTLED,
  MOVE,
  READINESS_SETTLED,
  RESOLUTION_SETTLED,
  RETIRE,
  START_COMMITTED,
  UP,
} from './actions.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INSERTION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_TARGET,
  FAILURE_PLACEHOLDER_MOVE,
  FAILURE_PRESENTATION_READY,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_REORDER_RESOLUTION,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './failures.ts';
import {
  assertFrameScrubbed,
  assertFrameShapesMatch,
  beginFrame,
  captureFrameKeys,
  composeFrame,
  type Frame,
  type OperationIdentity,
  scrubFrame,
} from './frames.ts';
import {
  createOperationLifetimes,
  type OperationLifetimes,
} from './lifetimes.ts';
import {
  ACTIVATING,
  ACTIVE,
  FINALIZING,
  IDLE,
  PENDING,
  RELEASING,
  REPORTING,
  SETTLING,
} from './phases.ts';
import {
  acquirePointerCapture,
  armOperationInput,
  isPrimaryPress,
} from './pointer.ts';
import { acquireLift, type VisualLiftSession } from './presentation.ts';
import {
  LOST_POINTER_CAPTURE,
  POINTER_CANCEL,
  POINTER_DOWN,
  POINTER_MOVE,
  POINTER_UP,
} from './protocol.ts';
import { clearQueue, createActionQueue, drain, enqueue } from './queue.ts';
import { createRealm } from './realm.ts';
import { guarded, report } from './reporter.ts';
import {
  createSeamDriver,
  runActivationSeam,
  runReleaseSeam,
  SEAM_COMMITTED,
  type SeamContext,
  type SeamOutcome,
  type Transition,
} from './seams.ts';
import {
  type ActivationScope,
  type BehaviorSpec,
  type KernelHost,
  type LandingContext,
  type LandingHandle,
  type LandingStart,
  type PreparedSettlement,
  type ResolutionCommand,
  type SeamRejection,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementInput,
  type SettlementScope,
} from './spec.ts';

/** Why an operation was cancelled, when the kernel is the one deciding. */
export const CANCEL_ESCAPE = 'drag:escape';
export const CANCEL_POINTER_CANCELED = 'drag:pointercancel';
export const CANCEL_CAPTURE_LOST = 'drag:lostpointercapture';

/**
 * What the kernel reads off a queued pointer event.
 *
 * The native event is queued **by reference** under this narrow contract and is
 * not retained past the drain, so one pointer sample allocates no wrapper
 * (contract 06 §The hot path).
 */
export type PointerCoordinates = Readonly<{
  pointerId: number;
  clientX: number;
  clientY: number;
}>;

/**
 * The consumer round-trip, as a kernel-private record.
 *
 * `completed` and `settlement` are deliberately separate: `settlement` is the
 * discriminated payload and is cleared once consumed, so a fulfilled
 * `undefined` and a rejected `undefined` stay distinguishable, while `completed`
 * records only that the resolver produced a result at all. The guarded abort
 * keys off `completed`, because keying it off the payload would abort a
 * finished resolver's own signal (contract 02 §Attempts).
 */
type ResolutionAttempt = {
  completed: boolean;
  settlement: SettlementInput | null;
};

/**
 * Gate state for one settlement (D-7).
 *
 * It lives here rather than on the transactional frame because nothing outside
 * {@link createKernel}'s settlement helpers reads it, it is unobservable, and it
 * is per-settlement rather than per-operation. **A gate release is therefore not
 * a frame transition** — the only transition in settlement is `FINALIZING`.
 */
type SettlementAttempt = {
  holds: number;
  /** Requested during `effect`, armed after sealing, cleared on release. */
  readiness: PromiseLike<void> | null;
  readinessHeld: boolean;
  /** Requested during `effect`, invoked after sealing. */
  start: LandingStart | null;
  /** Retained past its gate release, so the join can `destroy()` it. */
  landing: LandingHandle | null;
  landingHeld: boolean;
  /** Whether the authored presentation is final. Not "readiness was supplied". */
  authoredReady: boolean;
  /** False once a `destroy()` throw leaves runner control unrelinquished (I-24). */
  relinquished: boolean;
  /** Once-only completion latch: the first `done()`/`fail()` wins. */
  completed: boolean;
  /** Set when landing creation or the runner reported a consequential failure. */
  failed: boolean;
  sealed: boolean;
};

/** The gate plan is live. */
const ARM_ARMED = 0;
/** The operation went away; nothing armed, nothing failed. */
const ARM_STALE = 1;
/**
 * Classified; **the settlement is replaced**. Returning from the arm helper is
 * not sufficient on its own — the outcome has to be visible to the caller, so
 * that no terminal callback of the original accepted/rejected/no-op result can
 * run before the queued checkpoint takes over (D-28, F-35).
 */
const ARM_FAILED = 2;

type ArmOutcome = typeof ARM_ARMED | typeof ARM_STALE | typeof ARM_FAILED;

/** The queued classified failure. One object per failure — not a hot path. */
type FailureCheckpoint = Readonly<{
  stage: FailureStage;
  error: unknown;
  operation: OperationIdentity;
}>;

/**
 * The kernel handle. Only `draggable()` holds one, and it calls `arm()` exactly
 * once — a behavior cannot arm itself, re-arm, or observe the kernel object.
 */
export type Kernel<Part extends object> = Readonly<{
  host: KernelHost;
  arm(spec: BehaviorSpec<Part>): void;
}>;

/** No phase stamp is pending. Phases are non-negative. */
const NO_STAMP = -1;

export function createKernel<Part extends object>(
  root: HTMLElement,
): Kernel<Part> {
  const realm = createRealm(root);
  const queue = createActionQueue();
  const ingress = new AbortController();

  let spec: BehaviorSpec<Part> | null = null;
  let current!: Frame<Part>;
  let draft!: Frame<Part>;
  let armedKeys: readonly string[] = [];
  let nextOperationId = 0;

  /* ---- per-operation state, all cleared by retirement ---- */
  let lifetimes: OperationLifetimes | null = null;
  let lift: VisualLiftSession | null = null;
  let originRect: DOMRectReadOnly | null = null;
  let visual: HTMLElement | null = null;
  let cancelRequest: { reason: unknown } | null = null;

  /* ---- the two kernel attempts, at most one of each per operation ---- */
  let resolution: ResolutionAttempt | null = null;
  let settlement: SettlementAttempt | null = null;
  /** The input the open settlement seam is driving. Seams are non-reentrant. */
  let settlementInput: SettlementInput | null = null;

  /**
   * The operation the open transaction belongs to, captured at `begin()`.
   * `preparationValid()` compares against it rather than against a mutable
   * "current operation" field, so a reentrant retirement between `begin` and
   * `commit` is visible as an identity change.
   */
  let pinned: OperationIdentity | null = null;
  let destroyRequested = false;

  /**
   * True while a checkpoint's report transition is running — including its
   * `prepare`, which is *before* `REPORTING` is committed and therefore before
   * the phase alone can say so.
   */
  let reporting = false;

  /**
   * The phase the kernel stamps onto the draft between `prepare` and `commit`.
   *
   * Two seams change phase as part of their transaction — activation to
   * `ACTIVATING`, settlement to `SETTLING` — and the write is the *kernel's*,
   * made after `preparationValid()` and before the swap (contract 06). The
   * behavior cannot make it: it sees `Draft<Part>`, where the kernel slice is
   * `readonly`. A private slot consumed by `commit()` keeps that ordering
   * without widening the seam driver's signature with a kernel concern.
   *
   * The slot is **armed before the seam and owned by the transaction**, which
   * is what stops a stamp outliving the transition that armed it. A discarded
   * or failed seam never reaches `commit()`, so its stamp is still set when it
   * returns; without the handover below, the next transaction to commit —
   * an admission, a pointer sample — would silently take that phase. Hence
   * both halves: {@link begin} takes the armed value and clears it, so every
   * transaction starts with exactly the stamp armed for it and no other, and
   * {@link commit} consumes it.
   */
  let armedStamp = NO_STAMP;
  let stamp = NO_STAMP;

  /** The behavior action being run. Safe as a slot: seams are non-reentrant. */
  let actionTag = 0;
  let actionArgument: unknown = null;

  let handle!: (action: number, argument: unknown) => void;

  const begin = (): void => {
    // Reset before every transaction, armed or not.
    stamp = armedStamp;
    armedStamp = NO_STAMP;
    pinned = current.operation;
    beginFrame(draft, current);
  };

  const commit = (): void => {
    if (stamp !== NO_STAMP) {
      draft.phase = stamp;
      stamp = NO_STAMP; // consume-and-clear
    }

    const previous = current;

    current = draft;
    draft = previous;
  };

  /**
   * Runs a seam whose commit changes phase.
   *
   * The arming is cleared in a `finally` as well, for the one window `begin()`
   * cannot cover: a seam that throws *before* opening its transaction — today
   * only the driver's re-entry refusal — would otherwise leave the stamp armed
   * for whatever begins next.
   */
  const runStamped = (phase: number, run: () => void): void => {
    armedStamp = phase;

    try {
      run();
    } finally {
      armedStamp = NO_STAMP;
    }
  };

  /**
   * False once a reentrant `cancel()` or `destroy()` invalidated the open
   * preparation. The cancel latch counts: a cancellation raised from inside a
   * `prepare` has already decided the operation, so publishing the preparation
   * would commit state the very next action abandons.
   */
  const preparationValid = (): boolean =>
    !queue.closed &&
    !destroyRequested &&
    cancelRequest === null &&
    current.operation === pinned;

  // -------------------------------------------------------------------------
  // Teardown
  // -------------------------------------------------------------------------

  /**
   * Step 3 of teardown: the kernel's own attempt records.
   *
   * Also the **settlement replacement** step — a failure checkpoint replaces
   * whatever settlement was open, and the runner that settlement started is the
   * kernel's to stop. Dropping the reference without `destroy()` would leave a
   * WAAPI animation writing the transform through `REPORTING` and beyond.
   *
   * A late `done()` or a late resolution is inert after this: both validate
   * against the slot they were minted for, which is now empty.
   */
  const retireAttempts = (): void => {
    resolution = null;
    settlementInput = null;

    const attempt = settlement;

    if (attempt === null) {
      return;
    }

    settlement = null;
    attempt.completed = true;

    const handle = attempt.landing;

    attempt.landing = null;
    attempt.start = null;

    if (handle !== null) {
      guarded(() => {
        handle.destroy();
      });
    }
  };

  const clearOperationState = (): void => {
    lifetimes = null;
    lift = null;
    originRect = null;
    visual = null;
    cancelRequest = null;
    pinned = null;
  };

  const scrub = (frame: Frame<Part>): void => {
    const active = spec;

    if (active === null) {
      return;
    }

    // Individually wrapped: `resetFramePart` is behavior code the API permits
    // to throw, and an unwrapped throw on the first frame would skip the second
    // scrub *and* the ingress abort, making `destroy()` non-terminal (I-6).
    guarded(() => {
      scrubFrame(frame, active.resetFramePart);
    });
    assertFrameScrubbed(frame, armedKeys);
  };

  /**
   * The seven-step teardown, minus steps 1, 2 and 7 — which is exactly
   * operation retirement (contract 01 §Teardown across two owners).
   *
   * `operation` narrows the retirement to one operation; `null` means "whatever
   * the kernel currently holds", used by paths that retire before the operation
   * was ever committed.
   */
  const retireOperation = (operation: OperationIdentity | null): void => {
    if (spec === null) {
      return;
    }

    if (operation !== null && current.operation !== operation) {
      return; // a stale retirement for an operation that is already gone
    }

    // 3. kernel attempts.
    retireAttempts();

    // 4. behavior references.
    guarded(spec.retire);

    // 5. presentation → motion → cancellation, LIFO, best-effort. Releases
    //    pointer capture, removes the placeholder and restores inline styles.
    if (lifetimes !== null) {
      guarded(lifetimes.dispose);
    }

    // 6. both frames, each reset individually wrapped.
    scrub(current);
    scrub(draft);

    clearOperationState();
  };

  const destroy = (): void => {
    if (queue.closed) {
      return; // terminal, and terminal exactly once
    }

    // 1. every guard now fails.
    queue.closed = true;
    destroyRequested = true;

    try {
      // 2. drop every retained argument, so a queued element cannot outlive the
      //    drain that abandoned it.
      clearQueue(queue);

      // 3–6.
      if (spec !== null) {
        retireAttempts();
        guarded(spec.retire);

        if (lifetimes !== null) {
          guarded(lifetimes.dispose);
        }

        scrub(current);
        scrub(draft);
      }

      clearOperationState();
    } finally {
      // 7. unconditional: no earlier step can prevent ingress from being
      //    released.
      ingress.abort();
    }
  };

  /**
   * A throw escaping a handler is an invariant violation: tear down exactly
   * once, **then** report the initiating error (contract 01 §Teardown).
   */
  const panic = (error: unknown): void => {
    destroy();
    report(error);
  };

  const dispatchKernel = (action: number, argument: unknown): void => {
    if (queue.closed) {
      return;
    }

    enqueue(queue, action, argument);
    // Re-entrant calls return immediately: the outermost frame owns the drain
    // and reaches the newly appended work in the same pass.
    drain(queue, handle, panic);
  };

  /**
   * Latched cancellation. The first valid cancel per operation wins, and an
   * idle cancel is a no-op that leaves no latch (I-21). The latch is what makes
   * a cancellation raised from inside a seam invalidate that preparation
   * synchronously, which matters most when the caller is `onStart`.
   */
  const cancel = (reason?: unknown): void => {
    if (queue.closed || current.operation === null || cancelRequest !== null) {
      return;
    }

    cancelRequest = { reason };
    dispatchKernel(CANCEL, current.operation);
  };

  /**
   * Queues a classified failure against the operation the kernel currently
   * holds. A failure with no live operation — and a failure of the report
   * itself — has no checkpoint to run and degrades to a platform report.
   */
  const failOperation = (stage: FailureStage, error: unknown): void => {
    const { operation } = current;

    // A checkpoint queued while a report is in flight could only be dropped by
    // `handleFailed`'s own `REPORTING` guard, which would swallow the error
    // outright. `onError` runs exactly once per failure and never replaces the
    // initiating error, so the second one takes the non-consequential channel
    // instead of a second turn at deciding the operation. It is not a panic: a
    // behavior that fails to map or surface a failure is not an invariant
    // break, and the operation still retires.
    //
    // `reporting` spans the whole report transition. The phase test is
    // unreachable today — `REPORTING` is entered and left inside one drain, so
    // nothing asynchronous can observe it — and is kept only so that making
    // `ERROR_REPORTED` asynchronous later cannot silently reopen the swallow.
    if (
      queue.closed ||
      operation === null ||
      reporting ||
      current.phase === REPORTING
    ) {
      report(error);
      return;
    }

    // Dispatched, not merely enqueued. A failure raised inside a seam appends
    // to the drain that is already running, but one raised from an *async*
    // continuation — a readiness rejection, a landing runner's `fail()` — is
    // the outermost frame, and nothing else would ever drain it.
    dispatchKernel(FAILED, {
      stage,
      error,
      operation,
    } satisfies FailureCheckpoint);
  };

  const context: SeamContext<Part> = {
    begin,
    commit,
    preparationValid,
    readCurrent: () => current,
    readDraft: () => draft,
    fail: failOperation,
  };

  const driver = createSeamDriver<Part>(context);

  // -------------------------------------------------------------------------
  // Admission — native dispatch, not queued
  // -------------------------------------------------------------------------

  const onPointer = (event: PointerEvent): void => {
    // The producer-side half of the double validation; the handler checks the
    // pointer identity again against the committed frame.
    if (event.pointerId !== current.pointerId) {
      return;
    }

    switch (event.type) {
      case POINTER_MOVE:
        dispatchKernel(MOVE, event);
        break;
      case POINTER_UP:
        dispatchKernel(UP, event);
        break;
      case POINTER_CANCEL:
        cancel(CANCEL_POINTER_CANCELED);
        break;
      case LOST_POINTER_CAPTURE:
        cancel(CANCEL_CAPTURE_LOST);
        break;
      default:
        break;
    }
  };

  const onEscape = (): void => {
    cancel(CANCEL_ESCAPE);
  };

  const admitPress = (event: PointerEvent): void => {
    const active = spec!;
    let admitted: HTMLElement | null;

    try {
      admitted = active.admit(event, draft);
    } catch (error) {
      // Q-1: identity was never minted, so there is no operation for a
      // checkpoint to settle and no `REPORTING` phase to enter. The controller
      // stays idle and usable, and the behavior surfaces the diagnostic.
      guarded(() => {
        active.reportFailure(FAILURE_ADMISSION, error);
      });
      return;
    }

    if (admitted === null) {
      return;
    }

    // Post-callback revalidation (D-26, F-30). `admit` runs consumer-supplied
    // handle and visual resolvers during native dispatch, and a resolver can
    // close over the already-returned controller and synchronously destroy it.
    // Without this recheck a terminal controller publishes a new operation.
    if (queue.closed || current.operation !== null) {
      return;
    }

    const operation: OperationIdentity = { id: (nextOperationId += 1) };

    try {
      visual = admitted;
      lifetimes = createOperationLifetimes();
      armOperationInput(
        realm,
        lifetimes.motion.signal,
        lifetimes.cancellation.signal,
        onPointer,
        onEscape,
      );
    } catch (error) {
      // Nothing is committed yet, so this retires an operation the frames never
      // saw: it disposes whatever was armed and drops the references.
      retireOperation(null);
      report(error);
      return;
    }

    draft.phase = PENDING;
    draft.operation = operation;
    draft.pointerId = event.pointerId;
    draft.originX = event.clientX;
    draft.originY = event.clientY;
    draft.pointerX = event.clientX;
    draft.pointerY = event.clientY;
    commit();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (queue.closed || current.operation !== null || !isPrimaryPress(event)) {
      return;
    }

    begin();
    admitPress(event);
  };

  // -------------------------------------------------------------------------
  // Activation
  // -------------------------------------------------------------------------

  const activationPolicy = {
    // A discard retires: there is no such thing as a committed operation with
    // no presentation. A *failure* does not — the queued checkpoint owns it,
    // and retiring here would make that entry stale (F-27).
    retire(): void {
      retireOperation(null);
    },
    committed(): void {
      // `activation.effect` invokes the consumer's `onStart` last, and that
      // callback may cancel or destroy (F-32).
      if (preparationValid()) {
        dispatchKernel(START_COMMITTED, current.operation);
      }
    },
  };

  /**
   * Acquires everything the activation seam needs before it opens: the origin
   * rect, the lift, and pointer capture on `root`.
   *
   * Capture is validated rather than assumed — `admit` may return any element
   * and a consumer resolver can detach things — and a capture failure is
   * `FAILURE_ACTIVATION` rather than a silently degraded drag (D-17).
   */
  const acquireActivation = (): ActivationScope | null => {
    const target = visual!;
    const owned = lifetimes!;

    try {
      const rect = target.getBoundingClientRect();
      const session = acquireLift(target, spec!.config.liftMode, rect, realm);

      originRect = rect;
      lift = session;
      owned.presentation.use(session.dispose);

      if (!root.isConnected) {
        throw new Error(
          'drag: the ingress root left the document before activation; pointer capture cannot be acquired',
        );
      }

      owned.motion.use(acquirePointerCapture(root, current.pointerId));

      return {
        visual: target,
        // Read back from the field the join will read it from in phase 5, so
        // the scope and the pin can never disagree about the grab basis.
        originRect,
        lift: session,
        motion: owned.motion,
        presentation: owned.presentation,
      };
    } catch (error) {
      failOperation(FAILURE_ACTIVATION, error);
      return null;
    }
  };

  const activate = (): void => {
    const scope = acquireActivation();

    if (scope === null) {
      return;
    }

    runStamped(ACTIVATING, () => {
      runActivationSeam(
        driver,
        spec!.activation,
        scope,
        FAILURE_ACTIVATION,
        activationPolicy,
      );
    });
  };

  // -------------------------------------------------------------------------
  // Seam adapters, built once per controller
  // -------------------------------------------------------------------------

  const isRejection = (result: object): result is SeamRejection =>
    'stage' in result;

  /**
   * Release cannot discard: `prepare` returns a command or a rejection, and
   * motion is already closed, so "changed my mind" has no meaning. The
   * rejection is classified by the kernel, which is what turns it into a
   * prepare failure — and therefore into "the command is not executed".
   */
  const releaseTransition: Transition<Part, ResolutionCommand> = {
    prepare(target) {
      const result = spec!.release.prepare(target);

      if (isRejection(result)) {
        driver.requestFailure(result.stage, result.error);
        return null;
      }

      return result;
    },
    effect(committed, prepared) {
      spec!.release.effect(committed, prepared);
    },
  };

  const actionTransition: Transition<Part, {}> = {
    prepare: (target) =>
      spec!.action.prepare(actionTag, actionArgument, target),
    effect(committed, prepared) {
      spec!.action.effect(actionTag, actionArgument, committed, prepared);
    },
    rollback(prepared) {
      spec!.action.rollback?.(actionTag, prepared);
    },
  };

  /**
   * The settlement seam.
   *
   * The input travels in a slot rather than as the capability, because the two
   * phases take different arguments: `prepare` maps the input, `effect` receives
   * the gate scope. A `SeamRejection` from `prepare` is classified at the stage
   * the behavior named — a fulfilled value that is not an explicit resolution
   * is `FAILURE_REORDER_RESOLUTION`, and acceptance is never inferred.
   */
  const settlementTransition: Transition<
    Part,
    PreparedSettlement,
    SettlementScope
  > = {
    prepare(target) {
      const result = spec!.settlement.prepare(target, settlementInput!);

      if (isRejection(result)) {
        driver.requestFailure(result.stage, result.error);
        return null;
      }

      return result;
    },
    effect(committed, prepared, scope) {
      // Between the commit and the behavior's effect: the operation is decided,
      // so nothing may still cancel it. Motion is closed here too rather than
      // only at release, because a cancel at `ACTIVE` reaches settlement with
      // input still open. Both closes are latched, so a release that already
      // closed motion pays nothing.
      const owned = lifetimes!;

      owned.motion.dispose();
      owned.cancellation.dispose();
      spec!.settlement.effect(committed, prepared, scope);
    },
  };

  const createSettlementAttempt = (): SettlementAttempt => ({
    holds: 0,
    readiness: null,
    readinessHeld: false,
    start: null,
    landing: null,
    landingHeld: false,
    authoredReady: false,
    relinquished: true,
    completed: false,
    failed: false,
    sealed: false,
  });

  /**
   * The gate methods **record a request; they arm nothing**. Arming happens
   * once, after the scope seals, when the complete gate plan is known.
   *
   * A duplicate or post-seal request is ignored and reported through the
   * platform reporter — the same non-consequential channel as a failing
   * disposer, not `onError`, which is reserved for classified failures. It never
   * overwrites a watch, never double-increments and never panics, because a
   * bookkeeping error must not destroy a live drop.
   */
  const createSettlementScope = (
    attempt: SettlementAttempt,
  ): SettlementScope => ({
    holdForReadiness(ready): void {
      if (attempt.sealed || attempt.readinessHeld) {
        report(
          new Error(
            'drag: holdForReadiness() was called twice or after the settlement scope sealed; ignored',
          ),
        );
        return;
      }

      attempt.holds += 1;
      attempt.readiness = ready;
      attempt.readinessHeld = true;
    },
    holdForLanding(start): void {
      if (attempt.sealed || attempt.landingHeld) {
        report(
          new Error(
            'drag: holdForLanding() was called twice or after the settlement scope sealed; ignored',
          ),
        );
        return;
      }

      attempt.holds += 1;
      attempt.start = start;
      attempt.landingHeld = true;
    },
  });

  /**
   * Whether the attempt still owns a live operation in `SETTLING`. Checked on
   * both sides of `start`, because either `anchorTarget` or the runner itself
   * may have destroyed the controller (F-38, F-30).
   */
  const settlementLive = (attempt: SettlementAttempt): boolean =>
    settlement === attempt &&
    !queue.closed &&
    cancelRequest === null &&
    current.operation !== null &&
    current.phase === SETTLING;

  const rollbackLandingHold = (attempt: SettlementAttempt): void => {
    if (attempt.landingHeld) {
      attempt.landingHeld = false;
      attempt.holds -= 1;
    }

    attempt.start = null;
  };

  /**
   * The once-only landing completion latch (D-28). `done()` then `fail()`,
   * `fail()` then `done()`, and a duplicate `done()` all resolve to the first
   * call.
   */
  const completeLanding = (
    attempt: SettlementAttempt,
    failure: boolean,
    error: unknown,
  ): void => {
    if (attempt.completed) {
      return;
    }

    attempt.completed = true;

    if (failure) {
      // Recorded before the staleness check, so a `fail()` called from inside
      // `start` is visible to the post-`start` revalidation — which is what
      // destroys the returned handle instead of publishing it.
      attempt.failed = true;
    }

    if (settlement !== attempt || queue.closed) {
      return; // inert for a retired attempt, at both validation points (I-4)
    }

    if (failure) {
      // Inside `start` this has to *latch*, so the arm phase returns
      // `ARM_FAILED` rather than publishing a runner for a settlement that is
      // already replaced. Asynchronously there is no open phase to latch onto,
      // and this callback is exactly the operation-scoped exception F-23 makes
      // to "`fail` only inside a seam": it is minted per attempt and inert once
      // the attempt is retired.
      if (driver.isInSeam()) {
        driver.requestFailure(FAILURE_LANDING_INTERRUPTED, error);
      } else {
        failOperation(FAILURE_LANDING_INTERRUPTED, error);
      }

      return;
    }

    dispatchKernel(LANDING_SETTLED, attempt);
  };

  /**
   * Watches the authored-presentation gate, bounded by `config.readinessTimeout`.
   *
   * A rejection or a timeout **replaces the settlement**: the hold is never
   * released, so the original outcome cannot finalize; presentation stays owned
   * until the checkpoint's retirement; `authoredReady` stays false, so no
   * re-anchor happens; and it reports through `onError` only.
   */
  const watchReadiness = (
    attempt: SettlementAttempt,
    ready: PromiseLike<void>,
  ): void => {
    const { window } = realm;
    let timer = 0;
    let done = false;

    const finish = (failure: boolean, error: unknown): void => {
      if (done) {
        return;
      }

      done = true;
      window.clearTimeout(timer);

      if (settlement !== attempt || !attempt.readinessHeld || queue.closed) {
        return; // a stale readiness, from an operation that is already gone
      }

      if (failure) {
        attempt.failed = true;
        failOperation(FAILURE_PRESENTATION_READY, error);
        return;
      }

      dispatchKernel(READINESS_SETTLED, attempt);
    };

    timer = window.setTimeout(() => {
      finish(
        true,
        new Error(
          `drag: the authored-presentation gate did not settle within ${spec!.config.readinessTimeout}ms`,
        ),
      );
    }, spec!.config.readinessTimeout);

    // Presentation outlives both gates, so this is the lifetime that covers the
    // whole window the timer can fire in.
    lifetimes!.presentation.use(() => {
      window.clearTimeout(timer);
    });

    ready.then(
      () => {
        finish(false, null);
      },
      (error: unknown) => {
        finish(true, error);
      },
    );
  };

  /**
   * Arms the complete gate plan, once, after the scope sealed.
   *
   * The landing hold is **reserved before `start` is called** and the handle is
   * **published only after it returns**. A runner that calls `done()` from
   * inside `start` — `landing({ duration: 0 })`, or any synchronous runner —
   * therefore always finds its hold, and its queued completion can never be
   * applied before the handle exists (F-21). Reserve-before-call and
   * revalidate-after-return are two different fixes: the first makes a
   * synchronous `done()` safe, the second makes a synchronous `destroy()` safe.
   */
  const armSettlement = (attempt: SettlementAttempt): ArmOutcome => {
    if (attempt.readiness !== null) {
      watchReadiness(attempt, attempt.readiness);
    }

    const { start } = attempt;

    if (start === null) {
      return ARM_ARMED;
    }

    const anchor = driver.runLeafValue(
      () => spec!.anchorTarget(current, attempt.authoredReady),
      FAILURE_LANDING_CREATE,
    );

    if (anchor === undefined) {
      rollbackLandingHold(attempt);
      return ARM_FAILED;
    }

    // `anchorTarget` is behavior code and may have destroyed the controller.
    // Calling the consumer's runner after that violates I-6 (F-38).
    if (!settlementLive(attempt)) {
      rollbackLandingHold(attempt);
      return ARM_STALE;
    }

    const origin = originRect!;
    const session = lift!;
    const context: LandingContext = {
      visual: visual!,
      compose: session.compose,
      // Both points are **origin-relative deltas**, the space `compose` and
      // `lift.write` consume. `anchorTarget` produces a viewport point and the
      // kernel converts, because the runner has no other way to reach the grab
      // basis — see README, deliberate differences.
      from: {
        x: current.pointerX - current.originX,
        y: current.pointerY - current.originY,
      },
      target: { x: anchor.x - origin.x, y: anchor.y - origin.y },
      realm,
    };

    let handle: LandingHandle | undefined;

    // `runLeaf`, not `runLeafValue`: a runner that calls `fail()` synchronously
    // latches a failure *and still returns a handle*, and that handle has to be
    // destroyed rather than leaked.
    const started = driver.runLeaf(() => {
      handle = start(
        context,
        () => {
          completeLanding(attempt, false, null);
        },
        (error: unknown) => {
          completeLanding(attempt, true, error);
        },
      );
    }, FAILURE_LANDING_CREATE);

    // `attempt.failed` is the contract's stated mechanism for a synchronous
    // `fail()`; `started` catches the same case *today*, because that `fail()`
    // necessarily latches on the open phase. They are two readings of one fact
    // and neither is load-bearing alone — a runner that reports failure through
    // any future channel that does not latch would leave only the flag.
    if (!started || attempt.failed) {
      if (handle !== undefined) {
        const runner = handle;

        guarded(() => {
          runner.destroy();
        });
      }

      rollbackLandingHold(attempt);
      return ARM_FAILED;
    }

    // `start` may have destroyed the controller and STILL returned this live
    // handle. Teardown ran first, saw no published handle and retired the
    // attempt, so publishing now would leave a runner nothing owns (F-30).
    if (!settlementLive(attempt)) {
      const runner = handle!;

      guarded(() => {
        runner.destroy();
      });
      rollbackLandingHold(attempt);
      return ARM_STALE;
    }

    attempt.landing = handle!;
    return ARM_ARMED;
  };

  /**
   * Both gates are complete: measure authoritatively, relinquish the runner,
   * pin, release presentation, then call the terminal callback.
   *
   * **Ordering is normative.** `destroy()` precedes the pin so a running WAAPI
   * animation cannot override the inline transform, and `anchorTarget` runs
   * while presentation is still owned. Every step before the release is
   * individually fallible and the release is in a `finally`: the join calls into
   * three pieces of code the kernel does not own, and none of them may strand
   * the placeholder or the inline styles (F-22).
   */
  const joinSettlement = (attempt: SettlementAttempt): void => {
    const owned = lifetimes!;
    const session = lift!;
    const origin = originRect!;

    begin();
    draft.phase = FINALIZING;
    commit();

    let failed = false;

    try {
      const anchor = driver.runLeafValue(
        () => spec!.anchorTarget(current, attempt.authoredReady),
        FAILURE_LANDING_TARGET,
      );

      if (anchor === undefined) {
        failed = true;
      }

      const handle = attempt.landing;

      if (handle !== null) {
        attempt.landing = null;

        try {
          handle.destroy();
        } catch (error) {
          // Best-effort: a custom runner must not be able to strand
          // presentation. But it may keep writing the transform after the pin,
          // so I-24 is no longer claimed for this operation.
          attempt.relinquished = false;
          report(error);
        }
      }

      if (
        anchor !== undefined &&
        !driver.runLeaf(() => {
          session.write(anchor.x - origin.x, anchor.y - origin.y);
        }, FAILURE_RENDERER_WRITE)
      ) {
        failed = true;
      }
    } finally {
      // Unconditional. Every fallible step above is individually wrapped, so
      // the only thing that reaches this `finally` today is a re-entry panic —
      // but the rule is F-22's, not an artifact of which steps happen to catch:
      // no failure between `FINALIZING` and here may leave the placeholder
      // inserted or the inline styles overwritten.
      owned.presentation.dispose();
    }

    if (failed) {
      // The terminal callback is skipped after a consequential failure: the
      // committed frame still carries the accepted outcome, so calling it would
      // fire `onFinish` for a drop the queued checkpoint is about to report
      // through `onError`. The checkpoint drives `REPORTING`, then retirement.
      return;
    }

    driver.runLeaf(() => {
      spec!.finalized(current);
    }, FAILURE_TERMINAL_CALLBACK);
    // Queued unconditionally: a terminal-callback failure still retires. The
    // checkpoint it queued is ahead of this entry, so if it retires the
    // operation first, this one is stale and ignored.
    dispatchKernel(RETIRE, current.operation);
  };

  const advanceSettlement = (attempt: SettlementAttempt): void => {
    // `failed` is redundant with the hold accounting as things stand — every
    // consequential failure returns *without* releasing its hold, so the count
    // can no longer reach zero. It is kept because the contract states the
    // stopper as the flag, and because "a failed settlement never finalizes"
    // should not depend on a bookkeeping accident somewhere else.
    if (settlement !== attempt || attempt.failed || attempt.holds > 0) {
      return;
    }

    joinSettlement(attempt);
  };

  /**
   * Drives one settlement: prepare → stamp `SETTLING` → commit → request →
   * seal → arm.
   */
  const openSettlement = (input: SettlementInput): void => {
    // However the round-trip ended, it is over; a later completion for it is
    // inert at both validation points.
    resolution = null;
    settlementInput = input;

    const attempt = createSettlementAttempt();
    let outcome: SeamOutcome | undefined;

    settlement = attempt;

    runStamped(SETTLING, () => {
      outcome = driver.runCore(
        settlementTransition,
        createSettlementScope(attempt),
        FAILURE_REORDER_RESOLUTION,
      );
    });

    settlementInput = null;
    attempt.sealed = true;

    if (outcome !== SEAM_COMMITTED) {
      // Drop every unarmed request and arm **nothing**. Arming a half-requested
      // plan would start a watch or a runner for a settlement that has already
      // failed or been abandoned; the queued checkpoint decides instead (F-27).
      attempt.readiness = null;
      attempt.readinessHeld = false;
      rollbackLandingHold(attempt);
      attempt.holds = 0;
      return;
    }

    // No promise ⇒ the consumer asserted its presentation is final *now*, which
    // is what an optional promise means. It is not "the authored DOM never
    // changed, so never re-anchor" (contract §`authoredReady`).
    attempt.authoredReady = attempt.readiness === null;

    if (armSettlement(attempt) === ARM_FAILED) {
      return; // replaced: no advance, and no terminal callback of this outcome
    }

    advanceSettlement(attempt);
  };

  const isThenable = (value: unknown): value is PromiseLike<unknown> =>
    typeof (value as PromiseLike<unknown> | null | undefined)?.then ===
    'function';

  /**
   * The producer-side half of the double validation (I-4). The queued action
   * revalidates when it is applied, because the attempt slot and the committed
   * phase change at different moments.
   */
  const settleResolution = (
    attempt: ResolutionAttempt,
    input: SettlementInput,
  ): void => {
    if (attempt.completed || resolution !== attempt || queue.closed) {
      return;
    }

    attempt.completed = true;
    attempt.settlement = input;
    dispatchKernel(RESOLUTION_SETTLED, attempt);
  };

  /**
   * The consumer round-trip, executed by the kernel after `release.effect`
   * returned normally.
   *
   * A thenable is asynchronous and anything else is immediately settled. The
   * kernel never names a resolution type, an accept or a reject: it hands the
   * value to `settlement.prepare` with a status and lets the behavior classify.
   */
  const openResolution = (command: ResolutionCommand): void => {
    const attempt: ResolutionAttempt = { completed: false, settlement: null };
    const { invoke } = command;

    resolution = attempt;

    if (invoke === null) {
      // A proven semantic no-op — no round-trip, no abort guard, no thenable.
      settleResolution(attempt, { type: SETTLED_SKIPPED });
      return;
    }

    const aborter = new AbortController();

    // Keyed off `completed`, not off the payload: keying it off the payload
    // would abort a finished resolver's own signal.
    lifetimes!.cancellation.useWhile(
      () => !attempt.completed,
      () => {
        aborter.abort();
      },
    );

    let value: unknown;

    try {
      value = invoke(aborter.signal);
    } catch (error) {
      settleResolution(attempt, { type: SETTLED_REJECTED, error });
      return;
    }

    if (isThenable(value)) {
      value.then(
        (settled) => {
          settleResolution(attempt, {
            type: SETTLED_FULFILLED,
            value: settled,
          });
        },
        (error: unknown) => {
          settleResolution(attempt, { type: SETTLED_REJECTED, error });
        },
      );
      return;
    }

    settleResolution(attempt, { type: SETTLED_FULFILLED, value });
  };

  // -------------------------------------------------------------------------
  // Handlers. Every one is total: an action it does not recognise in the
  // current phase is ignored, never thrown on (contract 02 §Phases and
  // legality).
  // -------------------------------------------------------------------------

  const handleMove = (sample: PointerCoordinates): void => {
    const { phase } = current;

    if (phase !== PENDING && phase !== ACTIVE) {
      return;
    }

    if (sample.pointerId !== current.pointerId) {
      return;
    }

    begin();
    draft.pointerX = sample.clientX;
    draft.pointerY = sample.clientY;
    commit();

    if (phase === ACTIVE) {
      driver.runLeaf(() => {
        spec!.moved(current, lift!);
      }, FAILURE_RENDERER_WRITE);
      return;
    }

    const { threshold } = spec!.config;
    const dx = current.pointerX - current.originX;
    const dy = current.pointerY - current.originY;

    if (dx * dx + dy * dy >= threshold * threshold) {
      activate();
    }
  };

  const handleUp = (sample: PointerCoordinates): void => {
    const { phase } = current;

    if (sample.pointerId !== current.pointerId) {
      return;
    }

    if (phase === PENDING) {
      retireOperation(current.operation);
      return;
    }

    if (phase !== ACTIVE) {
      return;
    }

    // Commit 1: the committed frame matches what is about to be true, so a
    // `release.prepare` that throws or reentrantly destroys never leaves a
    // committed `ACTIVE` operation with no ingress and no path forward (D-6).
    begin();
    draft.phase = RELEASING;
    draft.pointerX = sample.clientX;
    draft.pointerY = sample.clientY;
    commit();

    // Motion closes *between* the two commits: capture released, listeners and
    // invalidation removed, the behavior's frame task cancelled. Nothing
    // pending can alter the proposal from here (I-11).
    lifetimes!.motion.dispose();

    runReleaseSeam(driver, releaseTransition, FAILURE_RELEASE, openResolution);
  };

  /**
   * A cancellation at `ACTIVE` or `RELEASING` enters the settlement seam, which
   * is the only hook that can produce the canceled domain result `onCancel`
   * requires: `outcome`, `recovery` and `domain` are fields of the behavior's
   * frame part, which the kernel cannot name or write (F-33).
   */
  const settleCancellation = (reason: unknown, stage: CancelStage): void => {
    openSettlement({ type: SETTLED_CANCELED, reason, stage });
  };

  const handleResolutionSettled = (attempt: ResolutionAttempt): void => {
    // The applied half of the double validation (I-4). The slot check alone
    // covers every path that exists today, because everything that decides the
    // operation also clears the slot; the phase check is the second layer the
    // contract requires, guarding the window where the two disagree.
    if (resolution !== attempt || current.phase !== RELEASING) {
      return; // a late completion for an operation that is already decided
    }

    const input = attempt.settlement;

    if (input === null) {
      return;
    }

    // Consumed once and the payload cleared, so it can never be applied twice.
    attempt.settlement = null;
    openSettlement(input);
  };

  const handleReadinessSettled = (attempt: SettlementAttempt): void => {
    if (
      settlement !== attempt ||
      current.phase !== SETTLING ||
      !attempt.readinessHeld
    ) {
      return;
    }

    attempt.readinessHeld = false;
    attempt.readiness = null;
    attempt.holds -= 1;
    // Records that the **consumer's** DOM is committed, which is independent of
    // whether the library's own measurement below works. The join needs it.
    attempt.authoredReady = true;

    const handle = attempt.landing;

    if (attempt.landingHeld && handle !== null) {
      // The guard is on the **hold**, not the handle: the handle is retained
      // past its gate release so the join can `destroy()` it, and a runner that
      // has already reported `done()` must never be retargeted — a completed
      // trajectory cannot be improved (F-16).
      //
      // Both calls are best-effort reports, not classified failures: nothing on
      // the trajectory-quality path may change the outcome, move a hold or
      // destroy the runner (I-29). A throwing `anchorTarget` skips the retarget
      // and the runner continues toward its provisional target; the join
      // measures again authoritatively either way.
      guarded(() => {
        const anchor = spec!.anchorTarget(current, true);
        const origin = originRect!;

        handle.retarget?.({
          x: anchor.x - origin.x,
          y: anchor.y - origin.y,
        });
      });
    }

    advanceSettlement(attempt);
  };

  const handleLandingSettled = (attempt: SettlementAttempt): void => {
    if (
      settlement !== attempt ||
      current.phase !== SETTLING ||
      !attempt.landingHeld
    ) {
      return;
    }

    // The handle itself is retained: the join destroys it before the pin.
    attempt.landingHeld = false;
    attempt.holds -= 1;
    advanceSettlement(attempt);
  };

  const handleCancel = (operation: OperationIdentity): void => {
    if (current.operation !== operation) {
      return;
    }

    const request = cancelRequest;

    // Consumed before anything else runs: the latch invalidates every
    // preparation while it is held, including the settlement transition this
    // cancellation is about to open.
    cancelRequest = null;

    if (request === null) {
      return;
    }

    switch (current.phase) {
      case PENDING:
      case ACTIVATING:
        // Abandoned before there was anything to tell the consumer about.
        retireOperation(operation);
        break;
      case ACTIVE:
      case RELEASING:
        settleCancellation(
          request.reason,
          current.phase === ACTIVE ? AT_PROPOSAL : AT_CONSUMER,
        );
        break;
      default:
        break;
    }
  };

  const handleStartCommitted = (operation: OperationIdentity): void => {
    if (current.phase !== ACTIVATING || current.operation !== operation) {
      return;
    }

    begin();
    draft.phase = ACTIVE;
    commit();
  };

  const handleFailed = (checkpoint: FailureCheckpoint): void => {
    const { phase } = current;

    if (
      current.operation !== checkpoint.operation ||
      phase === IDLE ||
      phase === REPORTING
    ) {
      return; // stale, or a second checkpoint for a report already in flight
    }

    // The settlement is **replaced**: whatever the previous attempt armed is
    // over, and the runner it started is the kernel's to stop.
    retireAttempts();

    settlementInput = {
      type: SETTLED_FAILED,
      stage: checkpoint.stage,
      error: checkpoint.error,
    };

    const attempt = createSettlementAttempt();

    // Sealed from the start: a failed settlement holds no gate and lands
    // nothing. A request is ignored and reported, exactly like a post-seal one.
    attempt.sealed = true;
    settlement = attempt;

    // The same seam as an ordinary settlement, because the behavior owns the
    // terminal classification either way — but stamped `REPORTING`, not
    // `SETTLING`: `onError` runs in its own phase, exactly once per failure.
    // The input carries the stage, which is what lets the behavior distinguish
    // the recoveries the stage table separates (`TERMINAL_CALLBACK` is "none",
    // the rest immediate).
    //
    // A throw or a rejection inside this seam cannot become another checkpoint:
    // `failOperation` sees the latch and reports instead. The seam still
    // *classifies* — the latched failure is what stops the continuation below —
    // but the error takes the non-consequential channel, because a queued
    // checkpoint would be dropped by the guard above and lost.
    reporting = true;

    try {
      runStamped(REPORTING, () => {
        driver.runCore(
          settlementTransition,
          createSettlementScope(attempt),
          checkpoint.stage,
        );
      });
    } finally {
      reporting = false;
      settlementInput = null;
    }

    if (current.phase === REPORTING) {
      dispatchKernel(ERROR_REPORTED, checkpoint.operation);
      return;
    }

    // The report transition never published — a rejection from `prepare`, or a
    // reentrant destroy. Nothing will drive `ERROR_REPORTED`, and the operation
    // may not stay live.
    retireOperation(checkpoint.operation);
  };

  const handleErrorReported = (operation: OperationIdentity): void => {
    if (current.phase !== REPORTING || current.operation !== operation) {
      return;
    }

    retireOperation(operation);
  };

  const handleBehaviorAction = (tag: number, argument: unknown): void => {
    actionTag = tag;
    actionArgument = argument;

    try {
      // Two stages, because the seam's phases fail differently: resolving an
      // insertion and moving the placeholder are not the same failure. An
      // explicit `host.fail` narrows further from the inside.
      driver.runCore(
        actionTransition,
        undefined,
        FAILURE_INSERTION,
        FAILURE_PLACEHOLDER_MOVE,
      );
    } finally {
      // Drop the retained argument: it may be a DOM element or a consumer
      // value, and nothing may keep it alive past its action.
      actionArgument = null;
    }
  };

  handle = (action, argument): void => {
    if (action >= BEHAVIOR_BASE) {
      handleBehaviorAction(action - BEHAVIOR_BASE, argument);
      return;
    }

    switch (action) {
      case MOVE:
        handleMove(argument as PointerCoordinates);
        break;
      case UP:
        handleUp(argument as PointerCoordinates);
        break;
      case CANCEL:
        handleCancel(argument as OperationIdentity);
        break;
      case START_COMMITTED:
        handleStartCommitted(argument as OperationIdentity);
        break;
      case RESOLUTION_SETTLED:
        handleResolutionSettled(argument as ResolutionAttempt);
        break;
      case READINESS_SETTLED:
        handleReadinessSettled(argument as SettlementAttempt);
        break;
      case LANDING_SETTLED:
        handleLandingSettled(argument as SettlementAttempt);
        break;
      case FAILED:
        handleFailed(argument as FailureCheckpoint);
        break;
      case ERROR_REPORTED:
        handleErrorReported(argument as OperationIdentity);
        break;
      case RETIRE:
        retireOperation(argument as OperationIdentity);
        break;
      default:
        // Total: an unrecognised tag is ignored, never thrown on.
        break;
    }
  };

  // -------------------------------------------------------------------------
  // The host, and arming
  // -------------------------------------------------------------------------

  const host: KernelHost = {
    realm,
    root,
    dispatch(tag, argument) {
      if (queue.closed) {
        return;
      }

      if (
        spec === null ||
        !Number.isInteger(tag) ||
        tag < 0 ||
        tag >= spec.config.actionTags
      ) {
        // Reported and dropped, never enqueued: the kernel computes
        // `BEHAVIOR_BASE + tag`, so a negative or fractional tag would alias a
        // kernel action.
        report(
          new Error(
            `drag: dispatch(${String(tag)}) is outside the declared action tag range`,
          ),
        );
        return;
      }

      dispatchKernel(BEHAVIOR_BASE + tag, argument);
    },
    fail: driver.requestFailure,
    cancel,
    destroy,
  };

  return {
    host,

    /**
     * Composes both frames and attaches ingress. **Unwinds on any failure**:
     * `spec.retire()` best-effort, scrub whichever frame exists, abort ingress,
     * rethrow. A controller is never returned half-armed (contract 01 §When
     * construction itself fails).
     */
    arm(next): void {
      spec = next;

      try {
        if (
          !Number.isInteger(next.config.actionTags) ||
          next.config.actionTags < 0
        ) {
          throw new TypeError(
            'drag: config.actionTags must be a non-negative integer',
          );
        }

        // The same code path twice, so both frames get one hidden class, and
        // *both* factory results are validated — the factory is not proven
        // deterministic, so checking only the first would let the second
        // introduce a colliding key (I-5, F-2).
        current = composeFrame(next.createFramePart);
        draft = composeFrame(next.createFramePart);
        assertFrameShapesMatch(current, draft);
        armedKeys = captureFrameKeys(current);

        root.addEventListener(POINTER_DOWN, onPointerDown, {
          signal: ingress.signal,
        });
      } catch (error) {
        guarded(next.retire);

        // Totality applies to the unwind too: a reset that throws here must not
        // replace the original arm failure or skip the ingress cleanup.
        // `armedKeys` is non-empty exactly when both frames exist — the kernel
        // slice alone contributes seven keys.
        if (armedKeys.length > 0) {
          scrub(current);
          scrub(draft);
        }

        ingress.abort();
        spec = null;
        throw error;
      }
    },
  };
}
