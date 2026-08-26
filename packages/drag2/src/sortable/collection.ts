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
 * The four survival rules, by gap kind. `dragged` must remain in `next`;
 * callers classify its removal separately, because that is a different
 * cancellation reason.
 *
 * **The arms decide; they do not also construct** (F-91, D-119). Each keeps
 * its own survival test — that is I-14's decision and it is not the
 * constructor's to hold — and then hands the surviving gap's index to
 * {@link insertionAt} over `next`'s destination view. The neighbours an arm
 * could carry across from the incumbent are exactly the ones the rule
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

  const destination = next.items.filter((item) => item !== dragged);
  const { before, after } = incumbent;

  // A start gap survives only while `after` remains the first destination item.
  if (before === null) {
    if (after !== null && destination[0] === after) {
      return {
        type: CHANGE_REBASE,
        insertion: insertionAt(destination, 0, next),
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // An end gap survives only while `before` remains the last destination item.
  if (after === null) {
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
 * element distinctness `SortableConfig.items` publishes (D-121). `indexOf`
 * finds one occurrence where a filtered view drops them all, so on a
 * duplicated collection the two spellings diverge. That input is outside the
 * contract rather than handled here, and nothing detects it.
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
 * snapshot: mixed-version arithmetic is invalid, so a gap carrying another
 * version fails construction rather than producing a request the consumer
 * would apply to a different ordering.
 *
 * `null` is a broken invariant, not a no-op — the caller turns it into a
 * `SeamRejection`.
 *
 * **Neither neighbours nor range are checked here** (D-121, D-123). Both tests
 * would read an `Insertion` the library itself did not build: `InsertionGeometry.resolve`
 * is published at the middle tier (D-61), so a version-matching gap can arrive
 * from third-party axis code. The axis author **satisfies** the term instead —
 * `insertionAt` is published from
 * `sortable/feature.js` beside the type and the obligation, so the one
 * construction rule is the author's too, and `index` is documented there as a
 * gap position in the destination view. A gap whose neighbours are not the
 * destination view's, or whose index is outside `0 .. length`, is not a
 * conforming contribution, and nothing here detects one: the request carries
 * the author's own `before`/`after` onward to the consumer.
 *
 * **No destination view is materialized either**, which is the measurable half:
 * it would exist on the release path solely to re-derive two neighbours and a
 * length that are taken from the insertion, so this function allocates
 * nothing.
 *
 * The two tests that remain are about the pair `(snapshot, insertion)` and
 * survive on their own terms — a mixed-version gap is arithmetic over two
 * different orderings, and an item the snapshot does not hold has no `from`.
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

  const { index, before, after } = insertion;
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
