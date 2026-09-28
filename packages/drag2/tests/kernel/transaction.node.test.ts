import { describe, expect, it } from 'vitest';
import { frame, type Frame } from '../../src/kernel/frames.ts';
import { ACTIVE, IDLE, PENDING } from '../../src/kernel/phases.ts';
import { FrameTransaction } from '../../src/kernel/transaction.ts';

type ExamplePart = { item: string | null };

/**
 * Two frames composed exactly as `arm()` composes them — one code path twice,
 * so both share a hidden class — handed over whole.
 */
function createTransaction(): FrameTransaction<ExamplePart> {
  return new FrameTransaction<ExamplePart>(
    Object.assign(frame(), { item: null }),
    Object.assign(frame(), { item: null }),
  );
}

/** The caller's reset: the kernel's slice, then the behavior's part. */
function reset(target: Frame<ExamplePart>): void {
  frame(target);
  target.item = null;
}

describe('the frame transaction', () => {
  it('should rebuild the draft from the committed frame', () => {
    const transaction = createTransaction();

    transaction.draft.item = 'abandoned';
    transaction.begin();

    // Whatever an abandoned transaction left in the draft is gone: opening one
    // is a copy of the published frame, not a continuation of the last draft.
    expect(transaction.draft.item).toBeNull();
  });

  it('should publish the draft as the committed frame', () => {
    const transaction = createTransaction();

    transaction.draft.item = 'staged';
    transaction.commit(null);

    expect(transaction.current.item).toBe('staged');
  });

  it('should reuse the retired frame as the next draft', () => {
    const transaction = createTransaction();
    const published = transaction.current;

    transaction.commit(null);

    // The two references are **swapped**, not copied back: a commit that
    // allocated or copied would make the pair two frames per transaction
    // rather than two per controller, on the path a pointer sample takes.
    expect(transaction.draft).toBe(published);
  });

  it('should write the phase onto the frame the commit publishes', () => {
    const transaction = createTransaction();
    // Held rather than read back through `current`, so this says *which frame
    // took the write* and not merely that the phase arrived: the write lands
    // after the caller's revalidation and before the swap, and a write made
    // after the swap would land on the retired frame instead.
    const opening = transaction.draft;

    transaction.commit(ACTIVE);

    expect(opening.phase).toBe(ACTIVE);
  });

  it('should publish the phase its draft holds when a commit carries none', () => {
    const transaction = createTransaction();

    transaction.commit(ACTIVE);
    transaction.commit(null);

    // The two commits that change no phase — the pointer sample and the
    // behavior action — pass nothing, and nothing is what the frame keeps.
    expect(transaction.current.phase).toBe(IDLE);
  });

  it('should reset the committed frame at retirement', () => {
    const transaction = createTransaction();

    transaction.draft.item = 'held';
    transaction.commit(PENDING);
    transaction.retire(reset);

    // The published frame is written **in place** at retirement, which is the
    // one act no reader of it can serve.
    expect([transaction.current.item, transaction.current.phase]).toEqual([
      null,
      IDLE,
    ]);
  });

  it('should reset the draft at retirement', () => {
    const transaction = createTransaction();

    transaction.draft.item = 'held';
    transaction.retire(reset);

    // A part holding a DOM reference outlives its operation if either frame is
    // missed, and only one of the two is the one anything reads afterwards.
    expect(transaction.draft.item).toBeNull();
  });
});
