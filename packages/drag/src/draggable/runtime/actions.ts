// oxlint-disable no-use-before-define -- declarations hoist; grouped by lifecycle stage.
/*
 * The state machine is mutually recursive by nature: `dispatch` reaches every
 * handler, and handlers dispatch continuations. Function declarations hoist, so
 * ordering them is a presentation choice, and grouping by lifecycle stage reads
 * far better here than a topological sort would.
 */

/**
 * Every draggable transition, as direct imperative code.
 *
 * One action validates itself against `current`, prepares a candidate in
 * `draft`, commits by swapping the frames, then runs its post-commit effects
 * inline. There is no effect description, no router and no success/failure
 * round-trip: an action that needs to continue after consumer code enqueues a
 * named checkpoint, and nothing else re-enters the queue.
 */
import { createLandingRunner } from '../../kernel/animation.ts';
import { createMapper, IDENTITY_MAPPER } from '../../kernel/coordinate.ts';
import { createOperationLifetimes } from '../../kernel/lifetimes.ts';
import {
  acquirePointerCapture,
  armOperationInput,
} from '../../kernel/pointer.ts';
import { watchPresentationReady } from '../../kernel/presentation-ready.ts';
import { acquireLift, createDragRenderer } from '../../kernel/presentation.ts';
import {
  CANCEL_ESCAPE,
  CANCEL_POINTER,
  FAILURE_ANIMATION_CREATE,
  FAILURE_DROP_RESOLUTION,
  FAILURE_HOME_TARGET,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_PIN,
  FAILURE_LANDING_TIMING,
  FAILURE_MOVE,
  FAILURE_PRESENTATION_READY,
  FAILURE_RENDERER_WRITE,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_REJECTED,
  POINTER_CANCEL,
  POINTER_MOVE as POINTER_MOVE_TYPE,
  POINTER_UP as POINTER_UP_TYPE,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  type CancellationReason,
  type FailureCause,
} from '../../kernel/protocol.ts';
import { drain, enqueue } from '../../kernel/queue.ts';
import type {
  AnimationTiming,
  CoordinateMapper,
  Point,
} from '../../kernel/types.ts';
import { resolveBounds } from '../bounds.ts';
import { homeLandingPlan, isValidHomeTarget } from '../landing.ts';
import { applyMotionDelta, geometryOf } from '../motion.ts';
import type { FreeDropResolution, FreeDropResult } from '../options.ts';
import { buildFreeDropProposal } from '../request.ts';
import {
  beginTransition,
  commitTransition,
  DRAG_ACTIVATING,
  DRAG_FINALIZING,
  DRAG_IDLE,
  DRAG_PENDING,
  DRAG_RELEASING,
  DRAG_REPORTING,
  DRAG_SETTLING,
  DRAGGING,
  type OperationIdentity,
} from './frames.ts';
import {
  isCurrent,
  nextOperation,
  panicRuntime,
  retireAttempts,
  retireOperation,
  type CancelRequest,
  type DraggableRuntime,
  type LandingAttempt,
  type ReadinessAttempt,
  type FailureContinuation as FailureRecord,
  type ResolutionAttempt,
} from './runtime.ts';

/* ------------------------------------------------------------------ actions */

/** An admitted press, captured during native dispatch. */
export const ADMIT = 1;
/** A stable native pointer sample; the event is not retained past the drain. */
export const POINTER_MOVE = 2;
export const POINTER_UP = 3;
export const CANCEL = 4;
/** Live policy replacement from `update()`. */
export const POLICY = 5;
/** A controlled position, already copied into an owned value. */
export const CONTROLLED = 6;
/** Layout invalidation: re-clamp from the committed pointer. */
export const INVALIDATE = 7;
/** Checkpoint: `onStart` returned; publish the dragging phase. */
export const COMMIT_START_AFTER_CALLBACK = 8;
/** Async completion: the consumer's drop resolution settled. */
export const RESOLUTION_SETTLED = 9;
/** Async completion: the authored-presentation barrier settled. */
export const READINESS_SETTLED = 10;
/** Async completion: the landing animation settled. */
export const LANDING_SETTLED = 11;
/** A classified failure, always queued so consumer work keeps FIFO precedence. */
export const FAILED = 12;
/** Checkpoint: `onError` returned; apply the continuation. */
export const CONTINUE_AFTER_ERROR_REPORT = 13;
/** Checkpoint: the terminal callback returned; retire the operation. */
export const RETIRE_AFTER_TERMINAL_CALLBACK = 14;

