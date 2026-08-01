/**
 * The sortable domain vocabulary: the collection model, the insertion, the
 * proposal, the consumer resolution, and the terminal results.
 *
 * The public unions here are **narrowed, with string discriminants** (D-31,
 * F-41). Discriminating a result must not require importing an internal outcome
 * constant, and each arm carries what probe 1's preserved contract carried:
 * version, both indices, identity neighbours, a rejection reason and a
 * cancellation stage.
 *
 * The numeric `outcome`/`recovery` constants below are the opposite: they are
 * behavior-private frame state, never handed to a consumer.
 */
import type { CancelStage, FailureStage } from '../kernel/failures.ts';
import type { MaybePromise } from '../kernel/types.ts';

// ---------------------------------------------------------------------------
// The collection
// ---------------------------------------------------------------------------

/** An immutable ordered snapshot of the collection, and its version. */
export type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

/**
 * A proposed insertion gap in the **destination view** — the snapshot minus the
 * dragged item.
 *
 * `before` and `after` are real identity neighbours, not just an index: they are
 * what `reconcileCollection` tests for survival, and what lets `movePlaceholder`
 * express a start gap at all (D-27, F-31).
 */
export type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

// ---------------------------------------------------------------------------
// The proposal
// ---------------------------------------------------------------------------

/** A proposed reorder, carrying both indices and stable neighbour identity. */
export type ReorderRequest = Readonly<{
  item: HTMLElement;
  version: number;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/**
 * Exactly one immutable proposal per operation, built after motion is closed
 * (I-12). It carries the snapshot it was computed against, so a consumer can
 * reason about the ordering the request refers to.
 */
export type ReorderProposal = Readonly<{
  snapshot: CollectionSnapshot;
  request: ReorderRequest;
}>;

// ---------------------------------------------------------------------------
// The consumer resolution
// ---------------------------------------------------------------------------

export type AcceptedReorderResolution = Readonly<{
  type: 'accepted';
  /**
   * Returned, **not awaited**. Awaiting it inside `onReorder` would serialize
   * the consumer's render ahead of the landing animation instead of overlapping
   * it, which is the whole point of two independent gates.
   */
  presentationReady?: PromiseLike<void>;
}>;

export type RejectedReorderResolution = Readonly<{
  type: 'rejected';
  reason?: unknown;
  presentationReady?: PromiseLike<void>;
}>;

/**
 * The explicit consumer response. **Acceptance is never inferred** — not from
 * callback silence, not from DOM mutation, not from collection order, not from
 * elapsed time. Neither is rejection.
 */
export type ReorderResolution =
  | AcceptedReorderResolution
  | RejectedReorderResolution;

export const ReorderResolution = {
  accept: (presentationReady?: PromiseLike<void>): AcceptedReorderResolution =>
    presentationReady
      ? { type: 'accepted', presentationReady }
      : { type: 'accepted' },
  reject: (
    reason?: unknown,
    presentationReady?: PromiseLike<void>,
  ): RejectedReorderResolution =>
    presentationReady
      ? { type: 'rejected', reason, presentationReady }
      : { type: 'rejected', reason },
} as const;

export type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => MaybePromise<ReorderResolution>;

/**
 * Whether a fulfilled round-trip value is an explicit resolution. A value that
 * is not becomes `FAILURE_REORDER_RESOLUTION`, never a silent accept.
 */
export function isReorderResolution(
  value: unknown,
): value is ReorderResolution {
  const type = (value as ReorderResolution | null | undefined)?.type;

  return type === 'accepted' || type === 'rejected';
}

// ---------------------------------------------------------------------------
// The terminal results
// ---------------------------------------------------------------------------

export type AcceptedReorderResult = Readonly<{
  type: 'accepted';
  proposal: ReorderProposal;
}>;

export type NoopReorderResult = Readonly<{
  type: 'noop';
  proposal: ReorderProposal;
}>;

export type RejectedReorderResult = Readonly<{
  type: 'rejected';
  reason: unknown;
  proposal: ReorderProposal;
}>;

export type CanceledReorderResult = Readonly<{
  type: 'canceled';
  reason: unknown;
  stage: CancelStage;
  /** Null when the operation was abandoned before a proposal existed. */
  proposal: ReorderProposal | null;
}>;

export type ReorderTransactionResult =
  | AcceptedReorderResult
  | NoopReorderResult
  | RejectedReorderResult
  | CanceledReorderResult;

/** A no-op drop finishes; it is never a rejection and never a home recovery. */
export type SortableFinishResult = AcceptedReorderResult | NoopReorderResult;
export type SortableCancelResult =
  | RejectedReorderResult
  | CanceledReorderResult;

/**
 * What `onError` receives alongside the error.
 *
 * Phase 9 decides whether this type belongs to `drag.js` (the export table says
 * so) or stays behavior-shaped; `domain` is a sortable result today.
 */
export type DragErrorContext = Readonly<{
  stage: FailureStage;
  domain: ReorderTransactionResult | null;
}>;

// ---------------------------------------------------------------------------
// Behavior-private frame state
// ---------------------------------------------------------------------------

export const OUTCOME_ACCEPTED = 80;
export const OUTCOME_REJECTED = 81;
export const OUTCOME_NOOP = 82;
export const OUTCOME_CANCELED = 83;
export const OUTCOME_FAILED = 84;

/**
 * Where the lifted visual goes, which is **not** the same question as whether
 * the authored presentation is final (`authoredReady`). Only a destination
 * recovery re-anchors: home deliberately returns the placeholder to the grab
 * slot, and immediate deliberately leaves it where it stands.
 */
export const RECOVERY_DESTINATION = 90;
export const RECOVERY_HOME = 91;
export const RECOVERY_IMMEDIATE = 92;

/** Why the behavior cancelled an operation of its own accord. */
export const CANCEL_COLLECTION_INVALIDATED = 'sortable:collection-invalidated';
export const CANCEL_ITEM_REMOVED = 'sortable:item-removed';
