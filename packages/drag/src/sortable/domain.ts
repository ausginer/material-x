/**
 * The sortable's vocabulary: the collection model, the gap, the request, the
 * consumer's resolution and the terminal results.
 */
import type { CancelOrigin } from '../draggable.ts';

/** The array `items()` returned, which the library reads and never writes, and its version. */
export type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

/**
 * A gap in the destination view, which is the snapshot minus the dragged item.
 * `before` and `after` are its real neighbors, tested for survival when the
 * collection changes.
 */
export type Insertion = Readonly<{
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

export function insertionAt(
  destination: readonly HTMLElement[],
  index: number,
): Insertion {
  return {
    index,
    before: destination[index - 1] ?? null,
    after: destination[index] ?? null,
  };
}

/**
 * A proposed reorder. `previous` and `next` are the items on either side of the
 * gap, so `root.insertBefore(item, next)` applies it.
 */
export type ReorderRequest = Readonly<{
  item: HTMLElement;
  from: number;
  to: number;
  previous: HTMLElement | null;
  next: HTMLElement | null;
}>;

// No runtime value carries this key: it keeps the shape unwritable except
// through the factories.
declare const RESOLUTION: unique symbol;

/** Opaque: `onReorder` returns it and only the library reads it. */
export type ReorderResolution = Readonly<{ [RESOLUTION]: never }>;

export type RejectedResolution = ReorderResolution &
  readonly [reason?: unknown];

/** Identity is the discriminant, so an accepted reorder allocates nothing. */
export const ACCEPTED: ReorderResolution = [] as never;

export const ReorderResolution = {
  accept: (): ReorderResolution => ACCEPTED,
  reject: (reason?: unknown): ReorderResolution => [reason] as never,
} as const;

export type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => ReorderResolution | PromiseLike<ReorderResolution>;

export type SortableAcceptedResult = Readonly<{
  type: 'accepted';
  request: ReorderRequest;
}>;

/** The drop was on the item's own gap, so `onReorder` was not asked. */
export type SortableNoopResult = Readonly<{
  type: 'noop';
  request: ReorderRequest;
}>;

export type SortableRejectedResult = Readonly<{
  type: 'rejected';
  reason: unknown;
  request: ReorderRequest;
}>;

export type SortableCanceledResult = Readonly<{
  type: 'canceled';
  /**
   * The `requestCancel` value, one of the two collection reasons, or the reported
   * `DragFault` when `origin` is `'fault'`.
   */
  reason: unknown;
  origin: CancelOrigin;
  /** `null` when the drag ended before a request existed. */
  request: ReorderRequest | null;
}>;

export type SortableResult =
  | SortableAcceptedResult
  | SortableNoopResult
  | SortableRejectedResult
  | SortableCanceledResult;

export const CANCEL_COLLECTION_INVALIDATED = 'sortable:collection-invalidated';
export const CANCEL_ITEM_REMOVED = 'sortable:item-removed';