/** The stable native fields an internal handler is allowed to read. */
export type PointerCoordinates = Pick<
  PointerEvent,
  'pointerId' | 'clientX' | 'clientY'
>;

/** A press admitted during native dispatch, owned by the library. */
export type AdmittedPress = Readonly<{
  pointerId: number;
  x: number;
  y: number;
}>;

const DEFAULT_TIMING: AnimationTiming = { duration: 200, easing: 'ease' };

/* ----------------------------------------------------------------- dispatch */

export function dispatch(
  runtime: DraggableRuntime,
  action: number,
  argument?: unknown,
): void {
  if (runtime.closed) {
    return;
  }

  enqueue(runtime, action, argument);

  if (runtime.running) {
    return;
  }

  drain(
    runtime,
    (queued, value) => {
      handleAction(runtime, queued, value);
    },
    (error) => {
      panicRuntime(runtime, error);
    },
  );
}

function handleAction(
  runtime: DraggableRuntime,
  action: number,
  argument: unknown,
): void {
  switch (action) {
    case POINTER_MOVE:
      handlePointerMove(runtime, argument as PointerCoordinates);
      return;

    case POINTER_UP:
      handlePointerUp(runtime, argument as PointerCoordinates);
      return;

    case ADMIT:
      handleAdmit(runtime, argument as AdmittedPress);
      return;

    case CANCEL:
      handleCancel(runtime, argument as CancelRequest);
      return;

    case POLICY:
      // Live in every phase, settlement included: a landing that has not yet
      // read `landingTiming` may legitimately observe an update.
      runtime.policy = argument as DraggableRuntime['policy'];
      return;

    case CONTROLLED:
      handleControlled(runtime, argument as Point);
      return;

    case INVALIDATE:
      handleInvalidate(runtime, argument as OperationIdentity);
      return;

    case COMMIT_START_AFTER_CALLBACK:
      handleStartCommitted(runtime, argument as OperationIdentity);
      return;

    case RESOLUTION_SETTLED:
      handleResolutionSettled(runtime, argument as ResolutionAttempt);
      return;

    case READINESS_SETTLED:
      handleReadinessSettled(runtime, argument as ReadinessAttempt);
      return;

    case LANDING_SETTLED:
      handleLandingSettled(runtime, argument as LandingAttempt);
      return;

    case FAILED:
      handleFailed(runtime, argument as FailureRecord);
      return;

    case CONTINUE_AFTER_ERROR_REPORT:
      handleErrorReported(runtime, argument as OperationIdentity);
      return;

    case RETIRE_AFTER_TERMINAL_CALLBACK:
      handleFinalized(runtime, argument as OperationIdentity);
      return;

    default:
      throw new Error(`drag: unknown action ${action}`);
  }
}

/* ------------------------------------------------------------------ helpers */

/** Whether the preparing action may still touch anything observable. */
function preparationValid(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): boolean {
  return (
    !runtime.closed &&
    !runtime.destroyRequested &&
    runtime.cancelRequest?.operation !== operation &&
    runtime.current.operation === operation
  );
}

/** Queues a classified failure. Always queued, so consumer work stays ahead. */
function fail(
  runtime: DraggableRuntime,
  operation: OperationIdentity | null,
  stage: FailureCause['stage'],
  error: unknown,
  domain: FreeDropResult | null,
  settle: boolean,
  recovery: number,
): void {
  const record: FailureRecord = {
    operation,
    cause: { stage },
    error,
    domain,
    settle,
    recovery,
  };
  dispatch(runtime, FAILED, record);
}

/** The bounds rect for this motion, cached per `boundsVersion`. */
function readBounds(
  runtime: DraggableRuntime,
  refresh: boolean,
): DOMRectReadOnly | null {
  const { bounds, boundsVersion } = runtime.policy;

  // A caller-supplied function is authoritative every time; caching it would
  // silently freeze a consumer's dynamic bounds.
  if (typeof bounds === 'function') {
    return resolveBounds(bounds, runtime.realm);
  }

  if (refresh || boundsVersion !== runtime.boundsCachedVersion) {
    runtime.boundsCachedVersion = boundsVersion;
    runtime.boundsRect = resolveBounds(bounds, runtime.realm);
  }

  return runtime.boundsRect;
}

