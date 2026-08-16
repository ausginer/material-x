/**
 * Free drag's **validation matrix** — B-4, all five clauses.
 *
 * 07 §Validation is two tables and they are asserted **differently**, which is
 * the whole criterion: a value in the *classified* table surfaces at a named
 * seam, reaches `onError` with that row's coarse code and ends the operation;
 * a value in the *silent* table produces **no `onError`, no terminal and no
 * classification at all**. Asserting the second half the way one asserts the
 * first is how a deleted check gets quietly re-added.
 *
 * **Codes are read from the mapping, never retyped.** Every expectation is
 * `toDraggableError(FAILURE_X, null).code`, so a remap in `STAGE_TO_CODE` fails
 * these rows instead of passing them — which is what B-4 (b) asks for and what
 * a literal `'presentation'` could not give.
 *
 * **The `bounds` row is four fixtures, not one** (D-81, F-71, F-73). The rect
 * starts stale, so the *first* resolve is at activation; after a staleness mark
 * the next `apply` decides, and that is three further seams with two different
 * codes. A single fixture asserting one code passes while the other three paths
 * are unattributed.
 */
import { describe, expect, it } from 'vitest';
import { bounds } from '../../src/free-drag/bounds.ts';
import { landing } from '../../src/free-drag/landing.ts';
import {
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import { toDraggableError } from '../../src/kernel/errors.ts';
import {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_TARGET,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_TERMINAL_CALLBACK,
} from '../../src/kernel/failures.ts';
import {
  activate,
  freeDragHarness,
  frame,
  move,
  press,
  release,
  settled,
} from '../support/free-drag.ts';

const { compose, reported } = freeDragHarness();

/** The coarse code a stage maps to, read from `STAGE_TO_CODE` (D-64, B-4 b). */
const codeOf = (stage: Parameters<typeof toDraggableError>[0]): string =>
  toDraggableError(stage, null).code;

const codes = (errors: readonly unknown[]): readonly string[] =>
  errors.map((error) => (error as { code: string }).code);

/**
 * A bounds source that answers normally until it is armed, then throws on every
 * resolve. **Arming is what makes the four paths separable**: the rect is
 * resolved at activation, so a source that threw from the start could only ever
 * be observed there.
 */
function armableBounds(): Readonly<{
  fragment: Partial<FreeDragConfig>;
  arm(): void;
}> {
  let armed = false;

  return {
    arm(): void {
      armed = true;
    },
    fragment: bounds(() => {
      if (armed) {
        throw new Error('bounds: the source is broken');
      }

      return new DOMRectReadOnly(0, 0, 10_000, 10_000);
    }),
  };
}

describe('the classified table', () => {
  it('should classify a throwing handle resolver as a consumer fault', () => {
    const composed = compose({
      config: {
        handle: () => {
          throw new Error('handle');
        },
      },
    });

    activate(composed);

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_ADMISSION)]);
  });

  it('should publish no terminal for a fault that lands before any operation is minted', () => {
    // **The exactly-once rule is per *started* operation** (D-66, Q-15). A
    // throwing `handle` fails inside `admit`, which runs before the operation
    // exists — so there is a report and deliberately no end. B-4 (b)'s
    // whole-table phrasing reads as though every classified row published one;
    // this row is why the two halves are asserted separately (F-75).
    const composed = compose({
      config: {
        handle: () => {
          throw new Error('handle');
        },
      },
    });

    activate(composed);

    expect(composed.ends).toEqual([]);
    expect(composed.starts).toEqual([]);
  });

  it('should classify a throwing visual resolver at admission, not at activation', () => {
    // **F-76.** 07 §Validation pairs `visual` with `onStart` at activation →
    // `interaction`. Free drag resolves the visual inside `admit` — D-59's
    // common form, since `box === visual` for a behavior with no placeholder —
    // so the throw is `FAILURE_ADMISSION` → `consumer`, one seam earlier and
    // one code away from the table. The sortable resolves it in the same place.
    // Recorded rather than repaired: the code is correct and the row is the
    // thing that is wrong.
    const composed = compose({
      config: {
        visual: () => {
          throw new Error('visual');
        },
      },
    });

    activate(composed);

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_ADMISSION)]);
  });

  it('should classify a throwing onStart as an interaction fault with one terminal', () => {
    const composed = compose({
      config: {
        onStart: () => {
          throw new Error('onStart');
        },
      },
    });

    activate(composed);

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_ACTIVATION)]);
    // The marker advanced **before** the call (D-66), so the consumer has been
    // told the drag began and is owed exactly one end.
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('canceled');
  });

  it('should classify a throwing onMove as a presentation fault with one terminal', async () => {
    const composed = compose({
      config: {
        onMove: () => {
          throw new Error('onMove');
        },
      },
    });

    activate(composed);
    // A second sample, because `onMove` is the move leaf's own callback and
    // activation notifies through `onStart` instead.
    move(50, 40);
    await settled();

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_RENDERER_WRITE)]);
    expect(composed.ends).toHaveLength(1);
  });

  it('should classify a throwing home on the quality track and leave the drop standing', async () => {
    // **D-49.** `anchorTarget` runs on the quality track, so the landing is
    // skipped rather than faked and the verdict the consumer already gave
    // stands. A rejected drop is the fixture because that is the arm that asks
    // for a home at all.
    const composed = compose({
      onDrop: () => FreeDragResolution.reject('nope'),
      config: {
        home: () => {
          throw new Error('home');
        },
      },
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_LANDING_TARGET)]);
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('rejected');
  });

  it('should classify a throwing onEnd as a consumer fault', async () => {
    const errors: unknown[] = [];
    const composed = compose({
      config: {
        onEnd: () => {
          throw new Error('onEnd');
        },
        onError: (error) => {
          errors.push(error);
        },
      },
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(codes(errors)).toEqual([codeOf(FAILURE_TERMINAL_CALLBACK)]);
  });

  it('should classify a non-function onDrop as a consumer fault with one terminal', async () => {
    // The JS consumer's path: the type says `OnDrop`, and a release with
    // nothing to ask is a designed `SeamRejection` rather than a construction
    // throw (D-77).
    const composed = compose({
      onDrop: 42 as unknown as FreeDragConfig['onDrop'],
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_RESOLUTION)]);
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('canceled');
  });

  it('should send a throwing onError to the platform channel rather than classifying it', () => {
    // **A failure report may not itself fail.** There is no second classified
    // stage for it, so it leaves through `reportError` — the un-classified
    // channel — and nothing recurses.
    const composed = compose({
      config: {
        onStart: () => {
          throw new Error('onStart');
        },
        onError: () => {
          throw new Error('onError');
        },
      },
    });

    activate(composed);

    expect(reported()).toHaveLength(1);
  });
});

