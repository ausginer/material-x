/**
 * Collection reconciliation and proposal construction. Both are **pure**: they
 * read identity, never the DOM, never the pointer, and never mutate anything.
 *
 * The rule that shapes both: **intent is never recomputed from the latest
 * pointer position.** The exact identity gap the consumer was shown either
 * survives the replacement or the operation ends (I-14).
 */
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
  type ReorderProposal,
  type ReorderRequest,
} from './domain.ts';

/** The incumbent gap survived, rebased into the replacement. */
export const CHANGE_REBASE = 112;
/** It did not, and the operation must end. */
export const CHANGE_CANCEL = 113;

export type CollectionChange =
  | Readonly<{ type: typeof CHANGE_REBASE; insertion: Insertion }>
  | Readonly<{ type: typeof CHANGE_CANCEL }>;

/**
 * The collection's **identity precondition**, enforced at every boundary that
 * mints a snapshot.
 *
 * Element identity *is* the collection's key: `destinationOf` filters every
 * occurrence of the dragged item while `buildReorderProposal` takes `from`
 * from `indexOf`, the first. A duplicate therefore puts `from` and `to` in
 * index spaces of different size, and the `{ from, to }` pair handed to
 * `onReorder` cannot be applied coherently to the consumer's own array. There
 * is no correct behaviour to define for that input, so it is refused where the
 * caller can still see which call was wrong.
 *
 * Shallow-copies as it validates — one pass, one array, one set — because
 * every caller needs the copy anyway: a caller that keeps mutating its own
 * array must not be able to change a snapshot already queued.
 */
export function copyUniqueItems(
  items: readonly HTMLElement[],
): readonly HTMLElement[] {
  const copy = [...items];

  if (new Set(copy).size !== copy.length) {
    throw new TypeError('drag: sortable/duplicate-item');
  }

  return copy;
}

/** The snapshot minus the dragged item, in order. */
const destinationOf = (
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
): readonly HTMLElement[] => snapshot.items.filter((item) => item !== dragged);

/**
 * The four survival rules, by gap kind. `dragged` must remain in `next`;
 * callers classify its removal separately, because that is a different
 * cancellation reason.
 *
 * **The arms decide; they no longer also construct** (F-91, D-119). Each keeps
 * its own survival test — that is I-14's decision and it is not the
 * constructor's to hold — and then hands the surviving gap's index to
 * {@link insertionAt} over `next`'s destination view. The neighbours the arms
 * used to carry across from the incumbent are exactly the ones the rule
 * derives, which is precisely what the test above each call has just
 * established.
 *
 * **One input where the rule and these tests disagree, recorded rather than
 * changed** (F-93). An incumbent with `before` and `after` both `null` is the
 * gap of a single-item collection: the rule builds it, and `placeholderAt`
 * reads it as trivially occupied. The start-gap test refuses it, because there
 * is no first destination item for `after` to remain — so a publication during
 * a one-item drag cancels the operation. Whether it should is a **survival**
 * question, not a construction one, and is not decided here.
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
        insertion: insertionAt(destination, 0, next.version),
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // An end gap survives only while `before` remains the last destination item.
  if (after === null) {
    if (destination[destination.length - 1] === before) {
      return {
        type: CHANGE_REBASE,
        insertion: insertionAt(destination, destination.length, next.version),
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // An internal gap survives only while both neighbours remain adjacent.
  const beforeIndex = destination.indexOf(before);

  if (beforeIndex >= 0 && destination[beforeIndex + 1] === after) {
    return {
      type: CHANGE_REBASE,
      insertion: insertionAt(destination, beforeIndex + 1, next.version),
    };
  }

  return { type: CHANGE_CANCEL };
}

/**
 * The gap the dragged item itself occupies, with **real identity neighbours**.
 *
 * Recomputed from the snapshot rather than stored, so it needs no per-operation
 * slot and cannot go stale against a replacement (D-27, F-31).
 *
 * **This is {@link insertionAt} over a destination view it never materializes,
 * and the equivalence is now proved rather than argued** (F-91, D-119).
 * Removing the item from the full list leaves every earlier element where it
 * was and shifts every later one down by one, so the gap at the item's own
 * index reads `items[from - 1]` and `items[from + 1]` — the rule's two ends,
 * evaluated without the array. It is the one site that does not call the owner,
 * because it is the one site that would have to **allocate** a destination view
 * to; seeding home stays free of one. The identity is held by
 * `tests/sortable/insertion.browser.test.ts` exhaustively instead of by this
 * paragraph.
 *
 * **The equivalence has a precondition and it is the collection's own**: the
 * element identity `copyUniqueItems` enforces at every mint. `indexOf` finds
 * one occurrence where a filtered view drops them all, so on a duplicated
 * collection the two spellings diverge — which is why that input is refused at
 * the boundary rather than handled here.
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
 *
 * **The neighbour test is no longer this package re-checking its own
 * arithmetic** (F-91, D-119). With construction owned, every gap `keyboard.ts`
 * and this module produce is {@link insertionAt} over a destination view of the
 * snapshot they name, so for those the test is provably vacuous once the
 * version matches. What it still reads is the one insertion nothing here built:
 * `InsertionGeometry.resolve` is published at the middle tier (D-61), so a
 * version-matching gap can arrive from third-party axis code carrying
 * neighbours this snapshot does not support. **That fault leaves the tier that
 * made it** — it does not cost the axis author their own feature, it hands the
 * *consumer* a `{ from, to, before, after }` to apply to their own array — so
 * the check is the library's and it stays. The other three are about the pair
 * `(snapshot, insertion)` and survive on their own terms; the range test in
 * particular is not implied by this one, since an index past the end of the
 * destination view reads `null` at both ends and a start gap of an empty view
 * legitimately does too.
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

  const { before, after } = insertionAt(destination, index, snapshot.version);

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
