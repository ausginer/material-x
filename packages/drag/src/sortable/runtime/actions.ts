// oxlint-disable no-use-before-define -- declarations hoist; grouped by lifecycle stage.
/*
 * The state machine is mutually recursive by nature: `dispatch` reaches every
 * handler, and handlers dispatch continuations. Function declarations hoist, so
 * ordering them is a presentation choice, and grouping by lifecycle stage reads
 * better here than a topological sort would.
 */

/**
 * Every sortable transition, as direct imperative code.
 *
 * The shape mirrors the draggable runtime. What differs is sortable's own
 * domain: two admission paths, a placeholder whose position is committed state,
 * a packed geometry cache, one coalesced spatial frame, and a release that
 * resolves its final insertion synchronously from the release point.
 */
import { createLandingRunner } from '../../kernel/animation.ts';
import { createMapper } from '../../kernel/coordinate.ts';
import { createFrameTask } from '../../kernel/invalidation.ts';
import { createOperationLifetimes } from '../../kernel/lifetimes.ts';
import {
  acquirePointerCapture,
  armOperationInput,
} from '../../kernel/pointer.ts';
import { watchPresentationReady } from '../../kernel/presentation-ready.ts';
import { acquireLift, LIFT_FAITHFUL } from '../../kernel/presentation.ts';
import {
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ESCAPE,
  CANCEL_ITEM_REMOVED,
  CANCEL_POINTER,
  FAILURE_ACTIVATION,
  FAILURE_ANIMATION_CREATE,
  FAILURE_HOME_TARGET,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_PIN,
  FAILURE_LANDING_TIMING,
  FAILURE_PLACEHOLDER_TARGET,
  FAILURE_PRESENTATION_READY,
  FAILURE_RENDERER_WRITE,
  FAILURE_REORDER_RESOLUTION,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_NO_OP,
  OUTCOME_REJECTED,
  POINTER_CANCEL,
  POINTER_MOVE as POINTER_MOVE_TYPE,
  POINTER_UP as POINTER_UP_TYPE,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  type CancellationReason,
  type FailureCause,
} from '../../kernel/protocol.ts';
import { drain, enqueue } from '../../kernel/queue.ts';
import type { AnimationTiming, Point } from '../../kernel/types.ts';
import { CHANGE_REBASE, reconcileCollection } from '../collection-policy.ts';
import { currentInsertion, resolveSpatialInsertion } from '../insertion.ts';
import { destinationPlan, homePlan } from '../landing.ts';
import {
  REORDER_CANCELED_AT_CONSUMER,
  REORDER_CANCELED_AT_PROPOSAL,
  REORDER_REJECTION_CONSUMER,
  type CollectionSnapshot,
  type Insertion,
  type ReorderProposal,
  type ReorderResolution,
  type ReorderTransactionResult,
} from '../options.ts';
import { createAnchor, insertPlaceholder } from '../placeholder.ts';
import { markRectIndexDirty } from '../rect-index.ts';
import { buildReorderProposal } from '../request.ts';
import {
  beginTransition,
  commitTransition,
  SORTABLE_ACTIVATING,
  SORTABLE_ACTIVE,
  SORTABLE_FINALIZING,
  SORTABLE_IDLE,
  SORTABLE_PENDING,
  SORTABLE_RELEASING,
  SORTABLE_REPORTING,
  SORTABLE_SETTLING,
  type OperationIdentity,
} from './frames.ts';
import {
  isCurrent,
  nextOperation,
  nextSpatial,
  panicRuntime,
  retireAttempts,
  retireOperation,
  type CancelRequest,
  type FailureContinuation as FailureRecord,
  type LandingAttempt,
  type ReadinessAttempt,
  type ResolutionAttempt,
  type SortableRuntime,
  type SpatialAttempt,
} from './runtime.ts';

/* ------------------------------------------------------------------ actions */

