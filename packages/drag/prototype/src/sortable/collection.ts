/**
 * Collection reconciliation and request construction. Both are pure: they read
 * identity, never the DOM or the pointer. Intent is never recomputed from the
 * latest pointer position: the exact gap the consumer was shown either survives
 * a replacement or the drag ends.
 */
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
  type ReorderRequest,
} from './domain.ts';

/** The incumbent gap survived, rebased into the replacement. */
export const CHANGE_REBASE = 112;
/** The incumbent gap did not survive, so the operation must end. */
export const CHANGE_CANCEL = 113;

export type CollectionChange =
  | Readonly<{ type: typeof CHANGE_REBASE; insertion: Insertion }>
  | Readonly<{ type: typeof CHANGE_CANCEL }>;

/**
 * The four survival rules, by gap kind. `dragged` must remain in `next`: callers
 * classify its removal separately, because that is a different cancel reason. A
 * single-item collection's gap has no neighbours and does not survive.
 */
export function reconcileCollection(
  next: CollectionSnapshot,
  dragged: HTMLElement,
  incumbent: Insertion | null,
): CollectionChange {
  if (!incumbent) {
    return { type: CHANGE_CANCEL };
  }

  const destination = next.items.filter((item) => item !== dragged);
  const { before, after } = incumbent;

  // A start gap survives only while `after` remains the first destination item.
  if (!before) {
    if (after && destination[0] === after) {
      return {
        type: CHANGE_REBASE,
        insertion: insertionAt(destination, 0, next),
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // An end gap survives only while `before` remains the last destination item.
  if (!after) {
    if (destination[destination.length - 1] === before) {
      return {
        type: CHANGE_REBASE,
        insertion: insertionAt(destination, destination.length, next),
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // An internal gap survives only while both neighbours remain adjacent.
  const beforeIndex = destination.indexOf(before);

  if (beforeIndex >= 0 && destination[beforeIndex + 1] === after) {
    return {
      type: CHANGE_REBASE,
      insertion: insertionAt(destination, beforeIndex + 1, next),
    };
  }

  return { type: CHANGE_CANCEL };
}

/**
 * The gap the dragged item itself occupies, from the snapshot and without
 * materializing a destination view: removing the item leaves earlier elements in
 * place and shifts later ones down by one.
 */
export function homeInsertion(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
): Insertion | null {
  const from = snapshot.items.indexOf(item);

  if (from === -1) {
    return null;
  }

  return {
    version: snapshot.version,
    index: from,
    before: snapshot.items[from - 1] ?? null,
    after: snapshot.items[from + 1] ?? null,
  };
}

/** A request, plus whether the reorder is a proven no-op. */
export type RequestBuild = Readonly<{
  request: ReorderRequest;
  noop: boolean;
}>;

/**
 * `null` is a broken invariant and not a no-op: a gap from another version of
 * the collection, or an item the snapshot does not hold. The caller throws.
 */
export function buildReorderRequest(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
  insertion: Insertion,
): RequestBuild | null {
  if (insertion.version !== snapshot.version) {
    return null;
  }

  const from = snapshot.items.indexOf(item);

  if (from === -1) {
    return null;
  }

  const { index, before, after } = insertion;

  return {
    request: { item, from, to: index, previous: before, next: after },
    noop: index === from,
  };
}