/** The committed coordinate space, falling back to the activation-time one. */
function activeMapper(runtime: DraggableRuntime): CoordinateMapper {
  return (
    runtime.policy.coordinateSpace ??
    runtime.current.coordinateSpace ??
    IDENTITY_MAPPER
  );
}

/** Writes the committed delta to the DOM. Post-commit; may fail. */
function presentMotion(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): boolean {
  const { renderer, lift } = runtime;

  if (!renderer || !lift) {
    return true;
  }

  try {
    lift.visual.style.transform = lift.composeXY(
      runtime.current.deltaX,
      runtime.current.deltaY,
    );
    return true;
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_RENDERER_WRITE,
      error,
      null,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return false;
  }
}

/** Invokes `onMove` with public geometry. The last visible step of a motion. */
function invokeMove(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): void {
  const callback = runtime.policy.onMove;

  if (!callback) {
    return;
  }

  const frame = runtime.current;

  try {
    callback(
      geometryOf(
        { x: frame.pointerX, y: frame.pointerY },
        { x: frame.originX, y: frame.originY },
        { x: frame.deltaX, y: frame.deltaY },
        frame.originRect!,
        activeMapper(runtime),
        runtime.realm,
      ),
    );
  } catch (error) {
    if (isCurrent(runtime, operation)) {
      fail(
        runtime,
        operation,
        FAILURE_MOVE,
        error,
        null,
        true,
        runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
      );
    }
  }
}

/* ---------------------------------------------------------------- admission */

function handleAdmit(runtime: DraggableRuntime, press: AdmittedPress): void {
  const { current } = runtime;

  if (current.phase !== DRAG_IDLE) {
    return;
  }

  const operation = nextOperation(runtime);
  const lifetimes = createOperationLifetimes((error) => {
    dispatchDisposerError(runtime, error);
  });

  try {
    armOperationInput(
      runtime.realm,
      lifetimes.motionSignal,
      lifetimes.cancelSignal,
      (event) => {
        receivePointer(runtime, operation, event);
      },
      () => {
        requestCancel(runtime, { type: CANCEL_ESCAPE });
      },
    );
  } catch (error) {
    lifetimes.destroy();
    fail(runtime, null, FAILURE_MOVE, error, null, false, RECOVERY_IMMEDIATE);
    return;
  }

  runtime.lifetimes = lifetimes;

  const next = beginTransition(runtime);
  next.phase = DRAG_PENDING;
  next.operation = operation;
  next.item = runtime.item;
  next.visual = runtime.visual;
  next.pointerId = press.pointerId;
  next.originX = press.x;
  next.originY = press.y;
  next.pointerX = press.x;
  next.pointerY = press.y;
  next.deltaX = 0;
  next.deltaY = 0;
  commitTransition(runtime);
}

/** A disposer failure never replaces the failure that triggered teardown. */
function dispatchDisposerError(
  runtime: DraggableRuntime,
  error: unknown,
): void {
  const { onError } = runtime.config;

  if (onError) {
    try {
      onError(error, {
        cause: { stage: FAILURE_RENDERER_WRITE },
        domain: null,
      });
      return;
    } catch {
      // Fall through to the platform reporter.
    }
  }

  reportError(error);
}

/** Routes one raw session pointer event to its action. */
function receivePointer(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
  event: PointerEvent,
): void {
  if (runtime.current.operation !== operation) {
    return;
  }

  if (event.type === POINTER_MOVE_TYPE) {
    dispatch(runtime, POINTER_MOVE, event);
  } else if (event.type === POINTER_UP_TYPE) {
    dispatch(runtime, POINTER_UP, event);
  } else if (
    event.type === POINTER_CANCEL &&
    event.pointerId === runtime.current.pointerId
  ) {
    requestCancel(runtime, { type: CANCEL_POINTER });
  }
}

/* ------------------------------------------------------------------- motion */

