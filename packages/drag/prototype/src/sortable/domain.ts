/**
 * The sortable's vocabulary: the collection model, the gap, the request, the
 * consumer's resolution and the terminal results.
 */
import type { CancelOrigin } from '../draggable.ts';

/** An immutable ordered copy of the collection, and its version. */
export type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

/**
 * A gap in the destination view, which is the snapshot minus the dragged item.
 * `before` and `after` are its real neighbours, tested for survival when the
 * collection changes.
 */
export type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

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

export type SortableResult =
  | Readonly<{ type: 'accepted' | 'noop'; request: ReorderRequest }>
  | Readonly<{ type: 'rejected'; reason: unknown; request: ReorderRequest }>
  | Readonly<{
      type: 'canceled';
      /**
       * What the decider said: the `requestCancel` value, one of the two reasons
       * below, or the reported `DragFault` when `origin` is `'fault'`.
       */
      reason: unknown;
      origin: CancelOrigin;
      /** Null when the drag ended before a request existed. */
      request: ReorderRequest | null;
    }>;

export const CANCEL_COLLECTION_INVALIDATED = 'sortable:collection-invalidated';
export const CANCEL_ITEM_REMOVED = 'sortable:item-removed';
