/**
 * The kernel executor: admission → activation → move → release → teardown.
 *
 * Every field below is closure-private. There is no `KernelRuntime` type, no
 * exported container, and nothing a behavior can read that the kernel did not
 * deliberately pass as an argument. What the kernel holds of the behavior is
 * **one `spec` reference**; what the behavior holds of the kernel is one `host`
 * with six members, none of which drives a transition.
 */
import {
  ACTIVATE,
  BEHAVIOR_BASE,
  CANCEL,
  ERROR_REPORTED,
  FAILED,
  LANDING_SETTLED,
  MOVE,
  RELEASE,
  RESOLUTION_SETTLED,
  RETIRE,
  START_COMMITTED,
  UP,
} from './actions.ts';
import { DraggableError, DraggableWarning } from './errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_ACTION_PREPARE,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_ACTION_EFFECT,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './failures.ts';
import { frame, type Frame, type OperationIdentity } from './frames.ts';
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
  type Phase,
} from './phases.ts';
import {
  acquirePointerCapture,
  armCancelInput,
  armPointerInput,
  isPrimaryPress,
} from './pointer.ts';
import { acquireLift, type VisualLiftSession } from './presentation.ts';
import {
  CLICK,
  LOST_POINTER_CAPTURE,
  POINTER_CANCEL,
  POINTER_DOWN,
  POINTER_MOVE,
  POINTER_UP,
} from './protocol.ts';
import { clearQueue, createActionQueue, drain, enqueue } from './queue.ts';
import { createRealm } from './realm.ts';
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
  type AdmissionSubject,
  type BehaviorSpec,
  type KernelHost,
  type LandingContext,
  type LandingHandle,
  type LandingStart,
  type PreparedSettlement,
  type ResolutionCommand,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementInput,
  type SettlementScope,
} from './spec.ts';
import type { OffsetBox } from './types.ts';
import { createUnwind } from './unwind.ts';

/** Why an operation was cancelled, when the kernel is the one deciding. */
export const CANCEL_ESCAPE = 'drag:escape';
export const CANCEL_POINTER_CANCELED = 'drag:pointercancel';
export const CANCEL_CAPTURE_LOST = 'drag:lostpointercapture';

/**
 * What the kernel reads off a queued pointer event — and the one thing it calls
 * on it.
 *
 * The native event is queued **by reference** under this narrow contract and is
 * not retained past the drain, so one pointer sample allocates no wrapper.
 *
 * `preventDefault` sits beside the three scalars because the pointer path
 * prevents at the activation threshold crossing, and the crossing is decided
 * here, from the sample. The drain is synchronous inside the native listener,
 * so the call is still in time; a sample that never crosses never uses it.
 */
export type PointerCoordinates = Readonly<{
  pointerId: number;
  clientX: number;
  clientY: number;
  preventDefault(): void;
}>;

/**
 * The consumer round-trip, as a kernel-private record.
 *
 * `completed` and `settlement` are deliberately separate: `settlement` is the
 * discriminated payload and is cleared once consumed, so a fulfilled
 * `undefined` and a rejected `undefined` stay distinguishable, while
 * `completed` records only that the resolver produced a result at all. The
 * guarded abort keys off `completed`, because keying it off the payload would
 * abort a finished resolver's own signal.
 */
type ResolutionAttempt = {
  completed: boolean;
  settlement: SettlementInput | null;
};

/**
 * Gate state for one settlement.
 *
 * It lives here rather than on the transactional frame because nothing outside
 * {@link createKernel}'s settlement helpers reads it, it is unobservable, and
 * it is per-settlement rather than per-operation. **A gate release is therefore
 * not a frame transition** — the only transition in settlement is `FINALIZING`.
 */