function handlePointerMove(
  runtime: DraggableRuntime,
  event: PointerCoordinates,
): void {
  const { current } = runtime;

  if (event.pointerId !== current.pointerId) {
    return;
  }

  if (current.phase === DRAG_PENDING) {
    const { threshold } = runtime.config;

    if (
      Math.abs(event.clientX - current.originX) >= threshold ||
      Math.abs(event.clientY - current.originY) >= threshold
    ) {
      activate(runtime, event);
    }

    return;
  }

  if (current.phase !== DRAGGING) {
    return;
  }

  const operation = current.operation!;
  const bounds = readBounds(runtime, false);

  const next = beginTransition(runtime);
  next.pointerX = event.clientX;
  next.pointerY = event.clientY;
  applyMotionDelta(next, runtime.policy.axis, bounds);
  commitTransition(runtime);

  if (presentMotion(runtime, operation)) {
    invokeMove(runtime, operation);
  }
}

function handleInvalidate(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): void {
  if (runtime.current.phase !== DRAGGING || !isCurrent(runtime, operation)) {
    return;
  }

  let bounds: DOMRectReadOnly | null;

  try {
    bounds = readBounds(runtime, true);
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_MOVE,
      error,
      null,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return;
  }

  const next = beginTransition(runtime);
  applyMotionDelta(next, runtime.policy.axis, bounds);
  commitTransition(runtime);

  if (presentMotion(runtime, operation)) {
    invokeMove(runtime, operation);
  }
}

function handleControlled(runtime: DraggableRuntime, position: Point): void {
  const { current } = runtime;

  if (current.phase !== DRAGGING) {
    return;
  }

  const operation = current.operation!;
  let viewport: Point;

  try {
    viewport = activeMapper(runtime).toViewport(position);
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_MOVE,
      error,
      null,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return;
  }

  const rect = current.originRect!;
  const next = beginTransition(runtime);
  next.deltaX = viewport.x - rect.left;
  next.deltaY = viewport.y - rect.top;
  commitTransition(runtime);

  if (presentMotion(runtime, operation)) {
    invokeMove(runtime, operation);
  }
}

/* --------------------------------------------------------------- activation */

/**
 * Acquires presentation and capture, commits the activated frame, then hands
 * control to `onStart`. Every acquisition is local until the commit point, so a
 * throw part-way through releases exactly what was taken, in reverse order.
 */