export const ADMIT_POINTER = 1;
export const ADMIT_KEYBOARD = 2;
export const POINTER_MOVE = 3;
export const POINTER_UP = 4;
export const CANCEL = 5;
/** A replacement collection snapshot, already shallow-copied by the collection. */
export const COLLECTION = 6;
/** One coalesced spatial frame came due. */
export const SPATIAL_FRAME = 7;
export const COMMIT_START_AFTER_CALLBACK = 8;
export const RESOLUTION_SETTLED = 9;
export const READINESS_SETTLED = 10;
export const LANDING_SETTLED = 11;
export const FAILED = 12;
export const CONTINUE_AFTER_ERROR_REPORT = 13;
export const RETIRE_AFTER_TERMINAL_CALLBACK = 14;

export type PointerCoordinates = Pick<
  PointerEvent,
  'pointerId' | 'clientX' | 'clientY'
>;

/** A press admitted during native dispatch, owned by the library. */
export type AdmittedPress = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  snapshot: CollectionSnapshot;
  pointerId: number;
  x: number;
  y: number;
}>;

/** A keyboard command admitted during native dispatch. */
export type AdmittedCommand = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  snapshot: CollectionSnapshot;
  insertion: Insertion;
  x: number;
  y: number;
}>;

const DEFAULT_TIMING: AnimationTiming = { duration: 200, easing: 'ease' };

/* ----------------------------------------------------------------- dispatch */

export function dispatch(
  runtime: SortableRuntime,
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
  runtime: SortableRuntime,
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

    case SPATIAL_FRAME:
      handleSpatialFrame(runtime, argument as SpatialAttempt);
      return;

    case ADMIT_POINTER:
      handleAdmitPointer(runtime, argument as AdmittedPress);
      return;

    case ADMIT_KEYBOARD:
      handleAdmitKeyboard(runtime, argument as AdmittedCommand);
      return;

    case CANCEL:
      handleCancel(runtime, argument as CancelRequest);
      return;

    case COLLECTION:
      handleCollection(runtime, argument as CollectionSnapshot);
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

function preparationValid(
  runtime: SortableRuntime,
  operation: OperationIdentity,
): boolean {
  return (
    !runtime.closed &&
    !runtime.destroyRequested &&
    runtime.cancelRequest?.operation !== operation &&
    runtime.current.operation === operation
  );
}

function fail(
  runtime: SortableRuntime,
  operation: OperationIdentity | null,
  stage: FailureCause['stage'],
  error: unknown,
  domain: ReorderTransactionResult | null,
  settle: boolean,
  recovery: number,
): void {
  dispatch(runtime, FAILED, {
    operation,
    cause: { stage },
    error,
    domain,
    settle,
    recovery,
  } satisfies FailureRecord);
}

/**
 * A cancellation result carrying whatever proposal exists at that point.
 * `atConsumer` distinguishes a gesture abandoned before a proposal was offered
 * from one abandoned while the consumer was resolving it.
 */
function cancelResult(
  reason: CancellationReason,
  atConsumer: boolean,
  proposal: ReorderProposal | null,
): ReorderTransactionResult {
  return {
    type: OUTCOME_CANCELED,
    reason,
    at: atConsumer
      ? REORDER_CANCELED_AT_CONSUMER
      : REORDER_CANCELED_AT_PROPOSAL,
    proposal,
  };
}

/** Writes the committed pointer delta to the DOM. Post-commit; may fail. */
function presentMotion(
  runtime: SortableRuntime,
  operation: OperationIdentity,
): boolean {
  const { lift } = runtime;

  if (!lift) {
    return true;
  }

  const frame = runtime.current;

  try {
    lift.visual.style.transform = lift.composeXY(
      frame.pointerX - frame.originX,
      frame.pointerY - frame.originY,
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
      RECOVERY_HOME,
    );
    return false;
  }
}

/** Moves the placeholder to the committed gap and dirties the geometry cache. */
function placeInsertion(
  runtime: SortableRuntime,
  operation: OperationIdentity,
  insertion: Insertion,
): boolean {
  const { placeholder } = runtime;

  if (!placeholder) {
    return true;
  }

  try {
    const reference = insertion.after;
    const unchanged =
      reference === placeholder.element ||
      placeholder.element.nextSibling === reference;

    if (!unchanged) {
      placeholder.placeBefore(reference);
      markRectIndexDirty(runtime.rects);
    }

    return true;
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_PLACEHOLDER_TARGET,
      error,
      null,
      true,
      RECOVERY_HOME,
    );
    return false;
  }
}

