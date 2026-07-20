import { describe, expect, it } from 'vitest';
import { keyboardInsertion } from '../../src/sortable/keyboard.ts';
import type { CollectionSnapshot } from '../../src/sortable/options.ts';

/** Identity-comparable element stand-in; `keyboardInsertion` only compares references. */
const el = (label: string): HTMLElement =>
  ({ label }) as unknown as HTMLElement;

const snapshot = (
  items: readonly HTMLElement[],
  version: number,
): CollectionSnapshot => ({ items, version });

describe('keyboardInsertion', () => {
  it('should return null when the item is absent from the snapshot', () => {
    const item = el('item');
    const snap = snapshot([el('a'), el('b')], 3);

    expect(keyboardInsertion(snap, item, 'up')).toBeNull();
  });

  it('should return null moving up from the first slot', () => {
    const a = el('a');
    const snap = snapshot([a, el('b'), el('c')], 3);

    expect(keyboardInsertion(snap, a, 'up')).toBeNull();
  });

  it('should return null moving down from the last slot', () => {
    const c = el('c');
    const snap = snapshot([el('a'), el('b'), c], 3);

    expect(keyboardInsertion(snap, c, 'down')).toBeNull();
  });

  it('should move an internal item up ahead of its predecessor', () => {
    const a = el('a');
    const b = el('b');
    const c = el('c');
    const d = el('d');
    // item c at index 2; up → gap a|b in destination [a, b, d] at index 1.
    const snap = snapshot([a, b, c, d], 3);

    expect(keyboardInsertion(snap, c, 'up')).toEqual({
      version: 3,
      index: 1,
      before: a,
      after: b,
    });
  });

  it('should move an internal item down past its successor', () => {
    const a = el('a');
    const b = el('b');
    const c = el('c');
    const d = el('d');
    // item b at index 1; down → gap c|d in destination [a, c, d] at index 2.
    const snap = snapshot([a, b, c, d], 3);

    expect(keyboardInsertion(snap, b, 'down')).toEqual({
      version: 3,
      index: 2,
      before: c,
      after: d,
    });
  });

  it('should move the second item up to the start gap', () => {
    const a = el('a');
    const b = el('b');
    // item b at index 1; up → start gap in destination [a, c] at index 0.
    const c = el('c');
    const snap = snapshot([a, b, c], 3);

    expect(keyboardInsertion(snap, b, 'up')).toEqual({
      version: 3,
      index: 0,
      before: null,
      after: a,
    });
  });

  it('should move the penultimate item down to the end gap', () => {
    const a = el('a');
    const b = el('b');
    const c = el('c');
    // item b at index 1; down → end gap in destination [a, c] at index 2.
    const snap = snapshot([a, b, c], 3);

    expect(keyboardInsertion(snap, b, 'down')).toEqual({
      version: 3,
      index: 2,
      before: c,
      after: null,
    });
  });

  it('should stamp the insertion with the snapshot version', () => {
    const a = el('a');
    const b = el('b');
    const snap = snapshot([a, b], 17);

    expect(keyboardInsertion(snap, b, 'up')?.version).toBe(17);
  });
});