function activate(runtime: DraggableRuntime, event: PointerCoordinates): void {
  const { current } = runtime;
  const operation = current.operation!;
  const lifetimes = runtime.lifetimes!;

  let originRect: DOMRectReadOnly;
  let coordinateSpace: CoordinateMapper;
  let lift: ReturnType<typeof acquireLift> | null = null;
  let releaseCapture: (() => void) | null = null;

  try {
    originRect = runtime.visual.getBoundingClientRect();
    const context = runtime.item.offsetParent;
    coordinateSpace =
      runtime.policy.coordinateSpace ??
      createMapper(
        context instanceof runtime.realm.window.HTMLElement
          ? context
          : runtime.realm.document.documentElement,
        runtime.realm,
      ) ??
      IDENTITY_MAPPER;

    lift = acquireLift(
      runtime.visual,
      runtime.config.lift,
      originRect,
      (delta) => coordinateSpace.deltaFromViewport(delta),
      runtime.realm,
    );
    releaseCapture = acquirePointerCapture(runtime.item, current.pointerId);
  } catch (error) {
    releaseCapture?.();
    lift?.dispose();
    fail(
      runtime,
      operation,
      FAILURE_MOVE,
      error,
      null,
      false,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  // Ownership transfers here; nothing above this line has been published.
  lifetimes.presentation.use(lift.dispose);
  lifetimes.motion.use(releaseCapture);
  runtime.lift = lift;
  runtime.renderer = createDragRenderer(lift);

  const next = beginTransition(runtime);
  next.phase = DRAG_ACTIVATING;
  next.originRect = originRect;
  next.coordinateSpace = coordinateSpace;
  next.pointerX = event.clientX;
  next.pointerY = event.clientY;
  applyMotionDelta(next, runtime.policy.axis, null);
  commitTransition(runtime);

  runtime.invalidation.arm(lifetimes.motionSignal, () => {
    dispatch(runtime, INVALIDATE, operation);
  });

  const { onStart } = runtime.config;

  if (onStart) {
    const frame = runtime.current;

    try {
      onStart(
        geometryOf(
          { x: frame.pointerX, y: frame.pointerY },
          { x: frame.originX, y: frame.originY },
          { x: frame.deltaX, y: frame.deltaY },
          originRect,
          coordinateSpace,
          runtime.realm,
        ),
      );
    } catch (error) {
      if (isCurrent(runtime, operation)) {
        fail(
          runtime,
          operation,
          FAILURE_MOVE,
          error,
          null,
          false,
          RECOVERY_IMMEDIATE,
        );
      }
      return;
    }
  }

  if (preparationValid(runtime, operation)) {
    dispatch(runtime, COMMIT_START_AFTER_CALLBACK, operation);
  }
}

function handleStartCommitted(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): void {
  if (
    runtime.current.phase !== DRAG_ACTIVATING ||
    !isCurrent(runtime, operation)
  ) {
    return;
  }

  const next = beginTransition(runtime);
  next.phase = DRAGGING;
  commitTransition(runtime);

  presentMotion(runtime, operation);
}

/* ------------------------------------------------------------------ release */

/**
 * Release closes motion ingress before final geometry is read, so no later
 * sample, frame or capture event can move the proposal. Cancellation stays
 * armed: the consumer may still abandon an unresolved drop.
 */
function handlePointerUp(
  runtime: DraggableRuntime,
  event: PointerCoordinates,
): void {
  const { current } = runtime;

  if (event.pointerId !== current.pointerId) {
    return;
  }

  if (current.phase === DRAG_PENDING) {
    retireOperation(runtime);
    return;
  }

  if (current.phase !== DRAGGING) {
    return;
  }

  const operation = current.operation!;
  let bounds: DOMRectReadOnly | null;

  try {
    bounds = readBounds(runtime, false);
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_MOVE,
      error,
      null,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return;
  }

  // First commit: the exact release point, and a phase that accepts no more
  // positional input.
  const next = beginTransition(runtime);
  next.phase = DRAG_RELEASING;
  next.pointerX = event.clientX;
  next.pointerY = event.clientY;
  applyMotionDelta(next, runtime.policy.axis, bounds);
  commitTransition(runtime);

  // Post-commit: motion ingress dies, cancellation survives.
  runtime.lifetimes?.closeMotion();

  if (!presentMotion(runtime, operation)) {
    return;
  }

  const frame = runtime.current;
  let proposal;

  try {
    proposal = buildFreeDropProposal(
      frame.item!,
      frame.visual!,
      { x: frame.pointerX, y: frame.pointerY },
      { x: frame.deltaX, y: frame.deltaY },
      frame.originRect!,
      activeMapper(runtime),
      runtime.realm,
    );
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_MOVE,
      error,
      null,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return;
  }

  const withProposal = beginTransition(runtime);
  withProposal.proposal = proposal;
  commitTransition(runtime);

  openResolution(runtime);
}

function openResolution(runtime: DraggableRuntime): void {
  const attempt: ResolutionAttempt = {
    controller: new AbortController(),
    completed: false,
    settlement: null,
    resolution: null,
  };
  runtime.resolution = attempt;

  // The attempt owns its controller; the cancellation stage owns only the
  // guarded registration that aborts it while it is still unsettled.
  runtime.lifetimes?.cancellation.useWhile(
    () => !attempt.completed,
    () => {
      attempt.controller.abort();
    },
  );

  const { request } = runtime.current.proposal!;
  let result: FreeDropResolution | PromiseLike<FreeDropResolution>;

  try {
    result = runtime.config.onDrop(request, {
      signal: attempt.controller.signal,
    });
  } catch (error) {
    settleResolution(runtime, attempt, { ok: false, reason: error });
    return;
  }

  if (isThenable(result)) {
    Promise.resolve(result).then(
      (value) => {
        settleResolution(runtime, attempt, { ok: true, value });
      },
      (reason: unknown) => {
        settleResolution(runtime, attempt, { ok: false, reason });
      },
    );
    return;
  }

  settleResolution(runtime, attempt, { ok: true, value: result });
}

function isThenable(value: unknown): value is PromiseLike<FreeDropResolution> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

function settleResolution(
  runtime: DraggableRuntime,
  attempt: ResolutionAttempt,
  settlement: ResolutionAttempt['settlement'],
): void {
  if (runtime.resolution !== attempt || attempt.completed) {
    return;
  }

  attempt.completed = true;
  attempt.settlement = settlement;
  dispatch(runtime, RESOLUTION_SETTLED, attempt);
}

function isResolution(value: unknown): value is FreeDropResolution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { type } = value as { type?: unknown };
  return type === OUTCOME_ACCEPTED || type === OUTCOME_REJECTED;
}

function handleResolutionSettled(
  runtime: DraggableRuntime,
  attempt: ResolutionAttempt,
): void {
  const { current } = runtime;

  if (
    runtime.resolution !== attempt ||
    current.phase !== DRAG_RELEASING ||
    attempt.settlement === null
  ) {
    return;
  }

  const operation = current.operation!;
  const { settlement } = attempt;

  // Consume once, then drop the payload so a rejected `undefined` and a
  // fulfilled `undefined` can never be confused later.
  attempt.settlement = null;
  runtime.resolution = null;

  if (!settlement.ok) {
    fail(
      runtime,
      operation,
      FAILURE_DROP_RESOLUTION,
      settlement.reason,
      null,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return;
  }

  if (!isResolution(settlement.value)) {
    fail(
      runtime,
      operation,
      FAILURE_DROP_RESOLUTION,
      new Error('drag: onDrop must resolve to an explicit resolution'),
      null,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return;
  }

  const resolution = settlement.value;
  const accepted = resolution.type === OUTCOME_ACCEPTED;
  const proposal = current.proposal!;
  const domain: FreeDropResult = accepted
    ? { type: OUTCOME_ACCEPTED, proposal }
    : { type: OUTCOME_REJECTED, proposal, reason: resolution.reason };

  enterSettlement(
    runtime,
    operation,
    accepted ? OUTCOME_ACCEPTED : OUTCOME_REJECTED,
    domain,
    accepted || !runtime.config.hasHomeTarget
      ? RECOVERY_IMMEDIATE
      : RECOVERY_HOME,
    resolution.presentationReady,
  );
}

/* --------------------------------------------------------------- settlement */

/**
 * Commits the terminal outcome, then opens the two independent gates. Neither
 * gate awaits the other; whichever completes last finalizes.
 */
function enterSettlement(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
  outcome: number,
  domain: FreeDropResult | null,
  recovery: number,
  ready: PromiseLike<void> | undefined,
): void {
  const next = beginTransition(runtime);
  next.phase = DRAG_SETTLING;
  next.outcome = outcome;
  next.domain = domain;
  next.recovery = recovery;
  next.landingDone = recovery === RECOVERY_IMMEDIATE;
  next.authoredPresentationReady = !ready;
  commitTransition(runtime);

  // All input closes here: nothing further can affect the committed outcome.
  runtime.lifetimes?.closeCancellation();

  if (ready) {
    watchReadiness(runtime, operation, ready);
  }

  if (recovery === RECOVERY_HOME) {
    startLanding(runtime, operation);
  }

  advanceSettlement(runtime, operation);
}

function watchReadiness(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
  ready: PromiseLike<void>,
): void {
  const attempt: ReadinessAttempt = {
    dispose: null,
    error: null,
    settled: false,
  };
  runtime.readiness = attempt;

  attempt.dispose = watchPresentationReady(
    ready,
    { operationId: operation.id, resolutionId: 0 },
    runtime.realm,
    (_currency, error) => {
      if (runtime.readiness !== attempt || attempt.settled) {
        return;
      }

      attempt.settled = true;
      attempt.error = error;
      dispatch(runtime, READINESS_SETTLED, attempt);
    },
  );
}

function handleReadinessSettled(
  runtime: DraggableRuntime,
  attempt: ReadinessAttempt,
): void {
  const { current } = runtime;

  if (runtime.readiness !== attempt || current.phase !== DRAG_SETTLING) {
    return;
  }

  const operation = current.operation!;
  const { error } = attempt;
  runtime.readiness = null;
  attempt.dispose = null;
  attempt.error = null;

  if (error !== null) {
    // A readiness failure replaces the settlement while keeping the temporary
    // presentation owned and visible. Old attempts go inert before the
    // replacement is published, and no terminal callback runs afterwards.
    retireAttempts(runtime);
    fail(
      runtime,
      operation,
      FAILURE_PRESENTATION_READY,
      error,
      current.domain,
      true,
      runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    );
    return;
  }

  const next = beginTransition(runtime);
  next.authoredPresentationReady = true;
  commitTransition(runtime);

  advanceSettlement(runtime, operation);
}

function startLanding(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): void {
  const { resolveHomeTarget } = runtime.config;
  const { lift } = runtime;
  const frame = runtime.current;

  if (!resolveHomeTarget || !lift) {
    markLandingDone(runtime);
    return;
  }

  let target: unknown;

  try {
    target = resolveHomeTarget({ item: frame.item!, visual: frame.visual! });
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_HOME_TARGET,
      error,
      frame.domain,
      true,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  if (!isCurrent(runtime, operation)) {
    return;
  }

  if (!isValidHomeTarget(target)) {
    fail(
      runtime,
      operation,
      FAILURE_HOME_TARGET,
      new Error('drag: invalid home target'),
      frame.domain,
      true,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  let timing: AnimationTiming;

  try {
    timing = runtime.policy.landingTiming?.() ?? DEFAULT_TIMING;
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_LANDING_TIMING,
      error,
      frame.domain,
      true,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  const plan = homeLandingPlan(
    target,
    { x: frame.deltaX, y: frame.deltaY },
    frame.originRect!,
  );
  const attempt: LandingAttempt = { runner: null, error: null };
  runtime.landing = attempt;

  try {
    attempt.runner = createLandingRunner(
      lift,
      plan,
      { operationId: operation.id, landingId: 0 },
      timing,
      runtime.realm,
      () => {
        if (runtime.landing === attempt) {
          dispatch(runtime, LANDING_SETTLED, attempt);
        }
      },
      (_currency, error) => {
        if (runtime.landing === attempt) {
          attempt.error = error;
          dispatch(runtime, LANDING_SETTLED, attempt);
        }
      },
    );
  } catch (error) {
    runtime.landing = null;
    fail(
      runtime,
      operation,
      FAILURE_ANIMATION_CREATE,
      error,
      frame.domain,
      true,
      RECOVERY_IMMEDIATE,
    );
  }
}

function handleLandingSettled(
  runtime: DraggableRuntime,
  attempt: LandingAttempt,
): void {
  const { current } = runtime;

  if (runtime.landing !== attempt || current.phase !== DRAG_SETTLING) {
    return;
  }

  const operation = current.operation!;
  const { error, runner } = attempt;
  runtime.landing = null;
  attempt.error = null;

  if (error !== null) {
    attempt.runner = null;
    fail(
      runtime,
      operation,
      FAILURE_LANDING_INTERRUPTED,
      error,
      current.domain,
      true,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  try {
    runner?.pin();
  } catch (pinError) {
    attempt.runner = null;
    fail(
      runtime,
      operation,
      FAILURE_LANDING_PIN,
      pinError,
      current.domain,
      true,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  attempt.runner = null;
  markLandingDone(runtime);
  advanceSettlement(runtime, operation);
}

function markLandingDone(runtime: DraggableRuntime): void {
  const next = beginTransition(runtime);
  next.landingDone = true;
  commitTransition(runtime);
}

/** Finalizes once both gates are terminal. */
function advanceSettlement(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): void {
  const { current } = runtime;

  if (
    current.phase !== DRAG_SETTLING ||
    !current.landingDone ||
    !current.authoredPresentationReady ||
    !isCurrent(runtime, operation)
  ) {
    return;
  }

  const { outcome, domain } = current;

  const next = beginTransition(runtime);
  next.phase = DRAG_FINALIZING;
  commitTransition(runtime);

  // Temporary presentation goes before the terminal callback, so the consumer
  // observes its own authored DOM rather than the lift.
  runtime.lifetimes?.releasePresentation();
  runtime.lift = null;
  runtime.renderer = null;
  retireAttempts(runtime);

  const { onFinish, onCancel } = runtime.config;
  let callback: (() => void) | undefined;

  if (outcome === OUTCOME_FAILED || !domain) {
    // A failed settlement reports through `onError` only.
    callback = undefined;
  } else if (domain.type === OUTCOME_ACCEPTED) {
    callback = onFinish ? () => onFinish(domain) : undefined;
  } else {
    callback = onCancel ? () => onCancel(domain) : undefined;
  }

  if (callback) {
    try {
      callback();
    } catch (error) {
      if (isCurrent(runtime, operation)) {
        fail(
          runtime,
          operation,
          FAILURE_MOVE,
          error,
          domain,
          false,
          RECOVERY_IMMEDIATE,
        );
      }
      return;
    }
  }

  if (isCurrent(runtime, operation)) {
    dispatch(runtime, RETIRE_AFTER_TERMINAL_CALLBACK, operation);
  }
}

function handleFinalized(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): void {
  if (!isCurrent(runtime, operation)) {
    return;
  }

  retireOperation(runtime);
}

/* ------------------------------------------------------------ cancellation */

/**
 * Latches the first valid cancellation for the current operation. Idle, closed
 * and non-cancellable phases are no-ops that leave no latch behind, so a stray
 * `cancel()` can never poison a later operation.
 */
export function requestCancel(
  runtime: DraggableRuntime,
  reason: CancellationReason,
): void {
  if (runtime.closed) {
    return;
  }

  const { operation, phase } = runtime.current;

  if (
    operation === null ||
    phase === DRAG_IDLE ||
    phase === DRAG_SETTLING ||
    phase === DRAG_REPORTING ||
    phase === DRAG_FINALIZING
  ) {
    return;
  }

  if (runtime.cancelRequest?.operation === operation) {
    return;
  }

  const request: CancelRequest = { operation, reason };
  runtime.cancelRequest = request;
  dispatch(runtime, CANCEL, request);
}

function handleCancel(runtime: DraggableRuntime, request: CancelRequest): void {
  const { current } = runtime;

  if (
    runtime.cancelRequest !== request ||
    current.operation !== request.operation
  ) {
    return;
  }

  const { phase } = current;
  runtime.cancelRequest = null;

  if (phase === DRAG_PENDING) {
    // Nothing was ever presented; abandon silently.
    retireOperation(runtime);
    return;
  }

  if (
    phase !== DRAG_ACTIVATING &&
    phase !== DRAGGING &&
    phase !== DRAG_RELEASING
  ) {
    return;
  }

  const next = beginTransition(runtime);
  next.cancelReason = request.reason;
  commitTransition(runtime);

  enterSettlement(
    runtime,
    request.operation,
    OUTCOME_CANCELED,
    {
      type: OUTCOME_CANCELED,
      reason: request.reason,
      proposal: current.proposal,
    },
    runtime.config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
    undefined,
  );
}

/* ---------------------------------------------------------------- failures */

function handleFailed(runtime: DraggableRuntime, record: FailureRecord): void {
  if (record.operation !== null && !isCurrent(runtime, record.operation)) {
    return;
  }

  if (record.operation === null) {
    // Nothing was committed; report and stay idle.
    reportFailure(runtime, record);
    retireOperation(runtime);
    return;
  }

  const next = beginTransition(runtime);
  next.phase = DRAG_REPORTING;
  next.failureStage = record.cause.stage;
  next.failureError = record.error;
  commitTransition(runtime);

  reportFailure(runtime, record);

  if (isCurrent(runtime, record.operation)) {
    runtime.pendingContinuation = record;
    dispatch(runtime, CONTINUE_AFTER_ERROR_REPORT, record.operation);
  }
}

function reportFailure(runtime: DraggableRuntime, record: FailureRecord): void {
  const { onError } = runtime.config;

  if (!onError) {
    reportError(record.error);
    return;
  }

  try {
    onError(record.error, { cause: record.cause, domain: record.domain });
  } catch (callbackError) {
    reportError(callbackError);
  }
}

function handleErrorReported(
  runtime: DraggableRuntime,
  operation: OperationIdentity,
): void {
  const record = runtime.pendingContinuation;
  runtime.pendingContinuation = null;

  if (
    !record ||
    record.operation !== operation ||
    runtime.current.phase !== DRAG_REPORTING ||
    !isCurrent(runtime, operation)
  ) {
    return;
  }

  if (!record.settle) {
    retireOperation(runtime);
    return;
  }

  enterSettlement(
    runtime,
    operation,
    OUTCOME_FAILED,
    record.domain,
    record.recovery,
    undefined,
  );
}
