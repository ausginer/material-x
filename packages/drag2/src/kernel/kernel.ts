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
  MOVE,
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
  FAILURE_PLACEHOLDER_MOVE,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
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
  IDLE,
  PENDING,
  RELEASING,
  REPORTING,
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
  type SeamContext,
  type Transition,
} from './seams.ts';
import type {
  ActivationScope,
  BehaviorSpec,
  KernelHost,
  ResolutionCommand,
  SeamRejection,
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

  /**
   * The operation the open transaction belongs to, captured at `begin()`.
   * `preparationValid()` compares against it rather than against a mutable
   * "current operation" field, so a reentrant retirement between `begin` and
   * `commit` is visible as an identity change.
   */
  let pinned: OperationIdentity | null = null;
  let destroyRequested = false;

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

  /**
   * Queues a classified failure against the operation the kernel currently
   * holds. A failure with no live operation has no checkpoint to run and
   * degrades to a platform report.
   */
  const failOperation = (stage: FailureStage, error: unknown): void => {
    const { operation } = current;

    if (queue.closed || operation === null) {
      report(error);
      return;
    }

    enqueue(queue, FAILED, {
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
  // Teardown
  // -------------------------------------------------------------------------

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

    // 3. kernel attempts — phase 5 owns the resolution and settlement records.
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

  const isRejection = (
    result: ResolutionCommand | SeamRejection,
  ): result is SeamRejection => 'stage' in result;

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
   * The consumer round-trip. **Phase 5** owns the resolution attempt, its
   * guarded abort and the `RESOLUTION_SETTLED` dispatch; until then a release
   * commits and renders, and the operation waits in `RELEASING` for a cancel or
   * a destroy.
   */
  const openResolution = (_command: ResolutionCommand): void => {};

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
   * **Phase 5.** A cancellation at `ACTIVE` or `RELEASING` enters the
   * settlement seam with a `SETTLED_CANCELED` input, which is the only hook
   * that can produce the canceled domain result `onCancel` requires (F-33).
   * Until that exists, the operation is retired without a terminal callback.
   */
  const settleCancellation = (_reason: unknown, _stage: CancelStage): void => {
    retireOperation(current.operation);
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

    begin();
    draft.phase = REPORTING;
    commit();

    // **Phase 5.** The checkpoint belongs in the settlement seam as a
    // `SETTLED_FAILED` input, which maps it to `OUTCOME_FAILED` with immediate
    // recovery and reports through `onError` only. Until that exists the
    // failure is surfaced without an operation-scoped outcome.
    guarded(() => {
      spec!.reportFailure(checkpoint.stage, checkpoint.error);
    });
    dispatchKernel(ERROR_REPORTED, checkpoint.operation);
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
        // Phase 5's three settlement actions land here until it exists.
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
