/**
 * The two transactional state frames for one sortable controller.
 *
 * Same contract as the draggable frames: `current` is committed truth, `draft`
 * is a reusable candidate, and a transition copies, mutates, then swaps. The
 * copy is shallow, so every field is a scalar, an immutable value, or
 * replace-on-write.
 *
 * The collection snapshot qualifies: `collection.replace()` publishes a fresh
 * frozen-by-convention object rather than mutating the previous one, so both
 * frames may reference the same snapshot safely.
 */
import {
  OUTCOME_ACCEPTED,
  RECOVERY_IMMEDIATE,
  type CancellationReason,
} from '../../kernel/protocol.ts';
import type {
  CollectionSnapshot,
  Insertion,
  ReorderProposal,
  ReorderTransactionResult,
} from '../options.ts';

export const SORTABLE_IDLE = 0;
/** Admitted; below the activation threshold (pointer) or awaiting arm (keyboard). */
export const SORTABLE_PENDING = 1;
/** Presentation acquired and committed; `onStart` in flight. */
export const SORTABLE_ACTIVATING = 2;
/** Active pointer drag with coalesced spatial work. */
export const SORTABLE_ACTIVE = 3;
/**
 * Input closed. Final geometry has been resolved from the release point and the
 * consumer is resolving the proposal. No later sample can move it.
 */
export const SORTABLE_RELEASING = 4;
/** Outcome committed; awaiting the landing and readiness gates. */
export const SORTABLE_SETTLING = 5;
/** `onError` in flight. */
export const SORTABLE_REPORTING = 6;
/** Presentation released; terminal callback in flight. */
export const SORTABLE_FINALIZING = 7;

export const NO_POINTER = -1;

/** One operation's identity, compared by object identity. */
export type OperationIdentity = Readonly<{ id: number }>;

export type SortableStateFrame = {
  phase: number;
  operation: OperationIdentity | null;
  /** Keyboard operations skip spatial tracking entirely. */
  keyboard: boolean;
  item: HTMLElement | null;
  visual: HTMLElement | null;
  pointerId: number;

  /** The snapshot this operation is reasoning about. */
  snapshot: CollectionSnapshot | null;

  /** Grab point and latest committed pointer position, viewport space. */
  originX: number;
  originY: number;
  pointerX: number;
  pointerY: number;

  /** The committed destination gap, or `null` before one is known. */
  insertion: Insertion | null;
  /** The immutable, version-stabilized proposal, once built. */
  proposal: ReorderProposal | null;

  /** `OUTCOME_*`. Meaningful from `SORTABLE_SETTLING` onward. */
  outcome: number;
  domain: ReorderTransactionResult | null;
  /** `RECOVERY_*`. */
  recovery: number;

  landingDone: boolean;
  authoredPresentationReady: boolean;

  failureStage: number;
  failureError: unknown;
  cancelReason: CancellationReason | null;
};

/** Both frames come from here, so they share one shape and one hidden class. */
export function createStateFrame(): SortableStateFrame {
  return {
    phase: SORTABLE_IDLE,
    operation: null,
    keyboard: false,
    item: null,
    visual: null,
    pointerId: NO_POINTER,
    snapshot: null,
    originX: 0,
    originY: 0,
    pointerX: 0,
    pointerY: 0,
    insertion: null,
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
 * Clears every reference-bearing field while preserving the fixed shape. A
 * retired frame must not pin collection snapshots, DOM elements or proposals.
 */
export function resetStateFrame(frame: SortableStateFrame): void {
  frame.phase = SORTABLE_IDLE;
  frame.operation = null;
  frame.keyboard = false;
  frame.item = null;
  frame.visual = null;
  frame.pointerId = NO_POINTER;
  frame.snapshot = null;
  frame.insertion = null;
  frame.proposal = null;
  frame.domain = null;
  frame.failureError = null;
  frame.cancelReason = null;
  frame.landingDone = false;
  frame.authoredPresentationReady = false;
}

/** Copies `current` into the reusable draft and returns it for mutation. */
export function beginTransition(runtime: {
  current: SortableStateFrame;
  draft: SortableStateFrame;
}): SortableStateFrame {
  Object.assign(runtime.draft, runtime.current);
  return runtime.draft;
}

/** Publishes the draft by swapping the two frame references. Cannot throw. */
export function commitTransition(runtime: {
  current: SortableStateFrame;
  draft: SortableStateFrame;
}): void {
  const previous = runtime.current;
  runtime.current = runtime.draft;
  runtime.draft = previous;
}