describe('a garbage bounds source', () => {
  it('should surface at activation as an interaction fault on its first resolve', () => {
    // **The dominant path** (F-73): the rect starts stale and
    // `activation.effect` places the visual at the accumulated grab delta, so
    // the first `apply` of every operation happens there.
    const composed = compose({
      fragments: [
        bounds(() => {
          throw new Error('bounds');
        }),
      ],
    });

    activate(composed);

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_ACTIVATION)]);
  });

  it('should surface from a committed sample as a presentation fault', () => {
    const source = armableBounds();
    const composed = compose({ fragments: [source.fragment] });

    activate(composed);
    source.arm();
    composed.controller.invalidate();
    move(50, 40);

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_RENDERER_WRITE)]);
  });

  it('should surface from a moveTo effect as a presentation fault', () => {
    const source = armableBounds();
    const composed = compose({ fragments: [source.fragment] });

    activate(composed);
    source.arm();
    composed.controller.invalidate();
    composed.controller.moveTo({ x: 60, y: 25 });

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_ACTION_EFFECT)]);
  });

  it('should surface from the release as an interaction fault', async () => {
    const source = armableBounds();
    const composed = compose({ fragments: [source.fragment] });

    activate(composed);
    source.arm();
    composed.controller.invalidate();
    release(30, 10);
    await settled();

    expect(codes(composed.errors)).toEqual([codeOf(FAILURE_RELEASE)]);
  });

  it('should never surface from the action that marks it stale', () => {
    // **`FAILURE_ACTION_PREPARE` is not reachable from this row at all** — the
    // negative half of D-81, and the row that would fail if `invalidate()` ever
    // stopped being a staleness flag and started resolving. Nothing renders
    // between the arming and the assertion, so nothing calls `apply`.
    const source = armableBounds();
    const composed = compose({ fragments: [source.fragment] });

    activate(composed);
    source.arm();
    composed.controller.invalidate();

    expect(composed.errors).toEqual([]);
    expect(reported()).toEqual([]);
  });

  it('should publish exactly one terminal for each path that reaches one', async () => {
    // Two paths, one assertion each way: the activation path fails before
    // `onStart` and therefore publishes **none** (D-66's no-start case), while
    // the release path fails after it and publishes exactly one.
    const early = compose({
      fragments: [
        bounds(() => {
          throw new Error('bounds');
        }),
      ],
    });

    activate(early);
    await settled();

    expect(early.ends).toEqual([]);

    const source = armableBounds();
    const late = compose({ fragments: [source.fragment] });

    activate(late);
    source.arm();
    late.controller.invalidate();
    release(30, 10);
    await settled();

    expect(late.ends).toHaveLength(1);
    expect(late.ends[0]!.type).toBe('canceled');
  });
});

