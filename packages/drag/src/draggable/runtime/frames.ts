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
  IDLE,
  NO_POINTER as NO_POINTER_VALUE,
  type OperationIdentity,
} from '../../kernel/lifecycle.ts';
import {
  OUTCOME_ACCEPTED,
  RECOVERY_IMMEDIATE,
  type CancellationReason,
} from '../../kernel/protocol.ts';
import type { CoordinateMapper } from '../../kernel/types.ts';
import type { FreeDropProposal, FreeDropResult } from '../options.ts';

export type { OperationIdentity } from '../../kernel/lifecycle.ts';

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
    phase: IDLE,
    operation: null,
    item: null,
    visual: null,
    pointerId: NO_POINTER_VALUE,
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
  frame.phase = IDLE;
  frame.operation = null;
  frame.item = null;
  frame.visual = null;
  frame.pointerId = NO_POINTER_VALUE;
  frame.originRect = null;
  frame.coordinateSpace = null;
  frame.proposal = null;
  frame.domain = null;
  frame.failureError = null;
  frame.cancelReason = null;
  frame.landingDone = false;
  frame.authoredPresentationReady = false;
}