type SettlementAttempt = {
  holds: number;
  /** Requested during `effect`, invoked after sealing. */
  start: LandingStart | null;
  /** Retained past its gate release, so the join can `destroy()` it. */
  landing: LandingHandle | null;
  landingHeld: boolean;
  /**
   * **The one authoritative landing target, measured once at arm.** The serial
   * authored commit guarantees the authored DOM is final before this is taken,
   * so there is no interval in which a target is provisional. The runner
   * receives these two numbers as `LandingContext.targetX`/`.targetY` and the
   * join pins to the same pair.
   *
   * **`null` on the X carries the absence.** A skipped measurement is what
   * tells the join to release without pinning, and the two coordinates are
   * written and read as one act — so the sentinel sits on the first of them
   * rather than in a third slot. It is `=== null` and never truthiness: `0` is
   * an ordinary abscissa.
   */
  targetX: number | null;
  targetY: number;
  /** False once a `destroy()` throw leaves runner control unrelinquished. */
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
 * run before the queued checkpoint takes over.
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
export type Kernel<
  Part extends object,
  Activation extends {} = true,
> = Readonly<{
  host: KernelHost;
  arm(spec: BehaviorSpec<Part, Activation>): void;
}>;

/** No phase stamp is pending. Phases are non-negative. */
const NO_STAMP = -1;

/**
 * The armed-stamp slot's type. The sentinel is outside the union deliberately —
 * it is the *absence* of a phase, not a ninth one — and the `!== NO_STAMP` test
 * already at the one write site is what narrows it away.
 */
type ArmedStamp = Phase | typeof NO_STAMP;

export function createKernel<Part extends object, Activation extends {} = true>(
  root: HTMLElement,
): Kernel<Part, Activation> {
  const realm = createRealm(root);
  const queue = createActionQueue();
  const ingress = new AbortController();

  let spec: BehaviorSpec<Part, Activation> | null = null;
  let current!: Frame<Part>;
  let draft!: Frame<Part>;
  let nextOperationId = 0;

  /* ---- per-operation state, all cleared by retirement ---- */
  let lifetimes: OperationLifetimes | null = null;
  let lift: VisualLiftSession | null = null;
  let originRect: DOMRectReadOnly | null = null;
  let visual: HTMLElement | null = null;
  /**
   * The geometry source. Written once at admission, read before `acquireLift`,
   * never transactional — the same argument that keeps gate state on the
   * settlement attempt rather than on the frame, so the kernel's published
   * slice stays seven fields.
   */
  let box: HTMLElement | null = null;
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

  /* ---- the one channel ---- */

  /**
   * **Every fault the library surfaces leaves through here.** One function,
   * three jobs, and nothing else:
   *
   * 1. **Refuse after logical closure.** Consumer code inside `onError` may
   * call `destroy()`, and a resolver that destroys and *then* throws would
   * otherwise have its own destruction reported back to it through a declared
   * slot — a callback after `destroy()` returned, which the floor forbids
   * outright. **The refusal lives here alone**: open-coded pre-guards at the
   * admission catch, the quality report and the landing join would be three
   * copies of it to keep in step.
   * 2. **Hand the finished error to the behavior**, which forwards it to
   * `onError` and does nothing else. Before `arm()` there is no behavior and
   * nothing is delivered — which is correct rather than a gap, since a consumer
   * with no controller has no handler either.
   * 3. **Discard whatever that throws.** *This is the terminus.* A throw from
   * the channel is never re-notified, and that single discard is the whole of
   * what makes the channel non-recursive. It is also what lets the fourteen
   * `unwind` sites stay total without knowing anything about reporting: their
   * catch calls this, and this cannot throw.
   *
   * `afterClose` is `panic`'s named exception and has exactly one caller. It is
   * a parameter rather than a second function so that the refusal and the
   * exception to it are read together.
   *
   * **The stage is deliberately absent.** Three sites reach this holding a real
   * `FailureStage` and discard it — the demoted checkpoint, `failOperation`'s
   * five-guard demotion, and a `host.fail` outside a seam. In each the stage
   * describes a classification the kernel has just decided **not** to apply, so
   * carrying it into a warning would publish a claim about the operation that
   * the code refused to make.
   */
  const notify = (
    error: DraggableError | DraggableWarning,
    afterClose = false,
  ): void => {
    if (queue.closed && !afterClose) {
      return;
    }

    try {
      spec?.reportError(error);
    } catch {
      // The terminus. Reporting a reporting failure is the one recursion this
      // model has to be incapable of, and being incapable is stronger than
      // being careful.
    }
  };

  /**
   * The unwind guard, over this controller's channel.
   *
   * One closure per kernel rather than a free function: the fourteen call sites
   * read `unwind(fn)` either way, and threading the channel's identity through
   * each of them would put reporting at every site that merely wants the next
   * statement to run.
   */
  const unwind = createUnwind(notify);

  /* ---- the transaction bracket ---- */

  /**
   * How many library transactions are open on the stack.
   *
   * A *library transaction* is one synchronous entry into kernel code from
   * outside it: a native ingress pass, a drain, an async continuation that
   * dispatches. Nesting is real — a consumer callback inside a drain can
   * dispatch again, and an admission resolver can open a second ingress — so
   * the boundary that owns deferred teardown is the **outermost** one, which is
   * what a depth counter names and a boolean cannot.
   */
  let transactionDepth = 0;
  /** A logical close is done and its physical teardown is owed to the boundary. */
  let teardownPending = false;
  /**
   * The promise `destroy()` hands back, allocated on the first call and
   * returned by every later one, so repeated destruction is idempotent and
   * every returned promise still settles exactly once.
   */
  let destroyed: Promise<void> | null = null;
  let settleDestroyed: (() => void) | null = null;

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
   * made after `preparationValid()` and before the swap. The behavior cannot
   * make it: it sees `Draft<Part>`, where the kernel slice is `readonly`. A
   * private slot consumed by `commit()` keeps that ordering without widening
   * the seam driver's signature with a kernel concern.
   *
   * The slot is **armed before the seam and owned by the transaction**, which
   * is what stops a stamp outliving the transition that armed it. A discarded
   * or failed seam never reaches `commit()`, so its stamp is still set when it
   * returns; without the handover below, the next transaction to commit — an
   * admission, a pointer sample — would silently take that phase. Hence both
   * halves: {@link begin} takes the armed value and clears it, so every
   * transaction starts with exactly the stamp armed for it and no other, and
   * {@link commit} consumes it.
   */
  let armedStamp: ArmedStamp = NO_STAMP;
  let stamp: ArmedStamp = NO_STAMP;

  /**
   * True for the whole of native admission — `admit`, its consumer-supplied
   * handle and visual resolvers, and the frame write that publishes `PENDING`.
   *
   * **Admission is a queue boundary.** It is the one transaction the kernel
   * drives outside the seam driver: it mutates the draft directly and commits
   * at the end, so the driver's re-entry refusal cannot see it. A resolver that
   * calls `invalidate()` reaches `dispatchKernel`, and draining there would run
   * a behavior action — `begin()`, `commit()`, a frame swap — *underneath* a
   * half-written admission, publishing the action's frame and then having
   * admission commit the stale one over it.
   *
   * So dispatch enqueues and returns while this is set, and the boundary drains
   * once, after admission has either committed or abandoned. `destroy()` is
   * unaffected: it is not queued, so it stays a synchronous terminal barrier,
   * and the queue it closes drops everything a resolver appended.
   */
  let admitting = false;

  /** The behavior action being run. Safe as a slot: seams are non-reentrant. */
  let actionTag = 0;
  let actionArgument: unknown = null;

  let handle!: (action: number, argument: unknown) => void;

  const begin = (): void => {
    // Reset before every transaction, armed or not.
    stamp = armedStamp;
    armedStamp = NO_STAMP;
    pinned = current.operation;
    // The shallow copy that opens the transaction. Every frame field is a
    // scalar, immutable or replace-on-write precisely so this is enough.
    Object.assign(draft, current);
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
  const runStamped = (phase: Phase, run: () => void): void => {
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
    // `queue.closed` alone: a separate `destroyRequested` flag is a second name
    // for it — set on the statement after it and never cleared either — so the
    // extra conjunct is unconditionally true beside it.
    !queue.closed && !cancelRequest && current.operation === pinned;

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

    if (!attempt) {
      return;
    }

    settlement = null;
    attempt.completed = true;

    const handle = attempt.landing;

    attempt.landing = null;
    attempt.start = null;

    if (handle) {
      unwind(() => {
        handle.destroy();
      });
    }
  };

  const clearOperationState = (): void => {
    lifetimes = null;
    lift = null;
    originRect = null;
    visual = null;
    box = null;
    cancelRequest = null;
    pinned = null;
  };

  const scrub = (target: Frame<Part>): void => {
    const active = spec;

    if (!active) {
      return;
    }

    // **Wrapped as one unit, and the kernel's own half goes first.** The kernel
    // returns its slice to its defaults and the behavior returns its part;
    // `resetFramePart` is behavior code the API permits to throw, and an
    // unwrapped throw on the first frame would skip the second scrub *and* the
    // ingress abort, making `destroy()` non-terminal. The kernel's own reset
    // cannot throw, so it is inside the same `unwind` with nothing to lose by
    // it.
    unwind(() => {
      frame(target);
      active.resetFramePart(target);
    });
  };

  /**
   * The seven-step teardown, minus steps 1, 2 and 7 — which is exactly
   * operation retirement.
   *
   * `operation` narrows the retirement to one operation; `null` means "whatever
   * the kernel currently holds", used by paths that retire before the operation
   * was ever committed.
   */
  const retireOperation = (operation: OperationIdentity | null): void => {
    if (!spec) {
      return;
    }

    if (operation && current.operation !== operation) {
      return; // a stale retirement for an operation that is already gone
    }

    // 3. kernel attempts.
    retireAttempts();

    // 4. behavior references.
    unwind(spec.retire);

    // 5. presentation → motion → cancellation, LIFO, best-effort. Releases
    //    pointer capture, removes the placeholder and restores inline styles.
    if (lifetimes) {
      unwind(lifetimes.dispose);
    }

    // 6. both frames, each reset individually wrapped.
    scrub(current);
    scrub(draft);

    clearOperationState();
  };

  /**
   * Steps 2–7 of teardown.
   *
   * Totality is a property of the sequence *wherever it runs*, not of the stack
   * that called `destroy()`: each attempt cleanup is individually wrapped in
   * step 3, each frame reset in step 6, and ingress abort is in a `finally` at
   * step 7, so no behavior callback can stop a later step at the boundary any
   * more than it could on the closing stack.
   */
  const runPhysicalTeardown = (): void => {
    try {
      // 2. drop every retained argument, so a queued element cannot outlive the
      //    drain that abandoned it.
      clearQueue(queue);

      // 3–6.
      if (spec) {
        retireAttempts();
        unwind(spec.retire);

        if (lifetimes) {
          unwind(lifetimes.dispose);
        }

        scrub(current);
        scrub(draft);
      }

      clearOperationState();
    } finally {
      // 7. unconditional: no earlier step can prevent ingress from being
      //    released.
      ingress.abort();

      const settle = settleDestroyed;

      if (settle) {
        settleDestroyed = null;
        settle();
      }
    }
  };

  /**
   * Logical closure is **immediate**; physical teardown is **deferrable**.
   *
   * The latch is set on this statement, not at the end of a seven-step
   * sequence, so from here on every guard fails, nothing is admitted, and no
   * declared consumer slot is invoked. `destroy()` does not promise that
   * physical release completes before it returns — only that the latch is set,
   * and the resource release may be one transaction late.
   *
   * Outside a reentrant transaction the two events coincide, which makes
   * immediate physical release the common case rather than the guarantee.
   */
  const destroy = (): Promise<void> => {
    destroyed ??= new Promise<void>((resolve) => {
      settleDestroyed = resolve;
    });

    if (!queue.closed) {
      // 1. every guard now fails, on the closing statement itself.
      queue.closed = true;

      if (transactionDepth === 0) {
        runPhysicalTeardown();
      } else {
        teardownPending = true;
      }
    }

    return destroyed;
  };

  /**
   * Runs deferred teardown when the **outermost** transaction closes.
   *
   * Read at the boundary rather than latched at entry: a `destroy()` raised
   * from anywhere inside the transaction — including one nested many frames
   * deep — is owed teardown by this frame and no other.
   */
  const leaveTransaction = (): void => {
    transactionDepth -= 1;

    if (transactionDepth === 0 && teardownPending) {
      teardownPending = false;
      runPhysicalTeardown();
    }
  };

  /**
   * A throw escaping a handler is an invariant violation: close, **then**
   * report the initiating error, **then** tear down.
   *
   * **Delivering that report after logical closure is a named exception**, and
   * the only one beside `LandingHandle.destroy()`. It belongs there for the
   * property that admits that one: a terminal diagnostic *tells* the consumer
   * something and asks nothing of them — it publishes no lifecycle or domain
   * event, ignores its return value, performs no operation work, and is
   * guarded. Nothing else may run after logical closure, and `notify` enforces
   * that for every other site.
   *
   * Reporting first and destroying second would run consumer code on a
   * controller whose invariants are *already known to be broken*, with the
   * added hazard that the consumer may start work the next statement tears
   * down. Closing first is the more predictable of the two.
   *
   * **Panic is consequential and carries no stage.** It destroys the whole
   * controller rather than one operation, so it is a `DraggableError`; and
   * `FailureStage` classifies faults *within* an operation, so there is nothing
   * to classify. The stage is `null`, which means *the controller is destroyed*
   * and means nothing else. A catch-all value standing in for the one the type
   * cannot hold would cost the distinction that matters here — a panicked
   * controller and a failed `requestAnimationFrame` would become
   * indistinguishable to a consumer.
   */
  const panic = (error: unknown): void => {
    void destroy();
    notify(new DraggableError(null, error), true);
  };

  const dispatchKernel = (action: number, argument: unknown): void => {
    if (queue.closed) {
      return;
    }

    enqueue(queue, action, argument);

    if (admitting) {
      return; // the admission boundary owns the drain
    }

    transactionDepth += 1;

    try {
      // Re-entrant calls return immediately: the outermost frame owns the drain
      // and reaches the newly appended work in the same pass.
      drain(queue, handle, panic);
    } finally {
      leaveTransaction();
    }
  };

  /**
   * Latched cancellation. The first valid cancel per operation wins, and an
   * idle cancel is a no-op that leaves no latch. The latch is what makes a
   * cancellation raised from inside a seam invalidate that preparation
   * synchronously, which matters most when the caller is `onStart`.
   */
  const cancel = (reason?: unknown): void => {
    if (queue.closed || !current.operation || cancelRequest) {
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
    //
    // A held cancel latch outranks the checkpoint outright, under the
    // precedence `DESTROY > CANCEL > FAILURE_CHECKPOINT`. The latch is set
    // synchronously and consumed by `handleCancel` before the cancellation
    // settlement opens, so "still held" means the queued `CANCEL` has not run
    // yet and the operation's terminal channel is already decided as
    // *canceled*. Without this, a seam that cancels and then throws — `moved()`
    // calling `controller.cancel()` and failing on the same sample — queues
    // `CANCEL` then `FAILED`; the cancellation finalizes and queues `RETIRE`,
    // and the checkpoint still runs ahead of it at `FINALIZING`, so the
    // consumer gets both `onCancel` and `onError` for one operation.
    if (
      queue.closed ||
      !operation ||
      cancelRequest ||
      reporting ||
      current.phase === REPORTING
    ) {
      // **Demoted rather than dropped.** The `return` is what decides: the
      // terminal is already owned by whatever is in flight, so this
      // classification is refused and the fault travels without one. The
      // `stage` in hand is discarded for exactly that reason.
      notify(
        new DraggableWarning('drag: failure/not-classified', { cause: error }),
      );
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
    /**
     * **The driver reports without classifying.** Not `failOperation`, which
     * would settle a drop whose reorder already happened; and there is no
     * second destination to choose between — a separate platform reporter would
     * receive a consumer's own destructive rerender — which is what lets the
     * `QUALITY` and `BEST_EFFORT` tiers collapse into one sentinel.
     *
     * There is no lifetime guard at this site, and adding one here is wrong:
     * the guard belongs in `notify`, where every route shares it. A quality
     * fault's producer is consumer-reaching — a `home` resolver, a landing
     * factory — and is equally free to destroy before it throws.
     */
    notify,
  };

  const driver = createSeamDriver<Part>(context);

  /**
   * Drops whatever a seam staged, for the seams the kernel drives directly.
   *
   * Settlement stages its gate plan and the failure report stages its own; both
   * are consumed by the seam's `effect` and have no reader afterwards. Leaving
   * them in the driver's slot would let the *next* seam to commit without
   * staging anything hand a caller a plan belonging to a transaction that is
   * over — which is the whole reason the slot is consume-and-clear.
   */
  const dropStaged = (): void => {
    driver.consumeStaged();
  };

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

  /**
   * Runs one admission member and returns the subject it admitted, or `null`.
   *
   * Shared by both ingresses, because a second input mode is a second
   * *ingress*, not a second protocol: the throw policy, the `preventDefault()`
   * ownership and the post-callback revalidation are one rule each, in one
   * place.
   *
   * **`preventDefault()` is the kernel's.** The behavior answers feasibility
   * with its return value; the ingress owner performs the browser effect. A
   * behavior *can* still prevent the default itself, because it holds the
   * event, and nothing here refuses that.
   *
   * **`prevents` is where the two ingresses stop being the same.** The
   * ownership is the same on both and the *timing* is not: the pointer path
   * prevents at the threshold crossing instead, because `pointerdown` cannot
   * know intent. The command path prevents here, and that is sound rather than
   * an exception — a `keydown` default cannot be prevented after its listener
   * has returned, there is no threshold on that path to relocate to, and a
   * command's admission *is* the intent question, so a non-null return already
   * means the key was meant for the drag.
   */
  const runAdmission = (
    event: Event,
    admit: (event: never, draft: Frame<Part>) => AdmissionSubject | null,
    prevents: boolean,
  ): AdmissionSubject | null => {
    let admitted: AdmissionSubject | null;

    try {
      admitted = admit(event as never, draft);
    } catch (error) {
      // Identity was never minted, so there is no operation for a checkpoint to
      // settle and no `REPORTING` phase to enter. The controller stays idle and
      // usable, and the behavior surfaces the diagnostic.
      //
      // **Consequential.** The consumer's drag will not start and no `onEnd`
      // will follow, which is a changed terminal result by any reading — so
      // this is a `DraggableError`, built here from the stage the kernel owns.
      //
      // Neither a resolver that closed the controller on its way out nor a
      // throwing `onError` is handled here. **Both readings live in `notify`**,
      // which refuses after logical closure and swallows a throwing handler for
      // every route rather than for this one.
      notify(new DraggableError(FAILURE_ADMISSION, error));

      return null;
    }

    if (!admitted) {
      // Declining is total: no operation, no phase change, and the default is
      // **not** prevented — which is what lets an arrow key on an edge item
      // keep its native meaning.
      return null;
    }

    if (prevents) {
      event.preventDefault();
    }

    // Post-callback revalidation. An admission member runs consumer-supplied
    // handle and visual resolvers during native dispatch, and a resolver can
    // close over the already-returned controller and synchronously destroy it.
    // Without this recheck a terminal controller publishes a new operation.
    return queue.closed || current.operation ? null : admitted;
  };

  /**
   * Mints identity, arms this operation's input, and commits `PENDING`.
   *
   * `pointerId === -1` is the **pointerless** discriminant, not a sentinel: it
   * selects which listeners are armed, and the kernel's own geometry never
   * reads the pointer fields, which stay at their admission values on that
   * path.
   */
  const mintOperation = (
    subject: AdmissionSubject,
    pointerId: number,
    x: number,
    y: number,
  ): boolean => {
    const operation: OperationIdentity = { id: (nextOperationId += 1) };

    try {
      // Discriminated by `'visual' in subject` rather than `instanceof`:
      // `instanceof` is realm-sensitive, and `DOMRealm` exists precisely
      // because an element may come from another document.
      if ('visual' in subject) {
        ({ visual, box } = subject);
      } else {
        visual = subject;
        box = subject;
      }
      lifetimes = createOperationLifetimes(notify);

      if (pointerId !== -1) {
        armPointerInput(realm, lifetimes.motion.signal, onPointer);
      }

      armCancelInput(realm, lifetimes.cancellation.signal, onEscape);
    } catch (error) {
      // Nothing is committed yet, so this retires an operation the frames never
      // saw: it disposes whatever was armed and drops the references.
      //
      // **This site is not forced onto a second channel.** It reads like the
      // one place a platform report is unavoidable — `operation` is a local
      // never published to the frames, so `failOperation` would degrade anyway
      // — but the channel is operation-independent, so that reason does not
      // hold: a warning needs no operation and no stage, and `return false`
      // refuses admission, so the outcome is the same either way.
      retireOperation(null);
      notify(
        new DraggableWarning('drag: operation/arming-failed', { cause: error }),
      );
      return false;
    }

    draft.phase = PENDING;
    draft.operation = operation;
    draft.pointerId = pointerId;
    draft.originX = x;
    draft.originY = y;
    draft.pointerX = x;
    draft.pointerY = y;
    commit();
    return true;
  };

  const admitPress = (event: PointerEvent): void => {
    // `false`: the pointer path prevents at the threshold crossing.
    const admitted = runAdmission(event, spec!.admit, false);

    if (admitted) {
      mintOperation(admitted, event.pointerId, event.clientX, event.clientY);
    }
  };

  /**
   * The discrete admission. Identical to the pointer path up to two
   * differences: the operation is pointerless, and `ACTIVATE` is **queued**
   * rather than reached inline from a threshold crossing.
   *
   * The pointer scalars stay at zero and nothing reads them: `originRect` is
   * measured from the visual and is pointer-independent already.
   */
  const admitCommand = (event: Event): void => {
    const admitted = runAdmission(event, spec!.command!.admit, true);

    if (admitted && mintOperation(admitted, -1, 0, 0)) {
      dispatchKernel(ACTIVATE, current.operation);
    }
  };

  /**
   * The ingress queue boundary, shared by **both** listeners.
   *
   * `admitting` is checked **first and here**, not one line later, because
   * everything below this guard is already too late. A handle or visual
   * resolver runs inside an admission member, and a resolver that dispatches a
   * second ingress event re-enters this function synchronously with the outer
   * transaction half-written — and `current.operation` is still `null`, because
   * the outer admission has not committed, so the ordinary guard waves it
   * straight through.
   *
   * The nested pass would then `begin()` (rebuilding the draft the outer member
   * was handed by reference), run the member a second time, mint an identity,
   * arm ingress, and commit its own origin. Control returns to the outer
   * member, which finishes writing *its* item and visual into the object that
   * is now `current` — publishing an operation with one press's coordinates and
   * the other's behavior state.
   *
   * The latch is **one across both listeners**, which is what makes a
   * `pointerdown` dispatched from inside `command.admit`, and a `keydown`
   * dispatched from inside `admit`, refused by the same rule.
   *
   * Refusing before any of that keeps the boundary's ownership intact too: the
   * nested call never reaches the `finally` that clears `admitting`. Behavior
   * actions are unaffected — they are still deferred and drained by the
   * boundary — and `destroy()` is not queued at all, so it remains a
   * synchronous terminal barrier.
   */
  const openIngress = (admit: () => void): void => {
    if (queue.closed || admitting || current.operation) {
      return;
    }

    // A native ingress pass is a library transaction in its own right, and it
    // is one the queue cannot see: this function runs *outside* the drain, so a
    // `destroy()` raised by an admission resolver would otherwise tear down
    // physically with the outer admission still half-written.
    transactionDepth += 1;
    begin();
    admitting = true;

    try {
      try {
        admit();
      } finally {
        // Cleared in a `finally` so a throw escaping admission — a panicking
        // resolver, a re-entry refusal — cannot leave every later dispatch
        // silently queued with nothing to drain it.
        admitting = false;
      }

      // Whatever a resolver dispatched now runs against the committed outcome
      // of admission: `PENDING` when it was admitted, `IDLE` when it was
      // refused, nothing at all when the resolver destroyed the controller.
      if (!queue.closed) {
        drain(queue, handle, panic);
      }
    } finally {
      leaveTransaction();
    }
  };

  /**
   * Disarms the one-shot `click` suppressor, or `null` when none is armed.
   *
   * **Controller-scoped, not operation-scoped, and that is the load-bearing
   * part.** The `click` arrives *after* the operation ends — that is what makes
   * it trailing — so a listener on the motion or presentation lifetime would be
   * disposed before the event it exists to catch. Binding it to ingress is the
   * only lifetime that outlives the operation and still dies with the
   * controller.
   */
  let disarmClick: (() => void) | null = null;

  /**
   * Arms it, at the threshold crossing, for the reason `click` survives at all:
   * only `pointerdown` was ever prevented, `click` is generated from the
   * un-prevented `pointerup`, and so a drop that lands on an `<a href>`
   * navigates.
   *
   * **Only after activation.** A press that never became a drag must keep its
   * click, and a pointerless operation is never armed at all, because a command
   * produces no `click`.
   */
  const armClickSuppressor = (): void => {
    disarmClick?.();

    const aborter = new AbortController();
    const disarm = (): void => {
      if (disarmClick === disarm) {
        disarmClick = null;
      }

      aborter.abort();
    };

    disarmClick = disarm;

    realm.document.addEventListener(
      CLICK,
      (event) => {
        disarm();
        event.preventDefault();
        event.stopPropagation();
      },
      {
        capture: true,
        once: true,
        // Composed with the ingress signal rather than aborted by hand in
        // teardown: "disarmed by teardown" then holds structurally, and the
        // step-7 abort needs no clause about a listener it does not know.
        signal: AbortSignal.any([aborter.signal, ingress.signal]),
      },
    );
  };

  const onPointerDown = (event: PointerEvent): void => {
    // **The second of the three disarm conditions**, and it runs before the
    // primary-press test rather than inside it: a one-shot that never fired
    // must not survive to eat an unrelated click, and a press that begins a
    // *new* interaction is as good a signal that the old one is over as the
    // click itself — whichever button it used.
    disarmClick?.();

    // The primary-press test is the pointer ingress's own and stays outside the
    // shared boundary: a secondary button must not open a transaction at all.
    if (isPrimaryPress(event)) {
      openIngress(() => {
        admitPress(event);
      });
    }
  };

  const onCommand = (event: Event): void => {
    openIngress(() => {
      admitCommand(event);
    });
  };

  // -------------------------------------------------------------------------
  // Activation
  // -------------------------------------------------------------------------

  const activationPolicy = {
    // A discard retires: there is no such thing as a committed operation with
    // no presentation. A *failure* does not — the queued checkpoint owns it,
    // and retiring here would make that entry stale.
    retire(): void {
      retireOperation(null);
    },
    committed(): void {
      // `activation.effect` invokes the consumer's `onStart` last, and that
      // callback may cancel or destroy.
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
   * `FAILURE_ACTIVATION` rather than a silently degraded drag.
   */
  const acquireActivation = (): ActivationScope | null => {
    const target = visual!;
    const owned = lifetimes!;

    try {
      const rect = target.getBoundingClientRect();
      const source = box!;
      // **Window 1 of 2, and its position in this function is the whole
      // point.** It has to be read *before* `acquireLift`, because that is the
      // line the visual leaves flow on — everything the footprint rule needs
      // sits on opposite sides of it. One statement later and both windows
      // would see the collapsed layout and the difference would be zero.
      //
      // Offset box, not a bounding rect: by window 2 the visual carries a
      // transform, which moves a rect's top by the full travel and leaves its
      // height alone. See `OffsetBox`.
      const boxPre: OffsetBox = {
        width: source.offsetWidth,
        height: source.offsetHeight,
      };
      // **One traversal, two products.** The inherited space comes out of the
      // measurement this call already took, before it mutated anything; no
      // behavior may take a second read for it.
      const { session, inheritedSpace } = acquireLift(
        target,
        spec!.config.liftMode,
        rect,
        realm,
        unwind,
      );

      originRect = rect;
      lift = session;
      owned.presentation.use(session.dispose);

      // Neither step runs for a pointerless operation: there is no pointer to
      // capture, so the connectivity precondition capture needs has nothing to
      // guard either. `originRect` above is measured from the *visual* and was
      // already pointer-independent.
      if (current.pointerId !== -1) {
        if (!root.isConnected) {
          throw new Error('drag: activation/root-disconnected');
        }

        owned.motion.use(acquirePointerCapture(root, current.pointerId));
      }

      return {
        visual: target,
        // Read back from the field the join reads it from, so the scope and the
        // pin can never disagree about the grab basis.
        originRect,
        // The kernel's own admission-time state, not a behavior-authored draft
        // field read back.
        box: source,
        boxPre,
        inheritedSpace,
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

    if (!scope) {
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

  /**
   * Release cannot discard: `prepare` returns a command, and motion is already
   * closed, so "changed my mind" has no meaning.
   *
   * **A release that cannot build one throws**, like every other seam. There is
   * no second return arm and no adapter between the two: the phase is already
   * open at `FAILURE_RELEASE`, so `runPhase` catches the throw, calls
   * `context.fail` with that stage and returns `SEAM_PREPARE_FAILED`. A
   * behavior wanting a *different* stage still has `host.fail`, which latches
   * and is on `KernelHost`.
   */
  const releaseTransition: Transition<Part, ResolutionCommand> = {
    prepare: (target) => spec!.release.prepare(target),
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
   * phases take different arguments: `prepare` maps the input, `effect`
   * receives the gate scope. A `prepare` that finds no coherent settlement
   * **throws** and is classified at the seam's own `FAILURE_RESOLUTION` — a
   * fulfilled value that is not an explicit resolution is that failure, and
   * acceptance is never inferred.
   */
  const settlementTransition: Transition<
    Part,
    PreparedSettlement,
    SettlementScope
  > = {
    prepare: (target) => spec!.settlement.prepare(target, settlementInput!),
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
    start: null,
    landing: null,
    landingHeld: false,
    targetX: null,
    targetY: 0,
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
   * disposer, not `onError`, which is reserved for classified failures. It
   * never overwrites a watch, never double-increments and never panics, because
   * a bookkeeping error must not destroy a live drop.
   */
  const createSettlementScope = (
    attempt: SettlementAttempt,
  ): SettlementScope => ({
    holdForLanding(start): void {
      if (attempt.sealed || attempt.landingHeld) {
        notify(new DraggableWarning('drag: settlement/hold-unavailable'));
        return;
      }

      attempt.holds += 1;
      attempt.start = start;
      attempt.landingHeld = true;
    },
  });

  /**
   * Reads `then` **exactly once** and hands back the callable, or `null`.
   *
   * The resolution round-trip may answer with any `PromiseLike`, not only a
   * native `Promise`, so `then` may be an accessor — one that throws, or one
   * that answers differently on a second read. Reading it twice (once to
   * classify, once to subscribe) would let a value be classified as thenable
   * and then subscribed to as something else. A throw is the *caller's* to
   * classify as a semantic failure; it is not a kernel invariant violation and
   * must never reach the panic path.
   *
   * **One caller.** The readiness gate is a declaration and a host signal
   * rather than a second consumer thenable with the same hazards, so nothing on
   * that path reads `then` at all.
   */
  const thenOf = (value: unknown): PromiseLike<unknown>['then'] | null => {
    const then = (value as PromiseLike<unknown> | null | undefined)?.then;

    return typeof then === 'function' ? then : null;
  };

  /**
   * Whether the attempt still owns a live operation in `SETTLING`. Checked on
   * both sides of `start`, because either `anchorTarget` or the runner itself
   * may have destroyed the controller.
   */
  const settlementLive = (attempt: SettlementAttempt): boolean =>
    settlement === attempt &&
    !queue.closed &&
    !cancelRequest &&
    current.operation !== null &&
    current.phase === SETTLING;

  /**
   * The `FINALIZING` counterpart of `settlementLive`. The join calls into three
   * pieces of foreign code — `anchorTarget`, the runner's `destroy()`, and the
   * terminal callback — and each of the first two may destroy the controller
   * synchronously. Everything after such a call is checked against this,
   * because `destroy()` is a synchronous terminal barrier.
   */
  const joinLive = (): boolean =>
    !queue.closed && current.operation !== null && current.phase === FINALIZING;

  const rollbackLandingHold = (attempt: SettlementAttempt): void => {
    if (attempt.landingHeld) {
      attempt.landingHeld = false;
      attempt.holds -= 1;
    }

    attempt.start = null;
  };

  /**
   * The once-only landing completion latch. `done()` then `fail()`, `fail()`
   * then `done()`, and a duplicate `done()` all resolve to the first call.
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
      return; // inert for a retired attempt, at both validation points
    }

    if (failure) {
      // Inside `start` this has to *latch*, so the arm phase returns
      // `ARM_FAILED` rather than publishing a runner for a settlement that is
      // already replaced. Asynchronously there is no open phase to latch onto,
      // and this callback is exactly the operation-scoped exception to "`fail`
      // only inside a seam": it is minted per attempt and inert once the
      // attempt is retired.
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
   * Arms the complete gate plan, once, after the scope sealed.
   *
   * The landing hold is **reserved before `start` is called** and the handle is
   * **published only after it returns**. A runner that calls `done()` from
   * inside `start` — `landing({ duration: 0 })`, or any synchronous runner —
   * therefore always finds its hold, and its queued completion can never be
   * applied before the handle exists. Reserve-before-call and
   * revalidate-after-return are two different fixes: the first makes a
   * synchronous `done()` safe, the second makes a synchronous `destroy()` safe.
   */
  const armSettlement = (attempt: SettlementAttempt): ArmOutcome => {
    // **Called once per settlement, and this is the authoritative
    // measurement.** The serial authored commit guarantees the authored DOM is
    // final here, so there is no interval in which a target is provisional. A
    // second, advisory call here would run before any readiness acknowledgement
    // could arrive — arm is synchronous at the end of the settlement drain —
    // and would read a stale target that the join's pin then silently corrects,
    // which is this bug class's signature: the landing opens with a jump and
    // still ends correctly.
    //
    // Measured unconditionally, before the landing branch, because the join
    // pins to this value whether or not a runner was installed.
    //
    // **Unclassified, not classified.** Returning `ARM_FAILED` from
    // `runLeafValue` for a measurement throw tells a consumer whose reorder is
    // already committed and accepted that it failed — over a fault that is
    // entirely presentational. The measurement includes the behavior's own
    // trustworthiness precondition, which it checks from the inside and reports
    // through the same throw: a target that cannot be produced and one that
    // cannot be trusted are the same fault.
    //
    // No stage is attached, and none is needed: a dedicated landing-target
    // stage would exist only so a non-consequential fault could reach `onError`
    // at all, and a warning reaches it without one. The message carries what
    // such a stage would have said.
    const anchor = driver.runUnclassifiedValue(
      () => spec!.anchorTarget(current),
      'drag: landing/target-unavailable',
    );

    // `anchorTarget` is behavior code and may have destroyed the controller.
    // Calling the consumer's runner after that would breach the terminal
    // barrier `destroy()` establishes. Checked before the skip branch as well
    // as before `start`, because a destroyed controller must not go on to
    // advance a settlement either.
    if (!settlementLive(attempt)) {
      rollbackLandingHold(attempt);
      return ARM_STALE;
    }

    if (anchor === undefined) {
      // **Skipped, not faked.** `onError` has already been delivered by the
      // driver. The hold is rolled back and `start` is skipped entirely, so
      // there is no runner and no animation; `targeted` stays false, which is
      // what tells the join to release without pinning. The settlement is
      // **not** failed and the domain result stands — the DOM commit already
      // happened and the reorder is real — so this returns `ARM_ARMED` and the
      // operation joins immediately and terminates normally.
      //
      // A jump cut is honest. The alternative is worse: a detached placeholder
      // reads `0×0` at the viewport origin, so "landing from the unrepaired
      // position" is a confident twelve-frame animation to `(0,0)` followed by
      // a teleport back.
      rollbackLandingHold(attempt);
      attempt.targetX = null;
      return ARM_ARMED;
    }

    const origin = originRect!;
    // Converted to an **origin-relative delta**, the space `compose` and
    // `lift.write` consume. `anchorTarget` produces a viewport point and the
    // kernel converts once, here, because the runner has no other way to reach
    // the grab basis — see README, deliberate differences. **The borrow ends
    // here.** Both fields of `anchor` are read on this line and the object is
    // never referenced again: a behavior is free to return one reusable buffer
    // per controller, and both first-party ones do.
    const targetX = anchor.x - origin.x;
    const targetY = anchor.y - origin.y;

    attempt.targetX = targetX;
    attempt.targetY = targetY;

    const { start } = attempt;

    if (!start) {
      return ARM_ARMED;
    }

    const session = lift!;
    // **THE sample of the recorded delta.** Read from the kernel's own session
    // rather than recomputed from the pointer, because the two agree for
    // exactly one behavior — one whose `moved` writes the raw pointer delta on
    // both axes — and disagree for every behavior that constrains, clamps,
    // snaps or externally drives its visual, and for every pointerless
    // operation, which has no pointer to subtract.
    //
    // Copied into two fields. The session's own pair is mutable and written on
    // the hot path, so reading it by value here is what stops a late
    // `lift.write` — outside the contract, but not refused — from moving a
    // `from` the runner has already read. `targetX`/`targetY` sit beside them
    // in the same flat shape.
    //
    // **This read is the boundary of the rendering interval.** Behavior
    // rendering goes through `write` up to here; from here the landing runner
    // is the deliberate writer, until its `destroy()` relinquishes the
    // transform for the join pin.
    const context: LandingContext = {
      visual: visual!,
      compose: session.compose,
      fromX: session.renderedX,
      fromY: session.renderedY,
      targetX,
      targetY,
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

        unwind(() => {
          runner.destroy();
        });
      }

      rollbackLandingHold(attempt);
      return ARM_FAILED;
    }

    // `start` may have destroyed the controller and STILL returned this live
    // handle. Teardown ran first, saw no published handle and retired the
    // attempt, so publishing now would leave a runner nothing owns.
    if (!settlementLive(attempt)) {
      const runner = handle!;

      unwind(() => {
        runner.destroy();
      });
      rollbackLandingHold(attempt);
      return ARM_STALE;
    }

    attempt.landing = handle!;
    return ARM_ARMED;
  };

  /**
   * The gate is complete: relinquish the runner, pin, release presentation,
   * then call the terminal callback.
   *
   * **Ordering is normative.** `destroy()` precedes the pin so a running WAAPI
   * animation cannot override the inline transform. Every step before the
   * release is individually fallible and the release is in a `finally`: the
   * join calls into code the kernel does not own, and none of it may strand the
   * placeholder or the inline styles.
   */
  const joinSettlement = (attempt: SettlementAttempt): void => {
    const owned = lifetimes!;
    const session = lift!;

    begin();
    draft.phase = FINALIZING;
    commit();

    let failed = false;

    try {
      // **The entry revalidation, written out because nothing else performs
      // it.** With the measurement taken at arm there is no consumer call here
      // to revalidate as a side effect — and the code between arm and here is
      // consumer-reachable, because `anchorTarget` and the runner's `start`
      // both run on the way. Without this check a destroy raised from either
      // would still reach the pin and the terminal callback.
      if (!joinLive()) {
        return;
      }

      // **No second measurement.** `anchorTarget` runs once, at arm, and the
      // join pins to the same value the runner was handed — so the animation
      // and the pin cannot disagree about where the drop ends. A provisional
      // target measured here instead is survivable for exactly that reason, and
      // wrong for the same one.
      const { targetX } = attempt;
      const handle = attempt.landing;

      if (handle) {
        attempt.landing = null;

        try {
          handle.destroy();
        } catch (error) {
          // Best-effort: a custom runner must not be able to strand
          // presentation. But it may keep writing the transform after the pin,
          // so this operation no longer claims the runner relinquished it.
          attempt.relinquished = false;
          notify(
            new DraggableWarning('drag: landing/runner-destroy-failed', {
              cause: error,
            }),
          );
        }

        // The runner is the consumer's code and gets the same treatment: a
        // `destroy()` that destroys the controller already retired this
        // attempt, so neither the pin nor the terminal callback may run.
        if (!joinLive()) {
          return;
        }
      }

      // **A null target means the measurement was skipped**: no pin, no
      // animation, and presentation is released from where the visual stands —
      // the jump cut. Everything after this point still runs, because the
      // settlement was never failed: the release below is unconditional and
      // `finalized` publishes the domain result the frame already holds.
      if (
        targetX !== null &&
        !driver.runLeaf(() => {
          session.write(targetX, attempt.targetY);
        }, FAILURE_RENDERER_WRITE)
      ) {
        failed = true;
      }
    } finally {
      // Unconditional. Every fallible step above is individually wrapped, so
      // the only thing that reaches this `finally` today is a re-entry panic —
      // but the rule is the sequence's own, not an artifact of which steps
      // happen to catch: no failure between `FINALIZING` and here may leave the
      // placeholder inserted or the inline styles overwritten.
      owned.presentation.dispose();
    }

    if (failed) {
      // **The terminal is not skipped — it moves one action later.** This
      // `return` hands the operation to the queued checkpoint, which drives
      // `REPORTING` and then publishes the terminal from `ERROR_REPORTED`,
      // after presentation is released.
      //
      // Publishing it here instead would fire `onFinish` for a drop the
      // checkpoint is about to report through `onError`, which reads a failure
      // and a terminal as alternatives. They are orthogonal: a consequential
      // failure of a started operation still owes the consumer exactly one end,
      // and the frame's committed result is what it publishes. Skipping it here
      // and publishing there is what keeps the two routes' *ordering* identical
      // — presentation released first, terminal second — so a consumer never
      // has to know which route its drag took.
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
   * Drives one settlement: prepare → stamp `SETTLING` → commit → request → seal
   * → arm.
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
        FAILURE_RESOLUTION,
      );
    });

    dropStaged();
    settlementInput = null;
    attempt.sealed = true;

    if (outcome !== SEAM_COMMITTED) {
      // Drop every unarmed request and arm **nothing**. Arming a half-requested
      // plan would start a runner for a settlement that has already failed or
      // been abandoned; the queued checkpoint decides instead.
      rollbackLandingHold(attempt);
      attempt.holds = 0;
      return;
    }

    if (armSettlement(attempt) === ARM_FAILED) {
      return; // replaced: no advance, and no terminal callback of this outcome
    }

    advanceSettlement(attempt);
  };

  /**
   * The producer-side half of the double validation. The queued action
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
    const attempt: ResolutionAttempt = {
      completed: false,
      settlement: null,
    };
    const { invoke } = command;

    resolution = attempt;

    if (!invoke) {
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

    // Reading `then` and subscribing are inside one `try`, because both are
    // consumer code on an arbitrary thenable. A throw from either is the
    // resolution rejecting. `settleResolution` latches, so a thenable that
    // resolves synchronously and *then* throws keeps its first completion.
    try {
      const then = thenOf(value);

      if (then) {
        then.call(
          value as PromiseLike<unknown>,
          (settled: unknown) => {
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
    } catch (error) {
      settleResolution(attempt, { type: SETTLED_REJECTED, error });
      return;
    }

    settleResolution(attempt, { type: SETTLED_FULFILLED, value });
  };

  // -------------------------------------------------------------------------
  // Handlers. Every one is total: an action it does not recognise in the
  // current phase is ignored, never thrown on.
  // -------------------------------------------------------------------------

  /**
   * The active-movement leaf, hoisted to **one** controller-stable closure.
   *
   * Inlining it as an arrow at the call site allocates a fresh closure on every
   * active pointer sample — the one path whose allocations count — and the
   * emitted bundle keeps the arrow rather than folding it away. Reading the
   * swappable `current` and `lift` slots at call time is what makes hoisting
   * sound: neither is captured by value.
   */
  const runMoved = (): void => {
    spec!.moved(current, lift!);
  };

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
      driver.runLeaf(runMoved, FAILURE_RENDERER_WRITE);
      return;
    }

    const { threshold } = spec!.config;
    const dx = current.pointerX - current.originX;
    const dy = current.pointerY - current.originY;

    if (dx * dx + dy * dy >= threshold * threshold) {
      // **The pointer path's `preventDefault()`.** What it prevents is *this*
      // `pointermove` — selection extension, and the native drag-and-drop start
      // where a browser fires one — not the `pointerdown`, which has already
      // been dispatched un-prevented and whose focus and caret are real and are
      // supposed to be. Preventing at admission would spend a press on a drag
      // that has not happened yet and, in most presses, never will.
      //
      // It is **not** a scroll policy. `preventDefault()` on `pointerdown` was
      // never a reliable scroll suppressor; scroll suppression is
      // `touch-action` and is the consumer's, set on the draggable region.
      sample.preventDefault();

      // A selection may already have started, and prevention cannot undo it —
      // the event that began it has returned. Clearing is the only instrument
      // left, and what is cleared is the half-made selection the press made on
      // its way to becoming a drag.
      realm.window.getSelection()?.removeAllRanges();
      armClickSuppressor();
      activate();
    }
  };

  /**
   * The release, from `ACTIVE`, in the fixed two-commit order the kernel owns.
   * `sample` is `null` for a pointerless release: there is nothing to commit,
   * and the pointer fields stay as admission left them.
   */
  const closeOperation = (sample: PointerCoordinates | null): void => {
    // Commit 1: the committed frame matches what is about to be true, so a
    // `release.prepare` that throws or reentrantly destroys never leaves a
    // committed `ACTIVE` operation with no ingress and no path forward.
    begin();
    draft.phase = RELEASING;

    if (sample) {
      draft.pointerX = sample.clientX;
      draft.pointerY = sample.clientY;
    }

    commit();

    // Motion closes *between* the two commits: capture released, listeners and
    // invalidation removed, the behavior's frame task cancelled. Nothing
    // pending can alter the proposal from here.
    lifetimes!.motion.dispose();

    runReleaseSeam(driver, releaseTransition, FAILURE_RELEASE, openResolution);
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

    closeOperation(sample);
  };

  /**
   * The pointerless release, which enters the **same** transition `UP` enters
   * at `ACTIVE`. Unreachable for a pointer operation and unreachable from a
   * behavior: `KernelHost` still has no lifecycle entry.
   */
  const handleRelease = (operation: OperationIdentity): void => {
    if (current.operation !== operation || current.phase !== ACTIVE) {
      return;
    }

    closeOperation(null);
  };

  /**
   * The pointerless activation, which enters the **same** seam the threshold
   * crossing enters inline from `MOVE`.
   */
  const handleActivate = (operation: OperationIdentity): void => {
    if (current.operation !== operation || current.phase !== PENDING) {
      return;
    }

    activate();
  };

  /**
   * A cancellation at `ACTIVE` or `RELEASING` enters the settlement seam, which
   * is the only hook that can produce the canceled domain result `onCancel`
   * requires: `recovery` and `domain` are fields of the behavior's frame part,
   * which the kernel cannot name or write.
   */
  const settleCancellation = (reason: unknown, stage: CancelStage): void => {
    openSettlement({ type: SETTLED_CANCELED, reason, stage });
  };

  const handleResolutionSettled = (attempt: ResolutionAttempt): void => {
    // The applied half of the double validation. The slot check alone covers
    // every path that exists today, because everything that decides the
    // operation also clears the slot; the phase check is the second layer the
    // contract requires, guarding the window where the two disagree.
    if (resolution !== attempt || current.phase !== RELEASING) {
      return; // a late completion for an operation that is already decided
    }

    const input = attempt.settlement;

    if (!input) {
      return;
    }

    // Consumed once and the payload cleared, so it can never be applied twice.
    attempt.settlement = null;
    openSettlement(input);
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

    if (!request) {
      return;
    }

    switch (current.phase) {
      case PENDING:
        // Abandoned before there was anything to tell the consumer about:
        // `admit` is not a start notification, and no presentation exists.
        retireOperation(operation);
        break;
      case ACTIVATING:
      case ACTIVE:
      case RELEASING:
        // `ACTIVATING` settles like `ACTIVE`, and the reason is that the phase
        // is committed **before** `activation.effect` runs: by the time a
        // cancellation is applied here the placeholder is in the DOM, the lift
        // is acquired and the behavior has already delivered its start
        // notification. Retiring instead would leave a consumer that was told a
        // drag began with no terminal callback at all — and there is nothing
        // atomic left to protect, because settling un-commits nothing.
        //
        // The stage is `AT_PROPOSAL` ("abandoned before the consumer round-trip
        // opened") and the behavior's own result carries a null proposal, which
        // is the case its domain type already names.
        settleCancellation(
          request.reason,
          current.phase === RELEASING ? AT_CONSUMER : AT_PROPOSAL,
        );
        break;
      // **Written out rather than left to a bare `default`.** The handler is
      // total either way — a phase it does not recognise is ignored, never
      // thrown on — but with a closed union the compiler can say *which* phases
      // that covers, so the four are named. `IDLE` has no operation; the three
      // terminal phases have a settlement already deciding the outcome, and a
      // cancel arriving there is late by definition.
      case IDLE:
      case SETTLING:
      case REPORTING:
      case FINALIZING:
        break;

      // no default
    }
  };

  const handleStartCommitted = (operation: OperationIdentity): void => {
    if (current.phase !== ACTIVATING || current.operation !== operation) {
      return;
    }

    // The latch outranks the checkpoint: an operation cancelled during
    // `ACTIVATING` must never reach `ACTIVE`. FIFO alone does not give this —
    // an action whose *effect* cancels (a collection replacement that
    // invalidates the gap, dispatched from `onStart`) queues its `CANCEL`
    // behind this checkpoint, so without the check the operation would activate
    // for exactly one drain and the cancellation would be reported at the wrong
    // stage. Leaving the phase untouched is enough: the queued `CANCEL` finds
    // `ACTIVATING` and settles it.
    if (cancelRequest) {
      return;
    }

    begin();
    draft.phase = ACTIVE;
    commit();

    // **A command is one slot.** A pointerless operation has no other producer
    // of a release — no `pointerup` will ever arrive — so the kernel is the
    // producer, once, here. Queued rather than run inline so the consumer's
    // `onStart` and anything it dispatched drain first, exactly as they would
    // before a press's own release.
    if (current.pointerId === -1) {
      dispatchKernel(RELEASE, current.operation);
    }
  };

  const handleFailed = (checkpoint: FailureCheckpoint): void => {
    const { phase } = current;

    // The applied half of the precedence check, and not redundant with the one
    // in `failOperation`: `host.fail()` classifies **immediately**, inside the
    // open phase, so a seam that fails and *then* cancels queues
    // `[FAILED, CANCEL]` — the latch does not exist yet when the checkpoint is
    // queued, only when it is applied. Dropping it here leaves the phase
    // untouched, so the `CANCEL` behind it still finds a live `ACTIVE`
    // operation and produces the single terminal callback the consumer gets.
    // The error is not lost; it arrives as a warning, because the `return` here
    // is what decides and the cancel owns the terminal. `checkpoint.stage` is
    // discarded with the classification it names.
    if (cancelRequest && current.operation === checkpoint.operation) {
      notify(
        new DraggableWarning('drag: failure/superseded-by-cancel', {
          cause: checkpoint.error,
        }),
      );
      return;
    }

    if (
      current.operation !== checkpoint.operation ||
      phase === IDLE ||
      phase === REPORTING
    ) {
      // **The one place an error can vanish outright, and here it does not.**
      // Stale, or a second checkpoint for a report already in flight — either
      // way this checkpoint loses its classification, and under two channels
      // there is nowhere for what it carries to go. Under one there is: the
      // consequence it claims is refused, and the fault is not.
      //
      // A warning rather than an error, and for the same reason as every other
      // demotion here: the `return` is what decides. A stale checkpoint names
      // an operation that is already over, and a second one arrives while the
      // first is being reported — in both cases the terminal is owned and the
      // outcome is not this fault's to change.
      notify(
        new DraggableWarning('drag: failure/checkpoint-stale', {
          cause: checkpoint.error,
        }),
      );
      return;
    }

    // The settlement is **replaced**: whatever the previous attempt armed is
    // over, and the runner it started is the kernel's to stop.
    retireAttempts();

    settlementInput = {
      type: SETTLED_FAILED,
      stage: checkpoint.stage,
      error: checkpoint.error,
      // **Built here, by the kernel, and here is the only place one is built
      // for an operation.** The behavior maps `stage` to a recovery, which is
      // its own, and forwards this untouched. **There is no stage → code
      // mapping for a behavior to re-own**: the error carries the same `stage`
      // this input does, so the two fields agree by construction rather than by
      // a derivation the kernel would have to keep.
      //
      // **A behavior raises a cause; the kernel mints the error.** The stage is
      // not final at the raise site — a stale checkpoint is demoted to a
      // `DraggableWarning` above, and a held cancel latch outranks the
      // checkpoint outright — so an error minted at the failing branch would
      // already be the wrong object in both cases and would have to be
      // unwrapped and rebuilt. One mint site is what makes *the stage on the
      // error is the stage the kernel decided* true by construction rather than
      // by every behavior agreeing.
      report: new DraggableError(checkpoint.stage, checkpoint.error),
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
      dropStaged();
      reporting = false;
      settlementInput = null;
    }

    if (current.phase === REPORTING) {
      // The **whole checkpoint**, not just its operation: the terminal this
      // path now owes is skipped for exactly one stage, and the reader of that
      // rule needs the stage to apply it.
      dispatchKernel(ERROR_REPORTED, checkpoint);
      return;
    }

    // The report transition never published — a rejection from `prepare`, or a
    // reentrant destroy. Nothing will drive `ERROR_REPORTED`, and the operation
    // may not stay live.
    retireOperation(checkpoint.operation);
  };

  /**
   * `onError` is done. **The operation still owes a terminal**, and this is
   * where the failure path pays it.
   *
   * Skipping the terminal callback after a consequential failure would rest on
   * the committed frame still saying `OUTCOME_ACCEPTED`, so that publishing
   * announces a successful drop the checkpoint is about to report as failed.
   * The opposite holds: when the failure arrives after the authored commit the
   * drop *is* accepted, and announcing it is the one fact the consumer must
   * have. `onEnd` reports what happened to the **data**; `onError` is the
   * verdict on the operation.
   *
   * The behavior decides what to publish and whether to publish at all — the
   * frame's own result, `canceled` where it holds none, and nothing for an
   * operation whose `onStart` never ran. The kernel only calls.
   *
   * **Presentation is released first**, so the callback sees the same world it
   * sees on the success path: the join releases in its `finally` and then calls
   * `finalized`, and a consumer must not have to know which route its drag took
   * to know whether the placeholder is still in the list.
   *
   * **One stage is excluded, and it is the one that cannot be
   * double-published.** `FAILURE_TERMINAL_CALLBACK` means `finalized` already
   * ran and threw; calling it again would deliver a second `onEnd` for one
   * operation and, since it would throw again, do so forever. The behavior's
   * settlement `prepare` makes the same exclusion from the other side, where it
   * declines to rewrite an outcome that has already been reported.
   */
  const handleErrorReported = (checkpoint: FailureCheckpoint): void => {
    const { operation, stage } = checkpoint;

    if (current.phase !== REPORTING || current.operation !== operation) {
      return;
    }

    if (stage !== FAILURE_TERMINAL_CALLBACK && lifetimes) {
      unwind(lifetimes.presentation.dispose);

      // A throw here reaches `failOperation`, which sees `REPORTING` and takes
      // the non-consequential channel — so a terminal that fails on the failure
      // path is reported without queueing a second checkpoint for an operation
      // that is one statement from retirement.
      driver.runLeaf(() => {
        spec!.finalized(current);
      }, FAILURE_TERMINAL_CALLBACK);
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
        FAILURE_ACTION_PREPARE,
        FAILURE_ACTION_EFFECT,
      );
    } finally {
      dropStaged();
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
      case ACTIVATE:
        handleActivate(argument as OperationIdentity);
        break;
      case RELEASE:
        handleRelease(argument as OperationIdentity);
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
      case LANDING_SETTLED:
        handleLandingSettled(argument as SettlementAttempt);
        break;
      case FAILED:
        handleFailed(argument as FailureCheckpoint);
        break;
      case ERROR_REPORTED:
        handleErrorReported(argument as FailureCheckpoint);
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
    /**
     * The latch itself, read live — a captured boolean would be a copy of a
     * liveness answer, which is the failure mode the whole invariant is about.
     */
    get closed(): boolean {
      return queue.closed;
    },
    dispatch(tag, argument) {
      if (queue.closed) {
        return;
      }

      if (
        !spec ||
        !Number.isInteger(tag) ||
        tag < 0 ||
        tag >= spec.config.actionTags
      ) {
        // Reported and dropped, never enqueued: the kernel computes
        // `BEHAVIOR_BASE + tag`, so a negative or fractional tag would alias a
        // kernel action.
        notify(
          new DraggableWarning(
            `drag: dispatch/tag-out-of-range ${String(tag)}`,
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
     * rethrow. A controller is never returned half-armed.
     */
    arm(next): void {
      spec = next;

      // How many frames physically exist, which is what the unwind scrubs.
      let composed = 0;

      try {
        if (
          !Number.isInteger(next.config.actionTags) ||
          next.config.actionTags < 0
        ) {
          throw new TypeError('drag: spec/action-tags-invalid');
        }

        // Static spec data, validated once, exactly as `actionTags` is. **One
        // check, and it is the only one here the library owns.** The
        // `pointerdown` collision is refused rather than tolerated: two
        // listeners for one type would run two admission members for one event,
        // and the second would find the first's operation already committed —
        // silently, and only sometimes. That corrupted operation is the
        // kernel's own state, which is what makes this the library's invariant
        // to hold rather than the author's.
        //
        // **Four checks that look like they belong in this loop do not, and the
        // last two are why the rule is worth restating.**
        // `typeof type !== 'string'` re-states what `readonly string[]` already
        // guarantees. A duplicate entry needs no refusal, because the platform
        // ignores it: `addEventListener` dedups on (type, callback, capture)
        // and all three are identical for every entry here, so a second binding
        // is already a no-op — and `indexOf` inside the loop would make
        // refusing it quadratic. The array-shape pair is verified by
        // construction rather than argued: an **empty array** binds no discrete
        // listener, which is the state a behavior omitting `command` entirely
        // already reaches, so refusing it would refuse a supported
        // configuration under a different spelling; an **empty-string entry**
        // binds an ordinary, distinct listener for a type nothing dispatches,
        // leaving the author's discrete ingress inert while the kernel's is
        // untouched. Both would cost the author their own feature and cost the
        // library nothing, and the library declines that trade however plainly
        // the value looks like a mistake.
        if (next.command !== undefined) {
          for (const type of next.command.types) {
            if (type === POINTER_DOWN) {
              throw new TypeError('drag: spec/command-type-pointerdown');
            }
          }
        }

        // The same code path twice, so both frames get one hidden class. The
        // part factory is not proven deterministic, so the two results are not
        // assumed identical — they are simply both composed, and `composed`
        // records how many exist for the unwind below.
        current = Object.assign(frame(), next.createFramePart());
        composed = 1;
        draft = Object.assign(frame(), next.createFramePart());
        composed = 2;

        root.addEventListener(POINTER_DOWN, onPointerDown, {
          signal: ingress.signal,
        });

        // Inside the **same** ingress abort that owns `pointerdown`, so
        // `destroy()` releases every listener including the discrete ones, and
        // a behavior with no `command` member binds nothing at all.
        if (next.command !== undefined) {
          for (const type of next.command.types) {
            root.addEventListener(type, onCommand, { signal: ingress.signal });
          }
        }
      } catch (error) {
        unwind(next.retire);

        // Totality applies to the unwind too: a reset that throws here must not
        // replace the original arm failure or skip the ingress cleanup. Scrub
        // **whichever frame exists** — a second factory that throws leaves a
        // constructed frame the failure path is still responsible for, and a
        // part that already holds a DOM reference would otherwise be retained
        // by the controller for good.
        if (composed > 0) {
          scrub(current);
        }

        if (composed > 1) {
          scrub(draft);
        }

        ingress.abort();
        spec = null;
        throw error;
      }
    },
  };
}