/* ---------------------------------------------------------------- admission */

function handleAdmitPointer(
  runtime: SortableRuntime,
  press: AdmittedPress,
): void {
  const operation = beginOperation(runtime);

  if (!operation) {
    return;
  }

  const next = beginTransition(runtime);
  next.phase = SORTABLE_PENDING;
  next.operation = operation;
  next.keyboard = false;
  next.item = press.item;
  next.visual = press.visual;
  next.snapshot = press.snapshot;
  next.pointerId = press.pointerId;
  next.originX = press.x;
  next.originY = press.y;
  next.pointerX = press.x;
  next.pointerY = press.y;
  next.insertion = null;
  commitTransition(runtime);
}

function handleAdmitKeyboard(
  runtime: SortableRuntime,
  command: AdmittedCommand,
): void {
  const operation = beginOperation(runtime);

  if (!operation) {
    return;
  }

  const next = beginTransition(runtime);
  next.phase = SORTABLE_PENDING;
  next.operation = operation;
  next.keyboard = true;
  next.item = command.item;
  next.visual = command.visual;
  next.snapshot = command.snapshot;
  next.pointerId = -1;
  next.originX = command.x;
  next.originY = command.y;
  next.pointerX = command.x;
  next.pointerY = command.y;
  // The command's gap is authoritative; no spatial resolution ever runs.
  next.insertion = command.insertion;
  commitTransition(runtime);

  // A keyboard command is a complete one-slot move, not an interactive drag,
  // so it activates immediately rather than waiting for a threshold.
  activate(runtime);
}