describe('the silent table', () => {
  it('should start no operation at all for a NaN threshold', async () => {
    // Q-15, and the reason B-4 (c) must not ask for a terminal here: a `NaN`
    // threshold makes the travel test permanently false, so the press arms and
    // never activates. Asserting an end would be asserting a defect.
    const composed = compose({ config: { threshold: Number.NaN } });

    press(composed.item);
    move(500, 500);
    release(500, 500);
    await settled();

    expect(composed.starts).toEqual([]);
    expect(composed.ends).toEqual([]);
    expect(composed.errors).toEqual([]);
    expect(reported()).toEqual([]);
  });

  it('should complete a normal drag for an unknown lift string', async () => {
    // A TS consumer cannot express it — `LIFT_MODES` is a total `Record`, so a
    // mode without a mapping does not compile. A JS consumer reaches
    // `undefined` in the map and gets whichever branch `presentation.ts` falls
    // through to: consumer-owned, and nothing fails.
    const composed = compose({
      config: { lift: 'top-layer' as unknown as FreeDragConfig['lift'] },
    });

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('accepted');
    expect(composed.errors).toEqual([]);
    expect(reported()).toEqual([]);
  });
});

describe('the landing duration domain', () => {
  const landingFailure = codeOf(FAILURE_LANDING_CREATE);

  it('should refuse Infinity and let the accepted drop survive it', async () => {
    // **B-4 (d).** `Infinity` is the one duration the platform accepts and
    // never completes, so the library refuses it — and free drag's
    // `SETTLED_FAILED` mapping keeps the verdict the consumer already gave
    // (D-24, D-49). The assertion is on the drop's survival, not on which
    // track the kernel used.
    const composed = compose({
      fragments: [landing({ duration: Number.POSITIVE_INFINITY })],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    release(30, 10);
    await settled();
    await frame();
    await settled();

    expect(codes(composed.errors)).toEqual([landingFailure]);
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('rejected');
  });

  /**
   * **B-4 (e).** These are not checked by the library at all: `animate()`
   * refuses them itself, at the same call, at the same stage, with a message
   * naming its own domain — measured, and the artifact is
   * `.plan/measurements/animate-duration-domain.md` (D-79). Without these rows
   * a later pass re-adds `requireFinite` and nothing notices.
   *
   * Written as four `it` calls rather than one `it.each`, because
   * `tests/coverage.node.test.ts` matches cited names against the **first
   * string literal** of a test call and an interpolated title is uncitable.
   */
  const platformRefuses = async (duration: unknown): Promise<void> => {
    const composed = compose({
      fragments: [landing({ duration: duration as number })],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    release(30, 10);
    await settled();
    await frame();
    await settled();

    expect(codes(composed.errors)).toEqual([landingFailure]);
    expect(composed.ends).toHaveLength(1);
  };

  it('should leave a NaN duration to the platform', async () => {
    await platformRefuses(Number.NaN);
  });

  it('should leave a negative duration to the platform', async () => {
    await platformRefuses(-1);
  });

  it('should leave a -Infinity duration to the platform', async () => {
    await platformRefuses(Number.NEGATIVE_INFINITY);
  });

  it('should leave a string duration to the platform', async () => {
    await platformRefuses('fast');
  });

  it('should land normally for the auto duration', async () => {
    // Reachable only from JavaScript — `LandingDuration` returns `number` — and
    // it is what pins the guard to `=== Infinity` rather than to a finiteness
    // test, since a domain check would have refused an accepted value.
    const composed = compose({
      fragments: [landing({ duration: 'auto' as unknown as number })],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    release(30, 10);
    await settled();
    await frame();
    await settled();

    expect(composed.errors).toEqual([]);
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('rejected');
  });
});
