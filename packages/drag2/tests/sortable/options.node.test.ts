/**
 * The numeric domains of every public option — and, since D-77, mostly the
 * **absence** of a check where one used to stand.
 *
 * ~~Each is validated as early as its value exists, which for a fixed option is
 * construction, with the offending call still on the stack.~~ That rule was
 * re-derived package-wide under `CODE_OF_SIZE.md` and replaced by a narrower
 * one (03 §Public option domains):
 *
 * > A construction-time throw is permitted only for an invariant over what
 * > installers **contribute**. Required configuration is a **type** obligation,
 * > discharged by the required first argument. A consumer scalar's domain
 * > belongs to the consumer, to the platform, or to the seam that consumes it.
 *
 * **The negative half is asserted in both forms, deliberately** (05 §The
 * required first argument): a deleted check that nothing pins is a check a
 * later pass re-adds, so every deletion below is asserted as a deletion *and*
 * paired with whatever answers in its place.
 *
 * `landing({ duration })` is the last numeric domain here, and every row it
 * keeps is a deletion: the tail is an interpolation the kernel starts *after*
 * the terminal, so no duration a consumer writes can withhold an operation's
 * end. What judges one is the platform's `animate()`, at landing time, and a
 * refusal reaches the consumer as a warning that changed nothing about the
 * drop.
 */
import { describe, expect, it } from 'vitest';
import { assemble } from '../../src/sortable/assemble.ts';
import {
  mergeFragments,
  type SortableConfig,
} from '../../src/sortable/config.ts';
import { ReorderResolution } from '../../src/sortable/domain.ts';
import type { FeatureContext } from '../../src/sortable/feature.ts';
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { y } from '../../src/sortable/y.ts';

const context: FeatureContext = {
  realm: null as never,
  root: null as never,
  report: (): void => {},
};

/** The required slots, as the required first argument now supplies them. */
const required = (): SortableConfig => ({
  items: (): readonly HTMLElement[] => [],
  onReorder: () => ReorderResolution.accept(),
  axis: y(),
});

/** Assembling is what applies the defaults, so it is what reads them. */
const assembleWith = (options: Record<string, unknown>): unknown =>
  assemble(mergeFragments({ ...required(), ...options }, []), context);

describe('threshold', () => {
  it('should default to 8 CSS pixels', () => {
    expect(assembleWith({})).toMatchObject({ threshold: 8 });
  });

  it('should accept zero, meaning the first move that reports a new point', () => {
    expect(assembleWith({ threshold: 0 })).toMatchObject({ threshold: 0 });
  });

  it('should no longer refuse a negative distance', () => {
    // **Deleted (D-77).** Nothing answers in its place, and that is the whole
    // verdict: a threshold outside its domain makes the travel test
    // permanently false, so the drag never activates and **no operation
    // starts**. The consumer's own drag is broken; no library invariant moves.
    expect(() => assembleWith({ threshold: -1 })).not.toThrow();
  });

  it('should no longer refuse a non-finite distance', () => {
    expect(() => assembleWith({ threshold: Number.NaN })).not.toThrow();
    expect(() =>
      assembleWith({ threshold: Number.POSITIVE_INFINITY }),
    ).not.toThrow();
  });

  it('should carry the out-of-domain value through to the slot unchanged', () => {
    // The positive form of the same deletion: the value is not repaired,
    // clamped or defaulted either. It reaches the travel test as written.
    expect(assembleWith({ threshold: -1 })).toMatchObject({ threshold: -1 });
  });
});

describe('the required slots', () => {
  it('should not diagnose a missing axis with a library message', () => {
    // **Three checks deleted (D-77)**, because the required first argument is
    // a compile error when any of them is absent — asserted as such by the
    // `@ts-expect-error` fixtures in `tests/revision/revision-2.ts`.
    //
    // **A missing axis still fails, and the distinction is the point rather
    // than a leftover.** What the deleted check supplied was a *message*, not
    // the failure: a JS consumer reaching here meets their own native
    // `TypeError` out of their own `sortable()` call, with no stage, no
    // `DraggableError` and no `onError`. So the assertion is not "it stops
    // throwing" — it is that the library no longer spends bytes restating what
    // the type already refuses.
    //
    // **The site moved with D-146 and the message with it.** The key is called
    // directly now rather than pushed into a list of installers, so an absent
    // `axis` fails at the call instead of at the flat record's dereference of a
    // resolver that never arrived — which names the offending key rather than
    // reporting a null read three statements later. An axis that *is* a
    // function and returns no geometry still fails at the dereference, inside
    // the unwind bracket, which is the case D-77 left runtime.
    expect(() =>
      assemble(mergeFragments({} as unknown as SortableConfig, []), context),
    ).toThrow(/config\.axis is not a function/u);

    expect(() =>
      assemble(mergeFragments({} as unknown as SortableConfig, []), context),
    ).not.toThrow(/an axis — y\(\) or xy\(\) — is required/u);
  });

  it('should not check the other two required slots at all', () => {
    // `items` and `onReorder` are dereferenced by nobody at assembly time, so
    // unlike the axis they produce no construction failure of any kind. They
    // are answered where they are consumed — `onReorder` at the resolution
    // seam, `items` at the construction-time pull in `behavior.ts`.
    expect(() =>
      assemble(
        mergeFragments({ axis: y() } as unknown as SortableConfig, []),
        context,
      ),
    ).not.toThrow();
  });

  it('should not be checked for being functions', () => {
    expect(() =>
      assembleWith({ items: 'not a function', onReorder: 42 }),
    ).not.toThrow();
  });

  it('should keep a non-function slot intact for the seam that consumes it', () => {
    // What answers instead: the value arrives at the seam and throws there,
    // where the kernel classifies it — `onReorder` at `FAILURE_RESOLUTION` →
    // `consumer`. The assembler's job is to not get in the way of that.
    expect(assembleWith({ onReorder: 42 })).toMatchObject({ onReorder: 42 });
  });
});

