/**
 * The two transactional state frames.
 *
 * `current` is the committed source of truth. `draft` is a reusable candidate:
 * a transition shallow-copies `current` into it, mutates it, then publishes by
 * swapping the two references. No transition allocates a state object.
 *
 * Because the copy is shallow, every field here must be a scalar, an immutable
 * value, or replace-on-write. Nothing in a frame may be mutated in place while
 * both frames still reference it.
 */
import {
  OUTCOME_ACCEPTED,
  RECOVERY_IMMEDIATE,
  type CancellationReason,
} from '../../kernel/protocol.ts';
import type { CoordinateMapper } from '../../kernel/types.ts';
import type { FreeDropProposal, FreeDropResult } from '../options.ts';

export const DRAG_IDLE = 0;
/** Admitted; below the activation threshold. */
export const DRAG_PENDING = 1;
/** Threshold crossed; presentation acquired, `onStart` in flight. */
export const DRAG_ACTIVATING = 2;
/** Active free drag. */
export const DRAGGING = 3;
/** Released: motion ingress closed, geometry final, consumer resolving. */
export const DRAG_RELEASING = 4;
/** Outcome committed; awaiting the landing and readiness gates. */
export const DRAG_SETTLING = 5;
/** `onError` in flight. */
export const DRAG_REPORTING = 6;
/** Presentation released; terminal callback in flight. */
export const DRAG_FINALIZING = 7;

/** Sentinel for "no pointer owns this frame". Real pointer ids are >= 0. */
export const NO_POINTER = -1;

/**
 * One operation's identity. A bare object: identity comparison is cheaper and
 * more robust than a counter, and it cannot collide across controllers.
 */
export type OperationIdentity = Readonly<{ id: number }>;

export type DragStateFrame = {
  phase: number;
  operation: OperationIdentity | null;
  item: HTMLElement | null;
  visual: HTMLElement | null;
  pointerId: number;

  /** Pointer position at grab, viewport space. */
  originX: number;
  originY: number;
  /** Latest committed pointer position, viewport space. */
  pointerX: number;
  pointerY: number;
  /** Committed motion delta, viewport space, axis-constrained and clamped. */
  deltaX: number;
  deltaY: number;

  originRect: DOMRectReadOnly | null;
  coordinateSpace: CoordinateMapper | null;

  /** The immutable release proposal, once built. */
  proposal: FreeDropProposal | null;

  /** `OUTCOME_*`. Meaningful from `DRAG_SETTLING` onward. */
  outcome: number;
  domain: FreeDropResult | null;
  /** `RECOVERY_*`. */
  recovery: number;

  /** Settlement gate: landing finished or was skipped. */
  landingDone: boolean;
  /** Settlement gate: the consumer's authored presentation is ready. */
  authoredPresentationReady: boolean;

  /** `FAILURE_*` stage, meaningful in `DRAG_REPORTING`. */
  failureStage: number;
  failureError: unknown;
  /** Why the operation was cancelled, when it was. */
  cancelReason: CancellationReason | null;
};

/**
 * Both frames are built here, so they share one hidden class and one fixed
 * own-key set. `Object.assign` only overwrites keys present on the source, so a
 * fixed shape is what stops a stale key surviving into a later candidate.
 */
export function createStateFrame(): DragStateFrame {
  return {
    phase: DRAG_IDLE,
    operation: null,
    item: null,
    visual: null,
    pointerId: NO_POINTER,
    originX: 0,
    originY: 0,
    pointerX: 0,
    pointerY: 0,
    deltaX: 0,
    deltaY: 0,
    originRect: null,
    coordinateSpace: null,
    proposal: null,
    outcome: OUTCOME_ACCEPTED,
    domain: null,
    recovery: RECOVERY_IMMEDIATE,
    landingDone: false,
    authoredPresentationReady: false,
    failureStage: 0,
    failureError: null,
    cancelReason: null,
  };
}

/**
 * Clears every reference-bearing field while preserving the fixed shape, so a
 * retired frame cannot pin DOM elements, consumer results or rectangles.
 * Scalars are left alone: they retain nothing and the next transition overwrites
 * them.
 */
export function resetStateFrame(frame: DragStateFrame): void {
  frame.phase = DRAG_IDLE;
  frame.operation = null;
  frame.item = null;
  frame.visual = null;
  frame.pointerId = NO_POINTER;
  frame.originRect = null;
  frame.coordinateSpace = null;
  frame.proposal = null;
  frame.domain = null;
  frame.failureError = null;
  frame.cancelReason = null;
  frame.landingDone = false;
  frame.authoredPresentationReady = false;
}

/** Copies `current` into the reusable draft and returns it for mutation. */
export function beginTransition(runtime: {
  current: DragStateFrame;
  draft: DragStateFrame;
}): DragStateFrame {
  Object.assign(runtime.draft, runtime.current);
  return runtime.draft;
}

/** Publishes the draft by swapping the two frame references. Cannot throw. */
export function commitTransition(runtime: {
  current: DragStateFrame;
  draft: DragStateFrame;
}): void {
  const previous = runtime.current;
  runtime.current = runtime.draft;
  runtime.draft = previous;
}
