/**
 * Free drag's **validation matrix** — B-4, all five clauses.
 *
 * 07 §Validation, whose two tables are asserted **differently**, which is
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
import {
  DraggableError,
  DraggableWarning,
  toDraggableError,
} from '../../src/kernel/errors.ts';
import {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_LANDING_CREATE,
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

const { compose } = freeDragHarness();

/** The coarse code a stage maps to, read from `STAGE_TO_CODE` (D-64, B-4 b). */
const codeOf = (stage: Parameters<typeof toDraggableError>[0]): string =>
  toDraggableError(stage, null).code;

const codes = (errors: readonly unknown[]): readonly string[] =>
  errors.map((error) => (error as { code: string }).code);

/** For the warning population, which carries a message where a code would be. */
const messages = (errors: readonly unknown[]): readonly string[] =>
  errors.map((error) => (error as Error).message);

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
    // **F-76.** 07 §Validation, whose table pairs `visual` with `onStart` at
    // activation →
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

  it('should warn on a throwing home and leave the drop standing', async () => {
    // **D-49, as revised by D-130.** `anchorTarget` runs unclassified, so the
    // landing is skipped rather than faked and the verdict the consumer already
    // gave stands. A rejected drop is the fixture because that is the arm that asks
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

    // **A warning since D-130.** ~~`FAILURE_LANDING_TARGET` → `presentation`.~~
    // The landing measurement is the case rider 1 exists for: the drop's
    // terminal, phase sequence and settlement are identical whether or not the
    // target could be produced, and only the trajectory changes. So the stage
    // that existed to make it *classified, non-consequential and recovery-less*
    // is gone, and the class carries what the stage carried.
    expect(composed.errors).toHaveLength(1);
    expect(composed.errors[0]).toBeInstanceOf(DraggableWarning);
    expect(composed.errors[0]).not.toBeInstanceOf(DraggableError);
    expect((composed.errors[0] as DraggableWarning).message).toBe(
      'drag: landing/target-unavailable',
    );
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

  it('should discard a throwing onError rather than reporting it back', () => {
    // **The terminus** (D-130 §1.3). ~~A failure report leaves through the
    // platform channel, and nothing recurses.~~ There is no second destination
    // to leave through any more, so the throw is *discarded* — and being
    // incapable of recursion is the property, not being careful about it.
    //
    // Counted rather than merely observed: a handler that threw was still
    // called, and the assertion is that it was called **once**. A channel that
    // re-notified its own failure would call it again with the throw it just
    // produced, and again with that one.
    const seen: unknown[] = [];
    const composed = compose({
      config: {
        onStart: () => {
          throw new Error('onStart');
        },
        onError: (error) => {
          seen.push(error);
          throw new Error('onError');
        },
      },
    });

    activate(composed);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(DraggableError);
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
  });
});

