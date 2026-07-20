import { describe, expect, it } from 'vitest';
import type {
  CollectionSnapshot,
  Insertion,
} from '../../src/sortable/options.ts';
import { buildReorderProposal } from '../../src/sortable/request.ts';

/** Identity-comparable element stand-in; `buildReorderProposal` only compares references. */
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

describe('buildReorderProposal', () => {
  it('should reject an insertion whose version does not match the snapshot', () => {
    const item = el('item');
    const a = el('a');
    const snap = snapshot([item, a], 5);
    const stale = insertion(1, a, null, 4);

    expect(buildReorderProposal(snap, item, stale)).toBeNull();
  });

  it('should reject when the dragged item is absent from the snapshot', () => {
    const item = el('item');
    const a = el('a');
    const b = el('b');
    const snap = snapshot([a, b], 5);
    const ins = insertion(0, null, a, 5);

    expect(buildReorderProposal(snap, item, ins)).toBeNull();
  });

  it('should reject an insertion index below zero', () => {
    const item = el('item');
    const a = el('a');
    const snap = snapshot([item, a], 5);
    const ins = insertion(-1, null, null, 5);

    expect(buildReorderProposal(snap, item, ins)).toBeNull();
  });

  it('should reject an insertion index past the destination end', () => {
    const item = el('item');
    const a = el('a');
    const snap = snapshot([item, a], 5);
    // Destination is [a] (length 1); index 2 is out of range.
    const ins = insertion(2, a, null, 5);

    expect(buildReorderProposal(snap, item, ins)).toBeNull();
  });

  it('should reject when the captured before neighbour no longer matches the gap', () => {
    const item = el('item');
    const a = el('a');
    const b = el('b');
    const snap = snapshot([item, a, b], 5);
    // Destination [a, b]; index 1 gap is a|b, but the insertion claims before=b.
    const ins = insertion(1, b, b, 5);

    expect(buildReorderProposal(snap, item, ins)).toBeNull();
  });

  it('should reject when the captured after neighbour no longer matches the gap', () => {
    const item = el('item');
    const a = el('a');
    const b = el('b');
    const snap = snapshot([item, a, b], 5);
    // Destination [a, b]; index 1 gap has after=b, but the insertion claims after=a.
    const ins = insertion(1, a, a, 5);

    expect(buildReorderProposal(snap, item, ins)).toBeNull();
  });

  it('should build a proposal for a valid internal insertion', () => {
    const item = el('item');
    const a = el('a');
    const b = el('b');
    const c = el('c');
    const snap = snapshot([item, a, b, c], 5);
    // Destination [a, b, c]; gap b|c is index 2.
    const ins = insertion(2, b, c, 5);

    const build = buildReorderProposal(snap, item, ins);

    expect(build).not.toBeNull();
    expect(build!.proposal.request).toEqual({
      item,
      version: 5,
      from: 0,
      to: 2,
      before: b,
      after: c,
    });
    expect(build!.noop).toBe(false);
  });

  it('should carry the original snapshot on the built proposal', () => {
    const item = el('item');
    const a = el('a');
    const snap = snapshot([item, a], 5);
    const ins = insertion(1, a, null, 5);

    const build = buildReorderProposal(snap, item, ins);

    expect(build!.proposal.snapshot).toBe(snap);
  });

  it('should flag a no-op when the insertion index equals the source index', () => {
    const item = el('item');
    const a = el('a');
    const b = el('b');
    // item is at index 1; destination [a, b]; gap a|b is index 1 → same slot.
    const snap = snapshot([a, item, b], 5);
    const ins = insertion(1, a, b, 5);

    const build = buildReorderProposal(snap, item, ins);

    expect(build).not.toBeNull();
    expect(build!.noop).toBe(true);
    expect(build!.proposal.request.from).toBe(1);
    expect(build!.proposal.request.to).toBe(1);
  });

  it('should not flag a no-op when the item genuinely moves', () => {
    const item = el('item');
    const a = el('a');
    const b = el('b');
    // item at index 0; move to end (index 2 in destination [a, b]).
    const snap = snapshot([item, a, b], 5);
    const ins = insertion(2, b, null, 5);

    const build = buildReorderProposal(snap, item, ins);

    expect(build!.noop).toBe(false);
    expect(build!.proposal.request.to).toBe(2);
  });
});
