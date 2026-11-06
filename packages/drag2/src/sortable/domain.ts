/**
 * The sortable domain vocabulary: the collection model, the insertion, the
 * proposal, the consumer resolution, and the terminal results.
 *
 * The public unions here are narrowed, with string discriminants:
 * discriminating a result must not require importing an internal outcome
 * constant.
 *
 * The numeric `RECOVERY_*` constants are the opposite: they are
 * behavior-private frame state, never handed to a consumer.
 */
import type { CancelOrigin, CancelStage } from '../kernel/failures.ts';

// ---------------------------------------------------------------------------
// The collection
// ---------------------------------------------------------------------------

/** An immutable ordered snapshot of the collection, and its version. */
export type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

/**
 * A proposed insertion gap in the destination view: the snapshot minus the
 * dragged item.
 *
 * `before` and `after` are real neighbouring elements, not only an index. A
 * reconciliation tests them for survival, and they allow a start gap to be
 * expressed at all.
 */
export type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/**
 * Constructs an {@link Insertion}: the gap at `index` of `destination` (a
 * snapshot minus its dragged item), carrying the two elements that the gap sits
 * between, in `snapshot`.
 *
 * `index` is a gap position in `destination`, `0 .. destination.length`: `0` is
 * before the first element, and `destination.length` is after the last. This
 * function derives and does not validate. `insertionAt(view, 999, snapshot)`
 * returns an insertion carrying `999` and `null` at both ends, and nothing
 * downstream checks either.
 *
 * A `null` neighbour is part of the rule, not a convenience: a read off either
 * end of the destination view is a start gap or an end gap, and a placeholder
 * anchors on those two shapes.
 *
 * The version comes from the snapshot that the gap belongs to, not from a bare
 * number, so a stale version is not a value that a caller can supply.
 *
 * This is a pure helper. It takes an array and an index, holds no state and
 * needs no instant, so a caller passes whichever destination view it already
 * holds. The destination view is a parameter because deriving it here would
 * allocate an array per spatial resolution, on a pointer-move path that exists
 * to avoid that allocation.
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

// `declare const` emits no JavaScript, and no value carries the key. The key
// keeps the shape below unwritable by anything except the factories, and
// distinct from the other behavior's resolution, which otherwise has the same
// two words and the same representation.
declare const RESOLUTION: unique symbol;

/**
 * The explicit consumer response. Acceptance is never inferred: not from
 * callback silence, DOM mutation, collection order or elapsed time. Rejection
 * is never inferred either.
 *
 * This value is opaque and only makes a round trip.
 * {@link ReorderResolution.accept} or {@link ReorderResolution.reject} builds
 * it, `onReorder` returns it, and only the library reads it. The verdict
 * reaches the consumer again as a `ReorderTransactionResult`, which is the type
 * with fields. Nothing on this value can be inspected, and nothing needs to be.
 */
export type ReorderResolution = Readonly<{ [RESOLUTION]: never }>;

/**
 * The two representations, declared as what they are: a resolution that is also
 * a tuple. The intersection lets the read side name a variant and index it:
 * `settlement.prepare` asserts to `RejectedResolution` and reads slot 0, with
 * no widening through `unknown`.
 *
 * Neither is named outside this package. The entry publishes only
 * {@link ReorderResolution}, and that keeps the resolution opaque.
 */
export type AcceptedResolution = ReorderResolution & readonly [];
export type RejectedResolution = ReorderResolution &
  readonly [reason?: unknown];

/**
 * Acceptance is a shared value. It declares nothing, so one value exists for
 * the life of the module and an accepted reorder allocates nothing at all.
 * Rejection is the same carrier with the reason in it, and is the only variant
 * that has to be built.
 *
 * Identity is the discriminant, so the empty carrier is a constant and not a
 * new array per acceptance. There is no string to ship or compare, and nothing
 * on the value for a consumer to read or forge.
 *
 * The `as never` assertions on `ACCEPTED` and in `reject` cannot be removed,
 * and are the only ones. The brand is a required property that no runtime value
 * carries. That makes the type unforgeable, and it also makes an array literal
 * not comparable to the type. `as never` is the narrowest spelling: it says
 * nothing about the source, and the annotation beside it states the result.
 */
export const ACCEPTED: AcceptedResolution = [] as never;

/**
 * The two resolutions a consumer returns from `onReorder`. Acceptance declares
 * nothing: a consumer that must render before the drop lands `await`s its own
 * commit inside `onReorder`, which a promise-returning resolver already
 * expresses.
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
  /**
   * What the decider said, and nothing more. This is an open channel: a value
   * the consumer passed to `requestCancel`, `CANCEL_COLLECTION_INVALIDATED` or
   * `CANCEL_ITEM_REMOVED`, the value a classified failure threw, or
   * `undefined`. `origin` gives the provenance, and the consumer cannot write
   * `origin`. Comparing `reason` to a constant tells you what was said, never
   * who said it.
   */
  reason: unknown;
  /** Who decided, and of what kind. Written by the library. */
  origin: CancelOrigin;
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

/**
 * Where the lifted visual goes. This is not the same question as whether the
 * authored presentation is final (`authoredReady`). Only a destination recovery
 * re-anchors the placeholder. Home returns the placeholder to the grab slot,
 * and immediate leaves the placeholder where it stands.
 */
export const RECOVERY_DESTINATION = 90;
export const RECOVERY_HOME = 91;
export const RECOVERY_IMMEDIATE = 92;

/** Why the behavior cancelled an operation of its own accord. */
export const CANCEL_COLLECTION_INVALIDATED = 'sortable:collection-invalidated';
export const CANCEL_ITEM_REMOVED = 'sortable:item-removed';
