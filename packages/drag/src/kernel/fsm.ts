/**
 * The drag session as an explicit, DOM-free finite state machine.
 *
 * {@link transition} is the single authority that decides whether an event is
 * meaningful in the current state and which state follows. It is pure: given the
 * same state, event, and config it returns the same next state, performing no DOM
 * work. All effects (pointer capture, lifting, animation, callbacks) are derived
 * from state changes by the session layer.
 *
 * Native `PointerEvent` objects are accepted directly as input, discriminated on
 * `event.type`; lifecycle signals that have no DOM event are small tagged objects.
 */
import type { Point } from './types.ts';

export const IDLE = 'idle';
export const PENDING = 'pending';
export const DRAGGING = 'dragging';
export const AWAITING_COMMIT = 'awaiting-commit';
export const SETTLING = 'settling';

// Pointer event types the machine reacts to.
const POINTER_DOWN = 'pointerdown';
const POINTER_MOVE = 'pointermove';
const POINTER_UP = 'pointerup';
const POINTER_CANCEL = 'pointercancel';
const LOST_POINTER_CAPTURE = 'lostpointercapture';

// Non-pointer lifecycle signal types.
export const ESCAPE = 'escape';
export const COMMIT_OBSERVED = 'commit-observed';
export const DROP_ACCEPTED = 'drop-accepted';
export const DROP_REJECTED = 'drop-rejected';
export const ANIMATION_FINISHED = 'animation-finished';
export const ANIMATION_CANCELED = 'animation-canceled';
export const DESTROY = 'destroy';

// Settle results.
export const ACCEPTED = 'accepted';
export const REJECTED = 'rejected';
export const CANCELED = 'canceled';

/** How a settling session is resolving. */
export type SettleResult = typeof ACCEPTED | typeof REJECTED | typeof CANCELED;

export type IdleState = Readonly<{ type: typeof IDLE }>;

/** A pointer is pressed but has not yet travelled far enough to lift. */
export type PendingState = Readonly<{
  type: typeof PENDING;
  pointerId: number;
  origin: Point;
  latest: Point;
}>;

/** A live drag: the visual is lifted and tracking the owning pointer. */
export type DraggingState = Readonly<{
  type: typeof DRAGGING;
  pointerId: number;
  origin: Point;
  latest: Point;
}>;

/** The pointer was released; the drop proposal is being decided. */
export type AwaitingCommitState = Readonly<{ type: typeof AWAITING_COMMIT }>;

/** A final outcome is known and the visual is animating to rest. */
export type SettlingState = Readonly<{
  type: typeof SETTLING;
  result: SettleResult;
}>;

export type DragSessionState =
  | IdleState
  | PendingState
  | DraggingState
  | AwaitingCommitState
  | SettlingState;

export const IDLE_STATE: IdleState = { type: IDLE };

/** Non-pointer lifecycle signals fed into the same transition mechanism. */
export type DragSignal = Readonly<
  | { type: typeof ESCAPE }
  | { type: typeof COMMIT_OBSERVED }
  | { type: typeof DROP_ACCEPTED }
  | { type: typeof DROP_REJECTED }
  | { type: typeof ANIMATION_FINISHED }
  | { type: typeof ANIMATION_CANCELED }
  | { type: typeof DESTROY }
>;

export type DragSessionEvent = PointerEvent | DragSignal;

/**
 * The `type` values of every non-pointer signal. Used to discriminate signals
 * from pointer events structurally rather than via `instanceof PointerEvent`, so
 * the transition is testable in Node with plain event-shaped objects.
 */
const SIGNAL_TYPES: ReadonlySet<string> = new Set<DragSignal['type']>([
  ESCAPE,
  COMMIT_OBSERVED,
  DROP_ACCEPTED,
  DROP_REJECTED,
  ANIMATION_FINISHED,
  ANIMATION_CANCELED,
  DESTROY,
]);

/** Tuning that the pure transition needs but must not read from the DOM. */
export type FsmConfig = Readonly<{
  /** Pointer travel, in viewport pixels, before a press becomes a drag. */
  threshold: number;
}>;

function isPointerEvent(event: DragSessionEvent): event is PointerEvent {
  return !SIGNAL_TYPES.has(event.type);
}

/** Whether a pointer event belongs to the pointer that owns the session. */
function doesOwnSession(
  state: PendingState | DraggingState,
  event: PointerEvent,
): boolean {
  return event.pointerId === state.pointerId;
}

