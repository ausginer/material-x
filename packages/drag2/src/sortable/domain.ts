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
import type { CancelStage } from '../kernel/failures.ts';

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

/**
 * **The construction rule for an {@link Insertion}, and its only owner** (F-91,
 * D-119): the gap at `index` of `destination` — a snapshot minus its dragged
 * item — carrying the two elements that gap sits between.
 *
 * `?? null` at both ends *is* the rule rather than a convenience. A read off
 * either end of the destination view is a **start** or an **end** gap, and
 * those two shapes are what `movePlaceholder` anchors on and what
 * `reconcileCollection` tests for survival.
 *
 * **A pure helper, never a seam** — F-7's disposition, applied here to the
 * value F-91 found unowned. It takes an array and an index, holds no state and
 * needs no instant, so every caller passes **whichever destination view it
 * already holds**: the locally filtered one in `keyboardInsertion`, the axis
 * cache's maintained one in `y()` and `xy()`, `destinationOf`'s in
 * `collection.ts`. That is what leaves the three derivations of the *view*
 * untouched — they exist at three different instants with three amounts of live
 * state, and this rule is indifferent to which of them produced the array.
 *
 * `homeInsertion` is the one site that does not call it, and deliberately: it
 * evaluates the same rule over a destination view it never materializes, so
 * that seeding home costs no array. The identity is proved rather than argued —
 * `tests/sortable/insertion.browser.test.ts`.
 */
export function insertionAt(
  destination: readonly HTMLElement[],
  index: number,
  version: number,
): Insertion {
  return {
    version,
    index,
    before: destination[index - 1] ?? null,
    after: destination[index] ?? null,
  };
}

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

export type AcceptedReorderResolution = Readonly<{ type: 'accepted' }>;

export type RejectedReorderResolution = Readonly<{
  type: 'rejected';
  reason?: unknown;
}>;

/**
 * The explicit consumer response. **Acceptance is never inferred** — not from
 * callback silence, not from DOM mutation, not from collection order, not from
 * elapsed time. Neither is rejection.
 */
export type ReorderResolution =
  | AcceptedReorderResolution
  | RejectedReorderResolution;

/**
 * **Both factories lose their options argument with the protocol** (D-41).
 * Acceptance declares nothing, because there is nothing to declare: a consumer
 * that must render before the drop lands `await`s its own commit inside
 * `onReorder`, which is what a Promise-returning resolver already expresses.
 */
export const ReorderResolution = {
  accept: (): AcceptedReorderResolution => ({ type: 'accepted' }),
  reject: (reason?: unknown): RejectedReorderResolution => ({
    type: 'rejected',
    reason,
  }),
} as const;

/**
 * The consumer's verdict on one proposed reorder.
 *
 * The return type is written out rather than routed through a `MaybePromise<T>`
 * alias: that alias is a generic utility with no domain meaning, and exporting
 * it to make the public signature resolvable would put a helper on the frozen
 * surface for documentation's sake. `PromiseLike`, not `Promise`, because the
 * kernel reads `then` exactly once and never assumes a native promise.
 */
export type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => ReorderResolution | PromiseLike<ReorderResolution>;

/**
 * Whether a fulfilled round-trip value is an explicit resolution. A value that
 * is not becomes `FAILURE_RESOLUTION`, never a silent accept.
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

/**
 * ~~`SortableFinishResult`~~ and ~~`SortableCancelResult`~~ are **deleted**
 * (D-62). They were `Accepted | Noop` and `Rejected | Canceled` — partitions of
 * the union above that existed for one reason, that there were two callback
 * signatures to type. With one `onEnd` there is one type, and the arm a
 * consumer must handle is the discriminant rather than the callback it arrived
 * through.
 */

/**
 * What `onError` receives alongside the error.
 *
 * **One field since D-64.** ~~`stage` is kernel vocabulary~~ — and that is
 * exactly why it left: the consumer receives a `DraggableError` carrying
 * a coarse `code`, and never an internal pipeline seam. What remains is purely
 * the sortable half, which is what keeps this type on `sortable.js`: `domain`
 * is a sortable result, and the kernel tier has its own entry precisely so a
 * future free-drag consumer never reaches the sortable behavior.
 *
 * **`domain` may be non-null here** (D-60). The channels are orthogonal: one
 * operation may produce `onError` *and* a terminal, so a handler must not read
 * an error as proof that the drop had no result.
 *
 * **Qualified, and the sortable's rename is deliberate** (D-75). ~~`DragErrorContext`~~
 * gave the first behavior the unqualified word by arrival order; free drag's
 * context carries its own result, so the two entries need **different
 * structures under one name** — which is the only condition that qualifies a
 * name. The package has no released consumer, so symmetry costs one type name
 * now and cannot be had later.
 */
export type SortableErrorContext = Readonly<{
  domain: ReorderTransactionResult | null;
}>;

// ---------------------------------------------------------------------------
// Behavior-private frame state
// ---------------------------------------------------------------------------

// ~~`OUTCOME_ACCEPTED` … `OUTCOME_FAILED`, 80–84~~ **removed 2026-08-22.** They
// existed only to name writes to `SortableFramePart.outcome`, which had no
// reader after D-62/D-66 deleted the one contract 04 named. The `RECOVERY_*`
// numbers below keep their values: they are read.

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
