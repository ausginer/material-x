import { describe, expect, it } from 'vitest';
import {
  CHANGE_CANCEL,
  CHANGE_REBASE,
  reconcileCollection,
  type CollectionChange,
} from '../../src/sortable/collection-policy.ts';
import type {
  CollectionSnapshot,
  Insertion,
} from '../../src/sortable/options.ts';

/**
 * A distinct, identity-comparable stand-in for an element. `reconcileCollection`
 * only ever compares references and reads `items`/`version`, so a labelled
 * sentinel is a faithful and allocation-cheap element for these pure cases.
 */
const el = (label: string): HTMLElement =>
  ({ label }) as unknown as HTMLElement;

const snapshot = (
  items: readonly HTMLElement[],
  version: number,
): CollectionSnapshot => ({ items, version });

const insertion = (
  index: number,
  before: HTMLElement | null,
  after: HTMLElement | null,
  version: number,
): Insertion => ({ index, before, after, version });

const expectRebase = (
  change: CollectionChange,
): Extract<CollectionChange, { type: typeof CHANGE_REBASE }> => {
  expect(change.type).toBe(CHANGE_REBASE);
  return change as Extract<CollectionChange, { type: typeof CHANGE_REBASE }>;
};

describe('reconcileCollection', () => {
  it('should cancel when there is no incumbent insertion', () => {
    const dragged = el('drag');
    const next = snapshot([dragged, el('a')], 2);

    expect(reconcileCollection(next, dragged, null)).toEqual({
      type: CHANGE_CANCEL,
    });
  });

  describe('start gap (before is null)', () => {
    it('should rebase when the after neighbour is still the first destination item', () => {
      const dragged = el('drag');
      const a = el('a');
      const b = el('b');
      const next = snapshot([dragged, a, b], 5);
      const incumbent = insertion(0, null, a, 4);

      const change = expectRebase(
        reconcileCollection(next, dragged, incumbent),
      );

      expect(change.insertion).toEqual({
        version: 5,
        index: 0,
        before: null,
        after: a,
      });
    });

    it('should cancel when another item is inserted ahead of the after neighbour', () => {
      const dragged = el('drag');
      const a = el('a');
      const inserted = el('inserted');
      const next = snapshot([dragged, inserted, a], 5);
      const incumbent = insertion(0, null, a, 4);

      expect(reconcileCollection(next, dragged, incumbent)).toEqual({
        type: CHANGE_CANCEL,
      });
    });

    it('should cancel when the after neighbour is removed', () => {
      const dragged = el('drag');
      const a = el('a');
      const b = el('b');
      const next = snapshot([dragged, b], 5);
      const incumbent = insertion(0, null, a, 4);

      expect(reconcileCollection(next, dragged, incumbent)).toEqual({
        type: CHANGE_CANCEL,
      });
    });
  });

  describe('end gap (after is null)', () => {
    it('should rebase when the before neighbour is still the last destination item', () => {
      const dragged = el('drag');
      const a = el('a');
      const b = el('b');
      const next = snapshot([a, b, dragged], 7);
      const incumbent = insertion(2, b, null, 6);

      const change = expectRebase(
        reconcileCollection(next, dragged, incumbent),
      );

      expect(change.insertion).toEqual({
        version: 7,
        index: 2,
        before: b,
        after: null,
      });
    });

    it('should cancel when another item is appended past the before neighbour', () => {
      const dragged = el('drag');
      const a = el('a');
      const b = el('b');
      const appended = el('appended');
      const next = snapshot([a, b, appended, dragged], 7);
      const incumbent = insertion(2, b, null, 6);

      expect(reconcileCollection(next, dragged, incumbent)).toEqual({
        type: CHANGE_CANCEL,
      });
    });

    it('should cancel when the before neighbour is removed', () => {
      const dragged = el('drag');
      const a = el('a');
      const b = el('b');
      const next = snapshot([a, dragged], 7);
      const incumbent = insertion(2, b, null, 6);

      expect(reconcileCollection(next, dragged, incumbent)).toEqual({
        type: CHANGE_CANCEL,
      });
    });
  });

  describe('internal gap (before and after both present)', () => {
    it('should rebase to the recomputed gap index when the neighbours stay adjacent', () => {
      const dragged = el('drag');
      const a = el('a');
      const b = el('b');
      const c = el('c');
      // Destination becomes [a, b, c]; the b|c gap is at index 2.
      const next = snapshot([a, b, dragged, c], 9);
      const incumbent = insertion(2, b, c, 8);

      const change = expectRebase(
        reconcileCollection(next, dragged, incumbent),
      );

      expect(change.insertion).toEqual({
        version: 9,
        index: 2,
        before: b,
        after: c,
      });
    });

    it('should cancel when an item is inserted between the neighbours', () => {
      const dragged = el('drag');
      const b = el('b');
      const c = el('c');
      const wedge = el('wedge');
      const next = snapshot([b, wedge, c, dragged], 9);
      const incumbent = insertion(1, b, c, 8);

      expect(reconcileCollection(next, dragged, incumbent)).toEqual({
        type: CHANGE_CANCEL,
      });
    });

    it('should cancel when the before neighbour is removed', () => {
      const dragged = el('drag');
      const b = el('b');
      const c = el('c');
      const next = snapshot([c, dragged], 9);
      const incumbent = insertion(1, b, c, 8);

      expect(reconcileCollection(next, dragged, incumbent)).toEqual({
        type: CHANGE_CANCEL,
      });
    });

    it('should cancel when the after neighbour is removed', () => {
      const dragged = el('drag');
      const b = el('b');
      const c = el('c');
      const next = snapshot([b, dragged], 9);
      const incumbent = insertion(1, b, c, 8);

      expect(reconcileCollection(next, dragged, incumbent)).toEqual({
        type: CHANGE_CANCEL,
      });
    });
  });

  it('should stamp the rebased insertion with the next snapshot version, not the incumbent one', () => {
    const dragged = el('drag');
    const a = el('a');
    const next = snapshot([dragged, a], 42);
    const incumbent = insertion(0, null, a, 3);

    const change = expectRebase(reconcileCollection(next, dragged, incumbent));

    expect(change.insertion.version).toBe(42);
  });
});