function pointOf(event: PointerEvent): Point {
  return { x: event.clientX, y: event.clientY };
}

/** Whether travel from `origin` to `latest` has crossed the activation gate. */
function hasCrossedThreshold(
  origin: Point,
  latest: Point,
  threshold: number,
): boolean {
  return (
    Math.abs(latest.x - origin.x) >= threshold ||
    Math.abs(latest.y - origin.y) >= threshold
  );
}

function transitionIdle(
  state: IdleState,
  event: DragSessionEvent,
): DragSessionState {
  // A `pointerdown` reaching the machine is already eligibility-checked by the
  // entry (primary button, handle, tracked item); idle simply arms tracking.
  if (isPointerEvent(event) && event.type === POINTER_DOWN) {
    const point = pointOf(event);
    return {
      type: PENDING,
      pointerId: event.pointerId,
      origin: point,
      latest: point,
    };
  }

  return state;
}

function transitionPending(
  state: PendingState,
  event: DragSessionEvent,
  config: FsmConfig,
): DragSessionState {
  if (isPointerEvent(event)) {
    if (!doesOwnSession(state, event)) {
      return state;
    }

    switch (event.type) {
      case POINTER_MOVE: {
        const latest = pointOf(event);

        if (hasCrossedThreshold(state.origin, latest, config.threshold)) {
          return {
            type: DRAGGING,
            pointerId: state.pointerId,
            origin: state.origin,
            latest,
          };
        }

        return { ...state, latest };
      }

      // A press that never crossed the threshold is a plain click: back to idle.
      case POINTER_UP:
      case POINTER_CANCEL:
      case LOST_POINTER_CAPTURE:
        return IDLE_STATE;

      default:
        return state;
    }
  }

  // Escape or teardown before activation simply disarms tracking.
  if (event.type === ESCAPE || event.type === DESTROY) {
    return IDLE_STATE;
  }

  return state;
}

function transitionDragging(
  state: DraggingState,
  event: DragSessionEvent,
): DragSessionState {
  if (isPointerEvent(event)) {
    if (!doesOwnSession(state, event)) {
      return state;
    }

    switch (event.type) {
      case POINTER_MOVE:
        return { ...state, latest: pointOf(event) };

      // Normal release: hand off to the consumer's drop decision.
      case POINTER_UP:
        return { type: AWAITING_COMMIT };

      case POINTER_CANCEL:
      case LOST_POINTER_CAPTURE:
        return { type: SETTLING, result: CANCELED };

      default:
        return state;
    }
  }

  if (event.type === ESCAPE || event.type === DESTROY) {
    return { type: SETTLING, result: CANCELED };
  }

  return state;
}

function transitionAwaitingCommit(
  state: AwaitingCommitState,
  event: DragSessionEvent,
): DragSessionState {
  if (isPointerEvent(event)) {
    // Pointer input while awaiting an external decision is meaningless.
    return state;
  }

  switch (event.type) {
    case DROP_ACCEPTED:
      return { type: SETTLING, result: ACCEPTED };
    case DROP_REJECTED:
      return { type: SETTLING, result: REJECTED };
    case ESCAPE:
    case DESTROY:
      return { type: SETTLING, result: CANCELED };
    case COMMIT_OBSERVED:
    case ANIMATION_FINISHED:
    case ANIMATION_CANCELED:
    default:
      return state;
  }
}

function transitionSettling(
  state: SettlingState,
  event: DragSessionEvent,
): DragSessionState {
  // Landing owns its own teardown; late browser events (a duplicate
  // `lostpointercapture` after `pointerup`) leave the machine unchanged. Only
  // the landing's own completion signal returns the machine to idle.
  if (!isPointerEvent(event) && event.type === ANIMATION_FINISHED) {
    return IDLE_STATE;
  }

  return state;
}

/**
 * The single transition authority. Deterministic and free of DOM effects.
 *
 * An event that defines no transition from the current state leaves the state
 * unchanged, which keeps duplicate and foreign events safe.
 */
export function transition(
  state: DragSessionState,
  event: DragSessionEvent,
  config: FsmConfig,
): DragSessionState {
  switch (state.type) {
    case IDLE:
      return transitionIdle(state, event);
    case PENDING:
      return transitionPending(state, event, config);
    case DRAGGING:
      return transitionDragging(state, event);
    case AWAITING_COMMIT:
      return transitionAwaitingCommit(state, event);
    case SETTLING:
      return transitionSettling(state, event);
    default:
      return state;
  }
}