/** Mints identity and arms input, or returns `null` when admission fails. */
function beginOperation(runtime: SortableRuntime): OperationIdentity | null {
  if (runtime.current.phase !== SORTABLE_IDLE) {
    return null;
  }

  const operation = nextOperation(runtime);
  const lifetimes = createOperationLifetimes((error) => {
    reportDisposerError(runtime, error);
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
    fail(
      runtime,
      null,
      FAILURE_ACTIVATION,
      error,
      null,
      false,
      RECOVERY_IMMEDIATE,
    );
    return null;
  }

  runtime.lifetimes = lifetimes;
  runtime.frame = createFrameTask(runtime.realm, (attempt: SpatialAttempt) => {
    dispatch(runtime, SPATIAL_FRAME, attempt);
  });
  return operation;
}

function reportDisposerError(runtime: SortableRuntime, error: unknown): void {
  const { onError } = runtime.config;

  if (onError) {
    try {
      onError(error, {
        cause: { stage: FAILURE_PLACEHOLDER_TARGET },
        domain: null,
      });
      return;
    } catch {
      // Fall through to the platform reporter.
    }
  }

  reportError(error);
}

function receivePointer(
  runtime: SortableRuntime,
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

/* --------------------------------------------------------------- activation */

/**
 * Acquires the lift, the placeholder and pointer capture, commits the activated
 * frame, then hands control to `onStart`. Every acquisition stays local until
 * the commit point, so a throw part-way through releases exactly what was taken,
 * in reverse order.
 */
function activate(runtime: SortableRuntime): void {
  const { current } = runtime;
  const operation = current.operation!;
  const lifetimes = runtime.lifetimes!;
  const item = current.item!;
  const visual = current.visual!;
  const snapshot = current.snapshot!;

  let originRect: DOMRectReadOnly;
  let lift: ReturnType<typeof acquireLift> | null = null;
  let placeholder: ReturnType<typeof insertPlaceholder> | null = null;
  let releaseCapture: (() => void) | null = null;

  try {
    originRect = visual.getBoundingClientRect();
    const context = item.offsetParent;
    const mapper = createMapper(
      context instanceof runtime.realm.window.HTMLElement
        ? context
        : runtime.realm.document.documentElement,
      runtime.realm,
    );

    lift = acquireLift(
      visual,
      LIFT_FAITHFUL,
      originRect,
      (delta) => mapper.deltaFromViewport(delta),
      runtime.realm,
    );

    const anchor = createAnchor(
      { createPlaceholder: runtime.config.createPlaceholder },
      runtime.realm,
      item,
      visual,
      originRect,
    );

    try {
      placeholder = insertPlaceholder(anchor, item);
    } catch (error) {
      anchor.remove();
      throw error;
    }

    if (!current.keyboard) {
      releaseCapture = acquirePointerCapture(item, current.pointerId);
    }
  } catch (error) {
    releaseCapture?.();
    placeholder?.dispose();
    lift?.dispose();
    fail(
      runtime,
      operation,
      FAILURE_ACTIVATION,
      error,
      null,
      false,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  // A consumer placeholder factory can reenter; if it cancelled or destroyed,
  // roll back rather than publishing.
  if (!preparationValid(runtime, operation)) {
    releaseCapture?.();
    placeholder.dispose();
    lift.dispose();
    return;
  }

  // Ownership transfers here; nothing above this line has been published.
  lifetimes.presentation.use(placeholder.dispose);
  lifetimes.presentation.use(lift.dispose);

  if (releaseCapture) {
    lifetimes.motion.use(releaseCapture);
  }

  runtime.lift = lift;
  runtime.placeholder = placeholder;
  runtime.originRect = originRect;
  markRectIndexDirty(runtime.rects);

  runtime.invalidation.arm(lifetimes.motionSignal, () => {
    markRectIndexDirty(runtime.rects);
  });

  const next = beginTransition(runtime);
  next.phase = SORTABLE_ACTIVATING;
  // A pointer operation starts from the placeholder's home slot; a keyboard
  // command already carries its destination gap.
  next.insertion =
    current.insertion ??
    currentInsertion(placeholder, snapshot.items, item, snapshot.version);
  commitTransition(runtime);

  const { onStart } = runtime.config;

  if (onStart) {
    try {
      onStart(item);
    } catch (error) {
      if (isCurrent(runtime, operation)) {
        fail(
          runtime,
          operation,
          FAILURE_ACTIVATION,
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
  runtime: SortableRuntime,
  operation: OperationIdentity,
): void {
  const { current } = runtime;

  if (current.phase !== SORTABLE_ACTIVATING || !isCurrent(runtime, operation)) {
    return;
  }

  if (current.keyboard) {
    // The command is complete on arrival: resolve it as a release immediately.
    release(runtime, current.pointerX, current.pointerY);
    return;
  }

  const next = beginTransition(runtime);
  next.phase = SORTABLE_ACTIVE;
  commitTransition(runtime);

  presentMotion(runtime, operation);
}

/* ------------------------------------------------------------------- motion */

function handlePointerMove(
  runtime: SortableRuntime,
  event: PointerCoordinates,
): void {
  const { current } = runtime;

  if (current.keyboard || event.pointerId !== current.pointerId) {
    return;
  }

  if (current.phase === SORTABLE_PENDING) {
    const next = beginTransition(runtime);
    next.pointerX = event.clientX;
    next.pointerY = event.clientY;
    commitTransition(runtime);

    const { threshold } = runtime.config;

    if (
      Math.abs(event.clientX - current.originX) >= threshold ||
      Math.abs(event.clientY - current.originY) >= threshold
    ) {
      activate(runtime);
    }

    return;
  }

  if (current.phase !== SORTABLE_ACTIVE) {
    return;
  }

  const operation = current.operation!;

  const next = beginTransition(runtime);
  next.pointerX = event.clientX;
  next.pointerY = event.clientY;
  commitTransition(runtime);

  if (!presentMotion(runtime, operation)) {
    return;
  }

  // Spatial work is latest-wins: a newer attempt supersedes any frame still
  // pending, so an outdated hit test can never commit an insertion.
  const attempt = nextSpatial(runtime);
  runtime.pendingSpatial = attempt;
  runtime.frame?.schedule(attempt);
}

function handleSpatialFrame(
  runtime: SortableRuntime,
  attempt: SpatialAttempt,
): void {
  const { current } = runtime;

  if (
    runtime.pendingSpatial !== attempt ||
    current.phase !== SORTABLE_ACTIVE ||
    !runtime.placeholder
  ) {
    return;
  }

  runtime.pendingSpatial = null;
  const operation = current.operation!;
  const snapshot = current.snapshot!;
  let resolved: Insertion | null;

  try {
    resolved = resolveSpatialInsertion(
      runtime.rects,
      runtime.placeholder,
      snapshot.items,
      current.item!,
      runtime.config.getVisual,
      { x: current.pointerX, y: current.pointerY },
      snapshot.version,
    );
  } catch (error) {
    fail(
      runtime,
      operation,
      FAILURE_RENDERER_WRITE,
      error,
      null,
      true,
      RECOVERY_HOME,
    );
    return;
  }

  if (!resolved) {
    return;
  }

  const next = beginTransition(runtime);
  next.insertion = resolved;
  commitTransition(runtime);

  placeInsertion(runtime, operation, resolved);
}

/* ------------------------------------------------------------------ release */

function handlePointerUp(
  runtime: SortableRuntime,
  event: PointerCoordinates,
): void {
  const { current } = runtime;

  if (current.keyboard || event.pointerId !== current.pointerId) {
    return;
  }

  if (current.phase === SORTABLE_PENDING) {
    retireOperation(runtime);
    return;
  }

  if (current.phase !== SORTABLE_ACTIVE) {
    return;
  }

  release(runtime, event.clientX, event.clientY);
}

/**
 * Closes motion ingress before final geometry is read, then resolves the
 * insertion, builds the proposal and enters consumer resolution — all
 * synchronously, so no pending frame or later sample can move the result.
 * Cancellation stays armed throughout.
 */
function release(runtime: SortableRuntime, x: number, y: number): void {
  const { current } = runtime;
  const operation = current.operation!;

  // First commit: the exact release point and a phase that accepts no more
  // positional input.
  const opening = beginTransition(runtime);
  opening.phase = SORTABLE_RELEASING;
  opening.pointerX = x;
  opening.pointerY = y;
  commitTransition(runtime);

  // Post-commit: motion ingress and pending frame work die; cancellation lives.
  runtime.frame?.cancel();
  runtime.pendingSpatial = null;
  runtime.lifetimes?.closeMotion();

  if (!current.keyboard && !presentMotion(runtime, operation)) {
    return;
  }

  const snapshot = runtime.current.snapshot!;
  const item = runtime.current.item!;
  let { insertion } = runtime.current;

  // A keyboard command already owns its gap. A pointer release re-measures from
  // the release point against fresh geometry.
  if (!runtime.current.keyboard && runtime.placeholder) {
    markRectIndexDirty(runtime.rects);

    try {
      insertion =
        resolveSpatialInsertion(
          runtime.rects,
          runtime.placeholder,
          snapshot.items,
          item,
          runtime.config.getVisual,
          { x, y },
          snapshot.version,
        ) ??
        insertion ??
        currentInsertion(
          runtime.placeholder,
          snapshot.items,
          item,
          snapshot.version,
        );
    } catch (error) {
      fail(
        runtime,
        operation,
        FAILURE_REORDER_RESOLUTION,
        error,
        null,
        true,
        RECOVERY_HOME,
      );
      return;
    }
  }

  if (!insertion) {
    fail(
      runtime,
      operation,
      FAILURE_REORDER_RESOLUTION,
      new Error('drag: could not resolve a destination insertion'),
      null,
      true,
      RECOVERY_HOME,
    );
    return;
  }

  const build = buildReorderProposal(snapshot, item, insertion);

  if (!build) {
    fail(
      runtime,
      operation,
      FAILURE_REORDER_RESOLUTION,
      new Error('drag: could not build a reorder proposal'),
      null,
      true,
      RECOVERY_HOME,
    );
    return;
  }

  const committed = beginTransition(runtime);
  committed.insertion = insertion;
  committed.proposal = build.proposal;
  commitTransition(runtime);

  if (build.noop) {
    // Still a completed transaction, reported through `onFinish`.
    enterSettlement(
      runtime,
      operation,
      OUTCOME_NO_OP,
      { type: OUTCOME_NO_OP, proposal: build.proposal },
      RECOVERY_IMMEDIATE,
      undefined,
    );
    return;
  }

  if (!placeInsertion(runtime, operation, insertion)) {
    return;
  }

  openResolution(runtime);
}

function openResolution(runtime: SortableRuntime): void {
  const attempt: ResolutionAttempt = {
    controller: new AbortController(),
    completed: false,
    settlement: null,
    resolution: null,
  };
  runtime.resolution = attempt;

  runtime.lifetimes?.cancellation.useWhile(
    () => !attempt.completed,
    () => {
      attempt.controller.abort();
    },
  );

  const { request } = runtime.current.proposal!;
  let result: ReorderResolution | PromiseLike<ReorderResolution>;

  try {
    result = runtime.config.onReorder(request, {
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

function isThenable(value: unknown): value is PromiseLike<ReorderResolution> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

function settleResolution(
  runtime: SortableRuntime,
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

function isResolution(value: unknown): value is ReorderResolution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { type } = value as { type?: unknown };
  return type === OUTCOME_ACCEPTED || type === OUTCOME_REJECTED;
}

function handleResolutionSettled(
  runtime: SortableRuntime,
  attempt: ResolutionAttempt,
): void {
  const { current } = runtime;

  if (
    runtime.resolution !== attempt ||
    current.phase !== SORTABLE_RELEASING ||
    attempt.settlement === null
  ) {
    return;
  }

  const operation = current.operation!;
  const proposal = current.proposal!;
  const { settlement } = attempt;

  // Consume once, then drop the payload so a rejected `undefined` and a
  // fulfilled `undefined` stay distinguishable.
  attempt.settlement = null;
  runtime.resolution = null;

  if (!settlement.ok) {
    fail(
      runtime,
      operation,
      FAILURE_REORDER_RESOLUTION,
      settlement.reason,
      null,
      true,
      RECOVERY_HOME,
    );
    return;
  }

  if (!isResolution(settlement.value)) {
    fail(
      runtime,
      operation,
      FAILURE_REORDER_RESOLUTION,
      new Error('drag: onReorder must resolve to an explicit resolution'),
      null,
      true,
      RECOVERY_HOME,
    );
    return;
  }

  const resolution = settlement.value;
  const accepted = resolution.type === OUTCOME_ACCEPTED;
  const domain: ReorderTransactionResult = accepted
    ? { type: OUTCOME_ACCEPTED, proposal }
    : {
        type: OUTCOME_REJECTED,
        reason: REORDER_REJECTION_CONSUMER,
        detail: resolution.reason,
        proposal,
      };

  enterSettlement(
    runtime,
    operation,
    accepted ? OUTCOME_ACCEPTED : OUTCOME_REJECTED,
    domain,
    accepted ? RECOVERY_DESTINATION : RECOVERY_HOME,
    resolution.presentationReady,
  );
}

/* --------------------------------------------------------------- collection */

/**
 * Applies a replacement snapshot. See the Phase 1 sortable collection matrix:
 * the operation either rebases onto the surviving identity gap or ends.
 */
function handleCollection(
  runtime: SortableRuntime,
  snapshot: CollectionSnapshot,
): void {
  const { current } = runtime;
  const { phase } = current;

  if (phase === SORTABLE_IDLE || current.operation === null) {
    return;
  }

  const { operation } = current;
  const item = current.item!;
  const present = snapshot.items.includes(item);

  if (phase === SORTABLE_PENDING) {
    if (!present) {
      retireOperation(runtime);
    }

    return;
  }

  if (phase === SORTABLE_ACTIVATING) {
    if (!present) {
      fail(
        runtime,
        operation,
        FAILURE_ACTIVATION,
        new Error('drag: sortable item was removed during activation'),
        null,
        false,
        RECOVERY_IMMEDIATE,
      );
    }

    return;
  }

  if (phase !== SORTABLE_ACTIVE) {
    // From release onward the transaction is decided; the collection is the
    // consumer's to reconcile.
    return;
  }

  if (!present) {
    enterSettlement(
      runtime,
      operation,
      OUTCOME_CANCELED,
      cancelResult({ type: CANCEL_ITEM_REMOVED }, false, null),
      RECOVERY_IMMEDIATE,
      undefined,
    );
    return;
  }

  const change = reconcileCollection(snapshot, item, current.insertion);

  if (change.type !== CHANGE_REBASE) {
    enterSettlement(
      runtime,
      operation,
      OUTCOME_CANCELED,
      cancelResult({ type: CANCEL_COLLECTION_INVALIDATED }, false, null),
      RECOVERY_IMMEDIATE,
      undefined,
    );
    return;
  }

  const next = beginTransition(runtime);
  next.snapshot = snapshot;
  next.insertion = change.insertion;
  commitTransition(runtime);

  // A version change forces the geometry cache to rebuild on the next frame.
  markRectIndexDirty(runtime.rects);
  placeInsertion(runtime, operation, change.insertion);
}

/* --------------------------------------------------------------- settlement */

function enterSettlement(
  runtime: SortableRuntime,
  operation: OperationIdentity,
  outcome: number,
  domain: ReorderTransactionResult | null,
  recovery: number,
  ready: PromiseLike<void> | undefined,
): void {
  const next = beginTransition(runtime);
  next.phase = SORTABLE_SETTLING;
  next.outcome = outcome;
  next.domain = domain;
  next.recovery = recovery;
  next.landingDone = recovery === RECOVERY_IMMEDIATE;
  next.authoredPresentationReady = !ready;
  commitTransition(runtime);

  runtime.frame?.cancel();
  runtime.pendingSpatial = null;
  runtime.lifetimes?.closeCancellation();

  if (ready) {
    watchReadiness(runtime, operation, ready);
  }

  if (recovery !== RECOVERY_IMMEDIATE) {
    startLanding(runtime, operation, recovery);
  }

  advanceSettlement(runtime, operation);
}

function watchReadiness(
  runtime: SortableRuntime,
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
  runtime: SortableRuntime,
  attempt: ReadinessAttempt,
): void {
  const { current } = runtime;

  if (runtime.readiness !== attempt || current.phase !== SORTABLE_SETTLING) {
    return;
  }

  const operation = current.operation!;
  const { error } = attempt;
  runtime.readiness = null;
  attempt.dispose = null;
  attempt.error = null;

  if (error !== null) {
    // Sortable's replacement recovery is immediate: the placeholder is already
    // where the outcome put it, so there is nothing left to animate. No terminal
    // callback runs afterwards.
    retireAttempts(runtime);
    fail(
      runtime,
      operation,
      FAILURE_PRESENTATION_READY,
      error,
      current.domain,
      true,
      RECOVERY_IMMEDIATE,
    );
    return;
  }

  const next = beginTransition(runtime);
  next.authoredPresentationReady = true;
  commitTransition(runtime);

  advanceSettlement(runtime, operation);
}

function startLanding(
  runtime: SortableRuntime,
  operation: OperationIdentity,
  recovery: number,
): void {
  const { lift, placeholder, originRect } = runtime;
  const frame = runtime.current;

  if (!lift || !placeholder || !originRect || !lift.visual.isConnected) {
    markLandingDone(runtime);
    return;
  }

  const delta: Point = {
    x: frame.pointerX - frame.originX,
    y: frame.pointerY - frame.originY,
  };
  let plan;

  try {
    if (recovery === RECOVERY_HOME) {
      // The visual returns to its grab origin, so the placeholder must be back
      // in the home slot before the plan is measured.
      placeholder.returnHome();
      markRectIndexDirty(runtime.rects);
      plan = homePlan(delta);
    } else {
      plan = destinationPlan(placeholder.rect(), originRect, delta);
    }
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

  let timing: AnimationTiming;

  try {
    timing = runtime.config.landingTiming?.() ?? DEFAULT_TIMING;
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
  runtime: SortableRuntime,
  attempt: LandingAttempt,
): void {
  const { current } = runtime;

  if (runtime.landing !== attempt || current.phase !== SORTABLE_SETTLING) {
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

function markLandingDone(runtime: SortableRuntime): void {
  const next = beginTransition(runtime);
  next.landingDone = true;
  commitTransition(runtime);
}

function advanceSettlement(
  runtime: SortableRuntime,
  operation: OperationIdentity,
): void {
  const { current } = runtime;

  if (
    current.phase !== SORTABLE_SETTLING ||
    !current.landingDone ||
    !current.authoredPresentationReady ||
    !isCurrent(runtime, operation)
  ) {
    return;
  }

  const { outcome, domain } = current;

  const next = beginTransition(runtime);
  next.phase = SORTABLE_FINALIZING;
  commitTransition(runtime);

  // The placeholder and the lift go before the terminal callback, so the
  // consumer observes its own authored DOM rather than the drag presentation.
  runtime.lifetimes?.releasePresentation();
  runtime.lift = null;
  runtime.renderer = null;
  runtime.placeholder = null;
  retireAttempts(runtime);

  const { onFinish, onCancel } = runtime.config;
  let callback: (() => void) | undefined;

  if (outcome === OUTCOME_FAILED || !domain) {
    callback = undefined;
  } else if (
    domain.type === OUTCOME_ACCEPTED ||
    domain.type === OUTCOME_NO_OP
  ) {
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
          FAILURE_REORDER_RESOLUTION,
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
  runtime: SortableRuntime,
  operation: OperationIdentity,
): void {
  if (!isCurrent(runtime, operation)) {
    return;
  }

  retireOperation(runtime);
}

/* ------------------------------------------------------------ cancellation */

export function requestCancel(
  runtime: SortableRuntime,
  reason: CancellationReason,
): void {
  if (runtime.closed) {
    return;
  }

  const { operation, phase } = runtime.current;

  if (
    operation === null ||
    phase === SORTABLE_IDLE ||
    phase === SORTABLE_SETTLING ||
    phase === SORTABLE_REPORTING ||
    phase === SORTABLE_FINALIZING
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

function handleCancel(runtime: SortableRuntime, request: CancelRequest): void {
  const { current } = runtime;

  if (
    runtime.cancelRequest !== request ||
    current.operation !== request.operation
  ) {
    return;
  }

  const { phase } = current;
  runtime.cancelRequest = null;

  if (phase === SORTABLE_PENDING) {
    // Nothing was presented; abandon silently.
    retireOperation(runtime);
    return;
  }

  if (
    phase !== SORTABLE_ACTIVATING &&
    phase !== SORTABLE_ACTIVE &&
    phase !== SORTABLE_RELEASING
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
    cancelResult(
      request.reason,
      phase === SORTABLE_RELEASING,
      current.proposal,
    ),
    RECOVERY_HOME,
    undefined,
  );
}

/* ---------------------------------------------------------------- failures */

function handleFailed(runtime: SortableRuntime, record: FailureRecord): void {
  if (record.operation !== null && !isCurrent(runtime, record.operation)) {
    return;
  }

  if (record.operation === null) {
    reportFailure(runtime, record);
    retireOperation(runtime);
    return;
  }

  const next = beginTransition(runtime);
  next.phase = SORTABLE_REPORTING;
  next.failureStage = record.cause.stage;
  next.failureError = record.error;
  commitTransition(runtime);

  reportFailure(runtime, record);

  if (isCurrent(runtime, record.operation)) {
    runtime.pendingContinuation = record;
    dispatch(runtime, CONTINUE_AFTER_ERROR_REPORT, record.operation);
  }
}

function reportFailure(runtime: SortableRuntime, record: FailureRecord): void {
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
  runtime: SortableRuntime,
  operation: OperationIdentity,
): void {
  const record = runtime.pendingContinuation;
  runtime.pendingContinuation = null;

  if (
    !record ||
    record.operation !== operation ||
    runtime.current.phase !== SORTABLE_REPORTING ||
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
