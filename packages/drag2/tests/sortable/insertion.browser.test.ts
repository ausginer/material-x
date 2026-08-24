/**
 * **The construction rule for an `Insertion`, and the one site that evaluates
 * it without calling it** (F-91, D-119).
 *
 * `insertionAt` is now the only place the neighbour derivation is written, so
 * `keyboardInsertion`, `y()`, `xy()`, `reconcileCollection`'s three rebase arms
 * and `buildReorderProposal`'s verification cannot disagree with it — they call
 * it. `homeInsertion` is the exception: it evaluates the same rule over a
 * destination view it never materializes, so that seeding home costs no array.
 *
 * **That exception is what this file is for.** The equivalence used to be
 * argued in a doc block and checked by nothing; the review that opened F-91
 * observed that the package would not notice it breaking. So it is asserted
 * here exhaustively rather than sampled — every collection up to six items,
 * every dragged position — because the rule is arithmetic and its whole domain
 * is small enough to enumerate.
 *
 * These are the first direct imports of either helper from a test. Every other
 * suite reaches them through the composed behavior, which is the right way to
 * assert *behavior*; it is the wrong way to assert an identity between two
 * spellings of one expression, because a passing drag proves only that the
 * spelling on that path was used.
 */
import { describe, expect, it } from 'vitest';
import { homeInsertion } from '../../src/sortable/collection.ts';
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
} from '../../src/sortable/domain.ts';

/** The largest collection enumerated. Six is 21 (collection, dragged) pairs. */
const MAX_ITEMS = 6;

const collection = (size: number): HTMLElement[] =>
  Array.from({ length: size }, () => document.createElement('div'));

const snapshotOf = (
  items: readonly HTMLElement[],
  version: number,
): CollectionSnapshot => ({ items, version });

/** The destination view: the snapshot minus the dragged item, in order. */
const destinationOf = (
  items: readonly HTMLElement[],
  dragged: HTMLElement,
): readonly HTMLElement[] => items.filter((item) => item !== dragged);

describe('insertionAt', () => {
  it('should carry both neighbours of an internal gap', () => {
    const [a, b, c] = collection(3) as [HTMLElement, HTMLElement, HTMLElement];

    expect(insertionAt([a, b, c], 1, 7)).toEqual({
      version: 7,
      index: 1,
      before: a,
      after: b,
    } satisfies Insertion);
  });

  it('should read a start gap as a null `before`', () => {
    const [a, b] = collection(2) as [HTMLElement, HTMLElement];

    expect(insertionAt([a, b], 0, 7)).toEqual({
      version: 7,
      index: 0,
      before: null,
      after: a,
    } satisfies Insertion);
  });

  it('should read an end gap as a null `after`', () => {
    const [a, b] = collection(2) as [HTMLElement, HTMLElement];

    expect(insertionAt([a, b], 2, 7)).toEqual({
      version: 7,
      index: 2,
      before: b,
      after: null,
    } satisfies Insertion);
  });

  it('should read the only gap of an empty destination view as null at both ends', () => {
    expect(insertionAt([], 0, 7)).toEqual({
      version: 7,
      index: 0,
      before: null,
      after: null,
    } satisfies Insertion);
  });
});

describe('homeInsertion', () => {
  it('should equal the rule over the destination view for every collection and every dragged item', () => {
    const checked: string[] = [];

    for (let size = 1; size <= MAX_ITEMS; size += 1) {
      const items = collection(size);
      const version = 40 + size;
      const snapshot = snapshotOf(items, version);

      for (let from = 0; from < size; from += 1) {
        const dragged = items[from]!;

        expect(homeInsertion(snapshot, dragged)).toEqual(
          insertionAt(destinationOf(items, dragged), from, version),
        );
        checked.push(`${size}:${from}`);
      }
    }

    // The enumeration is the assertion, so it is asserted to have happened —
    // a loop that ran zero times would otherwise pass silently (D-115's
    // fail-open shape).
    expect(checked).toHaveLength((MAX_ITEMS * (MAX_ITEMS + 1)) / 2);
  });

  it('should return null for an item the snapshot does not hold', () => {
    const items = collection(3);

    expect(
      homeInsertion(snapshotOf(items, 1), document.createElement('div')),
    ).toBeNull();
  });
});