describe('the merge', () => {
  it('should let a later fragment replace a required slot', () => {
    const replacement = y();

    expect(mergeFragments(required(), [{ axis: replacement }])).toMatchObject({
      axis: replacement,
    });
  });

  it('should not let a later fragment clear a required slot with undefined', () => {
    // **B-9 (c) — the clause the type cannot cover.** A `Partial` carrying
    // `axis: undefined` is a legal value, and the merge's `undefined` skip is
    // now the only thing between it and a required slot that is `undefined` at
    // the seam. It was a nicety while three construction throws stood behind
    // it and is load-bearing without them.
    const config = required();

    expect(mergeFragments(config, [{ axis: undefined }])).toMatchObject({
      axis: config.axis,
    });
  });

  it('should not let a later fragment clear items or onReorder either', () => {
    const config = required();

    expect(
      mergeFragments(config, [{ items: undefined, onReorder: undefined }]),
    ).toMatchObject({ items: config.items, onReorder: config.onReorder });
  });

  it('should let a later fragment replace the displacement slot', () => {
    // **There is no appending slot left.** `plugins` was the one position with
    // unbounded arity and it went with the bracket it existed for, so every
    // key — displacement included — is one writer and last-wins (D-157).
    const first = (): never => null as never;
    const second = (): never => null as never;

    expect(
      mergeFragments({ ...required(), displacement: first }, [
        { displacement: second },
      ]).displacement,
    ).toBe(second);
  });
});

describe('landing duration', () => {
  it('should default to 200 milliseconds', () => {
    expect(() => landing()).not.toThrow();
  });

  it('should accept zero, which the platform interpolates instantly', () => {
    expect(() => landing({ duration: 0 })).not.toThrow();
  });

  it('should no longer refuse a negative duration at construction', () => {
    // **Narrowed, not deleted (D-77).** What answers instead is `animate()`,
    // which rejects a negative duration itself — measured, Chrome 150. The
    // refusal is raised where the tail starts, which is after the drop is
    // decided and reported, so it reaches the consumer as a warning rather than
    // as a failure of the operation (D-155).
    expect(() => landing({ duration: -1 })).not.toThrow();
  });

  it('should no longer refuse a non-finite duration at construction', () => {
    expect(() => landing({ duration: Number.NaN })).not.toThrow();
    expect(() => landing({ duration: Number.NEGATIVE_INFINITY })).not.toThrow();
  });

  it('should not refuse Infinity at construction either', () => {
    // Construction judges no duration at all. An unbounded one is a
    // contribution that never decays, on an element the library released
    // before it started — the next activation cancels it, and so does
    // `destroy()`.
    expect(() => landing({ duration: Number.POSITIVE_INFINITY })).not.toThrow();
  });

  it('should not validate easing, which only the platform can parse', () => {
    expect(() => landing({ easing: 'not-an-easing' })).not.toThrow();
  });

  it('should not call a duration thunk at construction', () => {
    // 13b B-2: a thunk is read at **settle time**, which is the moment the
    // shipped package's `landingTiming()` was read. Calling it here would put
    // it back at construction and lose the whole point.
    let reads = 0;

    landing({
      duration: () => {
        reads += 1;
        return 200;
      },
    });

    expect(reads).toBe(0);
  });

  it('should not range-check a duration thunk at construction', () => {
    expect(() => landing({ duration: () => -1 })).not.toThrow();
  });
});

describe('layoutAnimation duration', () => {
  it('should default to 160 milliseconds', () => {
    expect(() => layoutAnimation()).not.toThrow();
  });

  it('should accept zero', () => {
    expect(() => layoutAnimation({ duration: 0 })).not.toThrow();
  });

  it('should no longer refuse a negative duration', () => {
    // **Deleted (D-77).** This animation is registered in `running` and
    // cancelled by `retire()`, so an unbounded one leaves displaced rows offset
    // until the controller is destroyed and costs the library nothing.
    expect(() => layoutAnimation({ duration: -1 })).not.toThrow();
  });

  it('should no longer refuse a non-finite duration', () => {
    expect(() => layoutAnimation({ duration: Number.NaN })).not.toThrow();
    expect(() =>
      layoutAnimation({ duration: Number.POSITIVE_INFINITY }),
    ).not.toThrow();
  });
});
