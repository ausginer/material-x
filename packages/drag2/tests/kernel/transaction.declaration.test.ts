// oxlint-disable typescript/no-unsafe-type-assertion
import { describe, expectTypeOf, it } from 'vitest';
import type { Frame } from '../../src/kernel/frames.ts';
import type { FrameTransaction } from '../../src/kernel/transaction.ts';

type ExamplePart = { item: HTMLElement | null };

const transaction = null as unknown as FrameTransaction<ExamplePart>;

describe('FrameTransaction', () => {
  it('should refuse a write through the committed-frame reader', () => {
    // The published frame takes writes from one place only — the swap — and
    // the reader is what says so to every holder of the entity.
    // @ts-expect-error: `current` reads back `Readonly<Frame<Part>>`
    transaction.current.phase = 3;
  });

  it('should refuse a replacement of the pair from outside', () => {
    // Accessors without setters, because the entity swaps the two references
    // itself: a holder that could assign one of them could publish a frame no
    // transaction ever opened.
    // @ts-expect-error: `current` has no setter
    transaction.current = transaction.draft;
  });

  it('should hand the draft back writable, because its owner writes it', () => {
    expectTypeOf(transaction.draft).toEqualTypeOf<Frame<ExamplePart>>();
  });

  it('should declare exactly the protocol and no more', () => {
    // **The member set is the claim.** The entity is the pair, the copy, the
    // swap and the reset over both — every other fact a transaction is judged
    // against is owned somewhere else, and a member appearing here is how that
    // stops being true quietly.
    expectTypeOf<keyof FrameTransaction<ExamplePart>>().toEqualTypeOf<
      'current' | 'draft' | 'begin' | 'commit' | 'retire'
    >();
  });
});
