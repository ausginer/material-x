/**
 * The sortable domain vocabulary: the collection model, the insertion, the
 * proposal, the consumer resolution, and the terminal results.
 *
 * The public unions here are narrowed, with string discriminants (F-41):
 * discriminating a result must not require importing an internal outcome
 * constant.
 *
 * The numeric `recovery` constants below are the opposite: they are
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
 * `before` and `after` are real identity neighbours, not just an index: they
 * are what a reconciliation tests for survival, and what lets a start gap be
 * expressed at all.
 */
export type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/**
 * **The construction rule for an {@link Insertion}**: the gap at `index` of
 * `destination` — a snapshot minus its dragged item — carrying the two elements
 * that gap sits between, in `snapshot`.
 *
 * **`index` is a gap position in `destination`, `0 .. destination.length`**:
 * `0` is before the first element, `destination.length` is after the last.
 * This **derives and does not validate** — `insertionAt(view, 999, snapshot)`
 * returns an insertion carrying `999` and `null` at both ends, and nothing
 * downstream checks either.
 *
 * `null` at both ends *is* the rule rather than a convenience: a read off
 * either end of the destination view is a **start** or an **end** gap, and
 * those two shapes are what a placeholder anchors on.
 *
 * **The version comes from the snapshot the gap is a gap of**, rather than as a
 * bare number, so a stale version is not a value a caller can supply.
 *
 * **A pure helper.** It takes an array and an index, holds no state and needs
 * no instant, so a caller passes whichever destination view it already holds.
 * The destination view is a **parameter** because deriving it here would
 * allocate an array per spatial resolution, on a pointer-move path that exists
 * to avoid exactly that.
 */
export function insertionAt(
  destination: readonly HTMLElement[],
  index: number,
  snapshot: CollectionSnapshot,
): Insertion {
  return {
    version: snapshot.version,
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
 * Exactly one immutable proposal per operation, built after motion is closed.
 * It carries the snapshot it was computed against, so a consumer can reason
 * about the ordering the request refers to.
 */
export type ReorderProposal = Readonly<{
  snapshot: CollectionSnapshot;
  request: ReorderRequest;
}>;

// ---------------------------------------------------------------------------
// The consumer resolution
// ---------------------------------------------------------------------------

// Erased: `declare const` emits no JavaScript, and no value carries the key.
// It exists to keep the shape below unwritable by anything but the factories,
// and distinct from the other behavior's resolution, which is otherwise the
// same two words and the same representation.
declare const RESOLUTION: unique symbol;

/**
 * The explicit consumer response. **Acceptance is never inferred** — not from
 * callback silence, not from DOM mutation, not from collection order, not from
 * elapsed time. Neither is rejection.
 *
 * **Opaque, and a round trip rather than a record.** It is built by
 * {@link ReorderResolution.accept} or {@link ReorderResolution.reject},
 * returned from `onReorder`, and read only by the library; the verdict reaches
 * the consumer again as a `ReorderTransactionResult`, which is the shape with
 * the fields on it. Nothing here is inspectable and nothing here needs to be.
 */
export type ReorderResolution = Readonly<{ [RESOLUTION]: never }>;

/**
 * The two representations, **declared as what they are**: a resolution that is
 * also a tuple. The intersection is what lets the read side name an arm and
 * index it — `settlement.prepare` asserts to `RejectedResolution` and reads
 * slot 0, with no widening through `unknown` on the way.
 *
 * Neither is named outside this package: the entry publishes
 * {@link ReorderResolution} alone, which is the whole of the opacity.
 */
export type AcceptedResolution = ReorderResolution & readonly [];
export type RejectedResolution = ReorderResolution &
  readonly [reason?: unknown];

/**
 * Acceptance is a **shared value** — it declares nothing, so there is one of it
 * for the life of the module and an accepted reorder allocates nothing at all.
 * Rejection is the same carrier with the reason in it, and the only arm that
 * has to be built.
 *
 * **Identity is the discriminant**, which is why the empty carrier is a
 * constant rather than a fresh one per acceptance: there is no string to ship,
 * none to compare, and nothing on the value for a consumer to read or forge.
 *
 * **The two assertions below are irreducible and are the only ones.** The brand
 * is a *required* property no runtime value carries — that is what makes the
 * type unforgeable, and it is also why an array literal is not comparable to
 * it. `as never` is the narrowest spelling: it claims nothing about the source,
 * and the annotation beside it is what states the result.
 */
export const ACCEPTED: AcceptedResolution = [] as never;

/**
 * The two resolutions a consumer returns from `onReorder`. Acceptance declares
 * nothing: a consumer that must render before the drop lands `await`s its own
 * commit inside `onReorder`, which is what a promise-returning resolver
 * already expresses.
 */
export const ReorderResolution = {
  accept: (): ReorderResolution => ACCEPTED,
  reject: (reason?: unknown): ReorderResolution => [reason] as never,
} as const;

/**
 * The consumer's verdict on one proposed reorder.
 *
 * `PromiseLike`, not `Promise`: the returned value's `then` is read exactly
 * once, and a native promise is never assumed.
 */
export type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => ReorderResolution | PromiseLike<ReorderResolution>;

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

// ---------------------------------------------------------------------------
// Behavior-private frame state
// ---------------------------------------------------------------------------

// 80–84 are unused: nothing reads `SortableFramePart.outcome` (D-66). The
// `RECOVERY_*` numbers below are read.

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
