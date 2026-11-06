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

/**
 * The gap that survives a replacement, rebased into it, or `null` when it did
 * not survive and the operation must end. `dragged` must remain in `next`: its
 * removal is a different cancel reason, which callers classify first. A
 * single-item collection's gap has no neighbors and does not survive.
 */
export function reconcileCollection(
  next: CollectionSnapshot,
  dragged: HTMLElement,
  incumbent: Insertion,
): Insertion | null {
  const destination = next.items.filter((item) => item !== dragged);
  const { before, after } = incumbent;

  // A start gap survives only while `after` remains the first destination item.
  if (!before) {
    return after && destination[0] === after
      ? insertionAt(destination, 0, next)
      : null;
  }

  // An end gap survives only while `before` remains the last destination item.
  if (!after) {
    return destination.at(-1) === before
      ? insertionAt(destination, destination.length, next)
      : null;
  }

  // An internal gap survives only while both neighbors remain adjacent.
  const beforeIndex = destination.indexOf(before);

  return beforeIndex >= 0 && destination[beforeIndex + 1] === after
    ? insertionAt(destination, beforeIndex + 1, next)
    : null;
}

/**
 * The gap the dragged item itself occupies, from the snapshot and without
 * creating a destination view: removing the item leaves earlier elements in place
 * and shifts later ones down by one.
 */
export function homeInsertion(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
): Insertion {
  const from = snapshot.items.indexOf(item);

  return {
    version: snapshot.version,
    index: from,
    before: snapshot.items[from - 1] ?? null,
    after: snapshot.items[from + 1] ?? null,
  };
}

/** The reorder a gap proposes. `insertion` comes from the same snapshot. */
export function buildReorderRequest(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
  insertion: Insertion,
): ReorderRequest {
  return {
    item,
    from: snapshot.items.indexOf(item),
    to: insertion.index,
    previous: insertion.before,
    next: insertion.after,
  };
}