describe('the landing duration domain', () => {
  const landingFailure = codeOf(FAILURE_LANDING_CREATE);

  it('should not refuse an unbounded duration', async () => {
    // **B-4 (d), restated at Checkpoint E** (E-07). Free drag deliberately does
    // **not** arm a landing for an accepted result — an accepted drop is
    // already at its destination — so this is the arm that evaluates a
    // duration at all.
    //
    // **The refusal went 2026-08-25 (D-124).** `Infinity` is the one duration
    // the platform accepts and never completes, and _a duration is finite_ is
    // the size doctrine's own paradigm of a precondition an integrator can
    // meet and find, so the gate closes at reachability.
    //
    // **What this row pins is acceptance: no failure.** It held the absent
    // terminal too until the D-124 landing review (§1.1 (C)) — an assertion
    // that made the negation of D-66's exactly-once promise a regression
    // contract over input the contract does not admit. What the operation then
    // does is in D-124's row, and the landing is torn down below because it is
    // not coming back on its own.
    const composed = compose({
      fragments: [landing({ duration: Number.POSITIVE_INFINITY })],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    release(30, 10);
    await settled();
    await frame();
    await settled();

    expect(codes(composed.errors)).toEqual([]);

    // The operation is still open, so the harness is torn down explicitly
    // rather than left to a terminal that is never coming.
    void composed.controller.destroy();
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

describe('a non-finite moveTo() reaching the landing distance', () => {
  /**
   * **The coupling, executed rather than traced** (D-124, and the audit's own
   * falsifier: _"§2's coupling was traced by reading… that fixture is worth
   * writing"_).
   *
   * `moveTo`'s coordinates are committed as `offsetX`/`offsetY`, the kernel
   * builds `LandingContext.from` from the rendered offsets, and the runner
   * mints `distance: Math.hypot(target - from)` for the `duration` thunk. So a
   * value the contract stopped guarding at one end arrives, **library-minted**,
   * at a conforming author's arithmetic at the other. Both guards were deleted
   * in one decision because of this path, and it is pinned here so that a
   * later pass restoring one of them without the other has to say so.
   */
  const dropAfterMoveTo = async (
    x: number,
  ): Promise<
    Readonly<{ distances: number[]; composed: ReturnType<typeof compose> }>
  > => {
    const distances: number[] = [];
    const composed = compose({
      fragments: [
        landing({
          // Exactly the use D-67 added the context for.
          duration: ({ distance }): number => {
            distances.push(distance);
            return distance / 2;
          },
        }),
      ],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    composed.controller.moveTo({ x, y: 10 });
    release(30, 10);
    await settled();
    await frame();
    await settled();

    return { distances, composed };
  };

  it('should mint a non-finite distance for a conforming duration thunk', async () => {
    const { distances, composed } = await dropAfterMoveTo(
      Number.POSITIVE_INFINITY,
    );

    expect(distances).toHaveLength(1);
    expect(Number.isFinite(distances[0]!)).toBe(false);

    void composed.controller.destroy();
  });

  it('should carry the minted distance into the landing unrefused', async () => {
    // The second half of the coupling: the minted value is not merely handed
    // to the thunk, it goes on into the landing, and neither end of the path
    // refuses it. That is what makes the two deletions one decision.
    //
    // ~~And the operation then has no terminal at all.~~ **That assertion went
    // 2026-08-25** (the D-124 landing review, §1.1 (C)) — it froze the shape of
    // undefined behaviour, which D-124's own row records in prose where it
    // belongs.
    const { composed } = await dropAfterMoveTo(Number.POSITIVE_INFINITY);

    expect(codes(composed.errors)).toEqual([]);

    void composed.controller.destroy();
  });
});

describe('an invalid home result', () => {
  /** The landing measurement is advisory, so it arrives as a warning (D-130). */
  const landingTarget = 'drag: landing/target-unavailable';

  /** Drives a rejected drop, which is the arm that asks `home` where to go. */
  const dropHome = async (
    home: FreeDragConfig['home'],
  ): Promise<ReturnType<typeof compose>> => {
    const composed = compose({
      config: { home },
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    release(30, 10);
    await settled();
    await frame();
    await settled();

    return composed;
  };

  it('should attribute a null result to the landing target seam', async () => {
    // **E-05.** 07 §Validation, which already publishes this attribution; the
    // shipped
    // `anchorTarget` returned the consumer's object verbatim, and the kernel
    // reads `.x`/`.y` *outside* the quality wrapper that covers the call. So a
    // `null` panicked outside the seam its own contract names, and the review's
    // probe expected one attributed `onError` and received none.
    const composed = await dropHome((() => null) as never);

    expect(messages(composed.errors)).toEqual([landingTarget]);
  });

  it('should let a non-finite result compose into the target unattributed', async () => {
    // **D-124.** The finiteness throw went with the reachability gate — a
    // landing target is a point, and a point's coordinates are finite by the
    // same obvious semantics that makes a duration finite, so a non-finite
    // pair is outside the contract. `domain.d.ts` now publishes that as a
    // boundary. What the old throw prevented is what happens instead: nothing
    // throws, nothing is classified, and the value reaches a renderer as a
    // transform nobody can see. The operation still ends exactly once.
    const composed = await dropHome(() => ({
      x: Number.NaN,
      y: Number.POSITIVE_INFINITY,
    }));

    expect(codes(composed.errors)).toEqual([]);
    expect(composed.ends).toHaveLength(1);
  });

  it('should attribute a result with a throwing accessor to the same seam', async () => {
    // The point is read inside the seam, so a live accessor throws where the
    // quality wrapper can classify it rather than into the join.
    const composed = await dropHome(() => ({
      get x(): number {
        throw new Error('home: gone');
      },
      y: 0,
    }));

    expect(messages(composed.errors)).toEqual([landingTarget]);
  });

  it('should end the operation once despite the invalid target', async () => {
    // **The quality track's whole point** (D-49): a drop that already committed
    // is not re-settled. The landing is skipped rather than faked, and the
    // consumer still hears the verdict it gave.
    const composed = await dropHome((() => null) as never);

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('rejected');
  });

  it('should reach no onError when the resolver destroys and then throws', async () => {
    // **E-03's quality route, and the half `runAdmission` does not cover.**
    // `reportQuality` delegated to the behavior's hook unconditionally, and its
    // producers are consumer-reaching too — this one is `home`, which is free
    // drag's only consumer call on the landing-target path. A resolver that
    // calls `destroy()` and *then* throws would otherwise have its own
    // destruction reported back to it through a declared callback.
    //
    // `armSettlement`'s `settlementLive()` check runs **after** the report, so
    // it never saw this ordering; the reading belongs where the report is made.
    const composed = compose({
      config: {
        home: () => {
          void composed.controller.destroy();
          throw new Error('home: gone');
        },
      },
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    release(30, 10);
    await settled();
    await frame();
    await settled();

    expect(composed.errors).toEqual([]);
    // `destroy()` publishes no terminal at all, so the absence here is the
    // floor holding rather than a terminal that merely arrived early.
    expect(composed.ends).toEqual([]);
    expect(composed.errors).toEqual([]);
  });

  it('should accept a finite result and travel to it', async () => {
    // The positive control, without which the rows above are satisfied by an
    // `anchorTarget` that refuses every consumer point.
    const composed = await dropHome(() => ({ x: 5, y: 7 }));

    expect(composed.errors).toEqual([]);
    expect(composed.ends).toHaveLength(1);
  });
});
