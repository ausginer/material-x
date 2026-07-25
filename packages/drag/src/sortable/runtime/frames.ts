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
  IDLE,
  NO_POINTER as NO_POINTER_VALUE,
  type OperationIdentity,
} from '../../kernel/lifecycle.ts';
import { OUTCOME_ACCEPTED, RECOVERY_IMMEDIATE } from '../../kernel/protocol.ts';
import type {
  CollectionSnapshot,
  Insertion,
  ReorderProposal,
  ReorderTransactionResult,
} from '../options.ts';

export type { OperationIdentity } from '../../kernel/lifecycle.ts';

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
};

/** Both frames come from here, so they share one shape and one hidden class. */
export function createStateFrame(): SortableStateFrame {
  return {
    phase: IDLE,
    operation: null,
    keyboard: false,
    item: null,
    visual: null,
    pointerId: NO_POINTER_VALUE,
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
  };
}

/**
 * Clears every reference-bearing field while preserving the fixed shape. A
 * retired frame must not pin collection snapshots, DOM elements or proposals.
 */
export function resetStateFrame(frame: SortableStateFrame): void {
  frame.phase = IDLE;
  frame.operation = null;
  frame.keyboard = false;
  frame.item = null;
  frame.visual = null;
  frame.pointerId = NO_POINTER_VALUE;
  frame.snapshot = null;
  frame.insertion = null;
  frame.proposal = null;
  frame.domain = null;
  frame.landingDone = false;
  frame.authoredPresentationReady = false;
}
