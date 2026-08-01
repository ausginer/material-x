/**
 * Collection reconciliation and proposal construction. Both are **pure**: they
 * read identity, never the DOM, never the pointer, and never mutate anything.
 *
 * The rule that shapes both: **intent is never recomputed from the latest
 * pointer position.** The exact identity gap the consumer was shown either
 * survives the replacement or the operation ends (I-14).
 */
import type {
  CollectionSnapshot,
  Insertion,
  ReorderProposal,
  ReorderRequest,
} from './domain.ts';

/** The incumbent gap survived, rebased into the replacement. */
export const CHANGE_REBASE = 112;
/** It did not, and the operation must end. */
export const CHANGE_CANCEL = 113;

export type CollectionChange =
  | Readonly<{ type: typeof CHANGE_REBASE; insertion: Insertion }>
  | Readonly<{ type: typeof CHANGE_CANCEL }>;

/** The snapshot minus the dragged item, in order. */
const destinationOf = (
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
): readonly HTMLElement[] => snapshot.items.filter((item) => item !== dragged);

/**
 * The four survival rules, by gap kind. `dragged` must remain in `next`;
 * callers classify its removal separately, because that is a different
 * cancellation reason.
 */
export function reconcileCollection(
  next: CollectionSnapshot,
  dragged: HTMLElement,
  incumbent: Insertion | null,
): CollectionChange {
  if (incumbent === null) {
    return { type: CHANGE_CANCEL };
  }

  const destination = destinationOf(next, dragged);
  const { before, after } = incumbent;

  // A start gap survives only while `after` remains the first destination item.
  if (before === null) {
    if (after !== null && destination[0] === after) {
      return {
        type: CHANGE_REBASE,
        insertion: { version: next.version, index: 0, before: null, after },
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // An end gap survives only while `before` remains the last destination item.
  if (after === null) {
    if (destination[destination.length - 1] === before) {
      return {
        type: CHANGE_REBASE,
        insertion: {
          version: next.version,
          index: destination.length,
          before,
          after: null,
        },
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // An internal gap survives only while both neighbours remain adjacent.
  const beforeIndex = destination.indexOf(before);

  if (beforeIndex >= 0 && destination[beforeIndex + 1] === after) {
    return {
      type: CHANGE_REBASE,
      insertion: {
        version: next.version,
        index: beforeIndex + 1,
        before,
        after,
      },
    };
  }

  return { type: CHANGE_CANCEL };
}

/**
 * The gap the dragged item itself occupies, with **real identity neighbours**.
 *
 * Recomputed from the snapshot rather than stored, so it needs no per-operation
 * slot and cannot go stale against a replacement: removing the item from the
 * full list leaves its own index as the destination gap, whose neighbours are
 * the item's own neighbours (D-27, F-31).
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

/** A normalized proposal, plus whether the reorder is a proven no-op. */
export type ProposalBuild = Readonly<{
  proposal: ReorderProposal;
  noop: boolean;
}>;

/**
 * Every request field derives from **one** immutable, version-matching
 * snapshot: mixed-version arithmetic is invalid, and a gap whose captured
 * neighbours no longer match the snapshot fails construction rather than
 * producing a request the consumer would apply to a different ordering.
 *
 * `null` is a broken invariant, not a no-op — the caller turns it into a
 * `SeamRejection`.
 */
export function buildReorderProposal(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
  insertion: Insertion,
): ProposalBuild | null {
  if (insertion.version !== snapshot.version) {
    return null;
  }

  const from = snapshot.items.indexOf(item);

  if (from === -1) {
    return null;
  }

  const destination = destinationOf(snapshot, item);
  const { index } = insertion;

  if (index < 0 || index > destination.length) {
    return null;
  }

  const before = destination[index - 1] ?? null;
  const after = destination[index] ?? null;

  if (before !== insertion.before || after !== insertion.after) {
    return null;
  }

  const request: ReorderRequest = {
    item,
    version: snapshot.version,
    from,
    to: index,
    before,
    after,
  };

  return { proposal: { snapshot, request }, noop: index === from };
}
