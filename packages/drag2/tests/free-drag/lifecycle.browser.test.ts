/**
 * Free drag's **lifecycle matrix** — L-1 through L-4.
 *
 * The rows here are the ones that need something the ordinary tier does not
 * ship: a middle-tier installer. **That is not a convenience, it is what makes
 * two of them falsifiable** (D-81, F-74):
 *
 * - **L-3** is a terminal barrier between two consumer-reachable calls. With
 *   the first-party `bounds()` the second call reaches no consumer code at all,
 *   because `invalidate()` is a staleness flag — so a `bounds()`-based fixture
 *   passes whether or not the barrier exists. The discriminating fixture
 *   supplies a `constrain` installer whose `invalidate()` *records that it ran*,
 *   which is also the honest statement of the contract: the slot admits
 *   arbitrary third-party code, and that is why the barrier is owed.
 * - **L-4** asks where the landing *opens*. `LandingContext.from` is the only
 *   place that answers, and a third-party `startLanding` is how a test reads it
 *   without asserting against an animation's keyframes.
 *
 * Both installers are authored against `free-drag/feature.js` alone, which is
 * B-6's claim exercised rather than merely typed.
 */
import { describe, expect, it } from 'vitest';
import { bounds } from '../../src/free-drag/bounds.ts';
import type {
  ConstraintView,
  ConstraintInstaller,
  FreeDragLandingInstaller,
  MotionDraft,
} from '../../src/free-drag/feature.ts';
import {
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import type { Point } from '../../src/kernel/types.ts';
import {
  activate,
  cancelPointer,
  freeDragHarness,
  move,
  press,
  release,
  settled,
} from '../support/free-drag.ts';

const { compose } = freeDragHarness();

/**
 * A third-party motion constraint, authored out of line against the middle
 * tier (B-6). It records every `invalidate()` and optionally clamps.
 */
function recordingConstraint(
  clamp?: (motion: MotionDraft, view: ConstraintView) => void,
): Readonly<{ fragment: Partial<FreeDragConfig>; invalidations: number[] }> {
  const invalidations: number[] = [];
  let calls = 0;

  const installer: ConstraintInstaller = () => ({
    constrain: {
      apply(motion: MotionDraft, view: ConstraintView): void {
        clamp?.(motion, view);
      },
      invalidate(): void {
        calls += 1;
        invalidations.push(calls);
      },
      retire(): void {},
    },
  });

  return { fragment: { bounds: installer }, invalidations };
}

/** A third-party landing that records where the trajectory opened. */
function recordingLanding(): Readonly<{
  fragment: Partial<FreeDragConfig>;
  origins: Point[];
}> {
  const origins: Point[] = [];

  const installer: FreeDragLandingInstaller = () => ({
    startLanding: (context, done) => {
      origins.push({ x: context.fromX, y: context.fromY });
      done();
      return { destroy: (): void => {} };
    },
  });

  return { fragment: { landing: installer }, origins };
}

describe('the released visual', () => {
  it('should be restored before the terminal is published', async () => {
    // Ledger §6.2: the consumer's `onEnd` sees an element the library has
    // already let go of, not one it is still holding.
    const seen: string[] = [];
    const composed = compose({
      config: {
        onEnd: (): void => {
          seen.push(composed.item.style.position);
        },
      },
    });

    activate(composed);

    expect(composed.item.style.position).toBe('fixed');

    release(30, 10);
    await settled();

    expect(seen).toEqual(['']);
  });

  it('should retain nothing from a completed drag', async () => {
    const composed = compose();

    activate(composed);
    release(30, 10);
    await settled();

    // I-20: an idle controller pins no DOM from the drag it just finished.
    expect(composed.item.style.transform).toBe('');
    expect(composed.item.style.position).toBe('');
  });

  it('should ignore document motion once the operation has terminated', async () => {
    // The behavioural form of "no retained document listeners": whatever the
    // kernel used to bind, nothing reacts to a move that arrives afterwards.
    const composed = compose();

    activate(composed);
    release(30, 10);
    await settled();

    composed.moves.length = 0;
    move(500, 500);
    release(500, 500);
    await settled();

    expect(composed.moves).toEqual([]);
    expect(composed.ends).toHaveLength(1);
    expect(composed.item.style.transform).toBe('');
  });

  it('should admit a second drag after the first completed', async () => {
    const composed = compose();

    activate(composed);
    release(30, 10);
    await settled();

    activate(composed);
    release(30, 10);
    await settled();

    expect(composed.ends).toHaveLength(2);
  });
});

describe('a pending press', () => {
  it('should be disarmed by pointercancel with no terminal', async () => {
    const composed = compose();

    press(composed.item);
    cancelPointer(12, 12);
    await settled();

    expect(composed.starts).toEqual([]);
    expect(composed.ends).toEqual([]);
    expect(composed.errors).toEqual([]);
  });

  it('should be disarmed without disabling the next press', async () => {
    const composed = compose();

    press(composed.item);
    cancelPointer(12, 12);
    activate(composed);
    release(30, 10);
    await settled();

    expect(composed.ends).toHaveLength(1);
  });
});

describe('a late resolution', () => {
  it('should be ignored after cancel(), which already published its terminal', async () => {
    let resolveDrop!: (
      value: ReturnType<typeof FreeDragResolution.accept>,
    ) => void;
    const composed = compose({
      onDrop: () =>
        new Promise((resolve) => {
          resolveDrop = resolve;
        }),
    });

    activate(composed);
    release(30, 10);
    await settled();

    composed.controller.cancel('too slow');
    await settled();

    resolveDrop(FreeDragResolution.accept());
    await settled();

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('canceled');
  });

  it('should be ignored after destroy(), which publishes none', async () => {
    let resolveDrop!: (
      value: ReturnType<typeof FreeDragResolution.accept>,
    ) => void;
    const composed = compose({
      onDrop: () =>
        new Promise((resolve) => {
          resolveDrop = resolve;
        }),
    });

    activate(composed);
    release(30, 10);
    await settled();

    await composed.controller.destroy();
    resolveDrop(FreeDragResolution.accept());
    await settled();

    expect(composed.ends).toEqual([]);
  });
});

describe('the TAG_POLICY barrier', () => {
  it('should not reach a third-party invalidate() when the axis source destroys the controller', () => {
    // **L-3, discriminating** (I-36, F-47, D-81). `TAG_POLICY` reads the `axis`
    // source, then reads the latch, then calls `constrain.invalidate()` — and
    // the middle assertion is the whole row: a source that destroyed its own
    // controller must not have a second consumer-supplied callback run
    // afterwards.
    const constraint = recordingConstraint();
    const composed = compose({
      fragments: [constraint.fragment],
      config: {
        axis: () => {
          if (composed.starts.length > 0) {
            void composed.controller.destroy();
          }

          return 'both';
        },
      },
    });

    activate(composed);
    composed.controller.invalidate();

    expect(constraint.invalidations).toEqual([]);
  });

  it('should reach it when the axis source leaves the controller alive', () => {
    // The positive control, without which the row above passes against a
    // constraint that is simply never installed.
    const constraint = recordingConstraint();
    const composed = compose({
      fragments: [constraint.fragment],
      config: { axis: () => 'both' },
    });

    activate(composed);
    composed.controller.invalidate();

    expect(constraint.invalidations).toEqual([1]);
  });

  it('should be non-discriminating with the first-party bounds()', () => {
    // **The recorded control** (F-74). Under lazy resolution `bounds()`'s
    // `invalidate()` sets a flag and calls nothing, so an `axis` source that
    // destroys its controller and one that does not are indistinguishable
    // through the first-party feature — which is why the two rows above use a
    // recording installer instead. This row asserts the *sameness*, so that a
    // later reader does not mistake a `bounds()`-based fixture for coverage.
    const destroying = compose({
      fragments: [bounds()],
      config: {
        axis: () => {
          if (destroying.starts.length > 0) {
            void destroying.controller.destroy();
          }

          return 'both';
        },
      },
    });

    activate(destroying);
    destroying.controller.invalidate();

    const surviving = compose({
      fragments: [bounds()],
      config: { axis: () => 'both' },
    });

    activate(surviving);
    surviving.controller.invalidate();

    expect([destroying.errors, surviving.errors]).toEqual([[], []]);
  });
});

describe('the landing origin', () => {
  it('should open from the axis-locked delta rather than the pointer', async () => {
    // **L-4**, free drag's half of K-3. The pointer travelled on both axes and
    // the visual did not, so a landing opening from the pointer's delta and one
    // opening from the rendered delta disagree — which is what makes the row
    // discriminating at all.
    const recorder = recordingLanding();
    const composed = compose({
      fragments: [recorder.fragment],
      config: { axis: 'x' },
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();

    expect(recorder.origins).toEqual([{ x: 40, y: 0 }]);
  });

  it('should open from the clamped delta under a bounds constraint', async () => {
    const recorder = recordingLanding();
    const constraint = recordingConstraint((motion) => {
      motion.x = Math.min(motion.x, 25);
      motion.y = Math.min(motion.y, 15);
    });
    const composed = compose({
      fragments: [recorder.fragment, constraint.fragment],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    move(500, 500);
    release(500, 500);
    await settled();

    expect(recorder.origins).toEqual([{ x: 25, y: 15 }]);
  });

  it('should open from the re-based delta after a moveTo()', async () => {
    const recorder = recordingLanding();
    const composed = compose({
      fragments: [recorder.fragment],
      onDrop: () => FreeDragResolution.reject('nope'),
    });
    const origin = composed.item.getBoundingClientRect();

    activate(composed);
    composed.controller.moveTo({ x: origin.left + 60, y: origin.top + 25 });
    release(30, 10);
    await settled();

    expect(recorder.origins).toEqual([{ x: 60, y: 25 }]);
  });

  it('should open from the release point rather than the last processed move', async () => {
    // **The release write L-4 depends on** (D-81, F-39 applied). `pointerup`
    // need not carry the last `pointermove`'s coordinates. A fixture whose
    // release point *agrees* with the last move passes against a
    // `release.effect` that does nothing — so this one deliberately disagrees,
    // by (40, 20).
    const recorder = recordingLanding();
    const composed = compose({
      fragments: [recorder.fragment],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    move(50, 40);
    release(90, 60);
    await settled();

    expect(recorder.origins).toEqual([{ x: 80, y: 50 }]);
  });

  it('should render the release point, not only report it', async () => {
    // The other half of the same write: the transform on the element at the
    // moment the landing opens. Without `release.effect`'s write the visual
    // sits at the last move while the request reports the release point, which
    // is D-35's wrong-start signature arriving from the other end.
    const seen: string[] = [];
    const installer: FreeDragLandingInstaller = () => ({
      startLanding: (context, done) => {
        seen.push(context.visual.style.transform);
        done();
        return { destroy: (): void => {} };
      },
    });
    const composed = compose({
      fragments: [{ landing: installer }],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    move(50, 40);
    release(90, 60);
    await settled();

    // The base matrix is the faithful lift's own — a lifted visual encodes its
    // whole position in it — so the assertion is on the composed string rather
    // than on the translate alone.
    expect(seen).toEqual(['translate(80px, 50px) matrix(1, 0, 0, 1, 0, 0)']);
  });
});

describe('the final activation barrier', () => {
  it('should publish no start when a bounds source destroys the controller', async () => {
    // **E-02, and the row the contract already claimed.** 07's terminal table
    // said the `onStart` latch is read immediately before the call; the
    // implementation read it only after the optional `axis` source, then ran
    // `deriveMotion` — whose `constrain.apply` reaches a third-party constraint
    // and, with `bounds()` installed, the consumer's own rect source — and
    // called `onStart` with no further reading. The review's probe expected
    // zero starts after logical closure and got one.
    const composed = compose({
      fragments: [
        bounds(() => {
          void composed.controller.destroy();
          return new DOMRectReadOnly(0, 0, 10_000, 10_000);
        }),
      ],
    });

    activate(composed);
    await settled();

    expect(composed.starts).toEqual([]);
    expect(composed.ends).toEqual([]);
    expect(composed.errors).toEqual([]);
  });

  it('should still publish a start when the same source leaves the controller alive', () => {
    // The positive control. Without it the row above passes against an
    // activation that never notifies at all.
    const composed = compose({
      fragments: [bounds(() => new DOMRectReadOnly(0, 0, 10_000, 10_000))],
    });

    activate(composed);

    expect(composed.starts).toHaveLength(1);
  });
});

describe('a resolver that destroys and then throws', () => {
  it('should reach no onError from admission', async () => {
    // **E-03.** `runAdmission` catches a throwing `admit` and reported the
    // fault unconditionally — so a `handle` resolver that called `destroy()`
    // and *then* threw had its own destruction handed back to it through a
    // declared callback, after `destroy()` had returned. The floor forbids that
    // outright, and the guard is kernel-side because the rule is controller
    // lifetime rather than domain settlement.
    const composed = compose({
      config: {
        handle: () => {
          void composed.controller.destroy();
          throw new Error('handle: gone');
        },
      },
    });

    press(composed.item);
    await settled();

    expect(composed.errors).toEqual([]);
    expect(composed.ends).toEqual([]);
  });

  it('should still report when it throws without destroying', async () => {
    // The positive control for the same guard: an ordinary throwing resolver is
    // a consumer fault and is still surfaced.
    const composed = compose({
      config: {
        handle: () => {
          throw new Error('handle: broken');
        },
      },
    });

    press(composed.item);
    await settled();

    expect(composed.errors).toHaveLength(1);
  });
});
