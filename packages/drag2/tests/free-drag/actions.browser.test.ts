/**
 * **Action phase legality, per tag** — D-86, closing E-04.
 *
 * `FreeDragController.invalidate()` and `moveTo()` used to reject only a
 * *closed* controller, and the kernel routes behavior tags without interpreting
 * them — deliberately, because the sortable **intentionally** accepts a
 * collection `invalidate()` in phases where free drag's geometry must be
 * frozen. So legality is free drag's own knowledge, tested in free drag's own
 * `action.prepare`, and the sortable's row at the bottom of this file is what
 * would have failed had it been solved in the router instead.
 *
 * **The assertions are on the element's final inline transform, not on a
 * callback count.** A late action that is merely *ignored* by a later seam and
 * one that never stages at all are indistinguishable from a counter; they are
 * not indistinguishable from the DOM. The `onEnd` row is the discriminating
 * one: the success join disposes presentation, calls `finalized`, and only then
 * enqueues `RETIRE`, so a reentrant `moveTo()` from there is FIFO-ahead of
 * retirement and writes through an already-disposed lift. The review's probe
 * caught it as:
 *
 * ```text
 * expected ""   received "translate(80px, 30px) matrix(1, 0, 0, 1, 0, 0)"
 * ```
 *
 * **`ACTIVATING` is legal deliberately**, and the `onStart` row is the positive
 * control without which this whole file could be satisfied by refusing
 * everything.
 */
import { describe, expect, it } from 'vitest';
import type {
  ConstraintView,
  ConstraintInstaller,
  FreeDragLandingInstaller,
  MotionDraft,
} from '../../src/free-drag/feature.ts';
import { landing } from '../../src/free-drag/landing.ts';
import {
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import {
  activate,
  frame,
  freeDragHarness,
  move,
  release,
  settled,
} from '../support/free-drag.ts';

const { compose } = freeDragHarness();

/** Somewhere the visual could only be if a late `moveTo()` had taken effect. */
const FAR = { x: 400, y: 300 };

/**
 * A third-party constraint that records both of its entry points, so a late
 * `invalidate()` can be asserted as *not re-entered* rather than merely as
 * harmless.
 */
function recordingConstraint(): Readonly<{
  fragment: Partial<FreeDragConfig>;
  invalidations: number;
}> {
  const record = { invalidations: 0 };
  const installer: ConstraintInstaller = () => ({
    constrain: {
      apply(_motion: MotionDraft, _view: ConstraintView): void {},
      invalidate(): void {
        record.invalidations += 1;
      },
      retire(): void {},
    },
  });

  return {
    fragment: { bounds: installer },
    get invalidations(): number {
      return record.invalidations;
    },
  };
}

describe('a late moveTo()', () => {
  it('should leave no inline transform when it comes from onEnd', async () => {
    // **The discriminating row** (E-04's probe). `onEnd` runs before `RETIRE`
    // is drained, so this is the one late call that reaches a *disposed* lift
    // and leaves a stray transform on an element the library has let go of.
    const composed = compose({
      config: {
        onEnd: (): void => {
          composed.controller.moveTo(FAR);
        },
      },
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(composed.item.style.transform).toBe('');
    expect(composed.errors).toEqual([]);
  });

  it('should not move the visual when it comes from onDrop', async () => {
    // `RELEASING`: the request is already built from the committed release
    // point and the landing origin is about to be sampled, so a write here
    // alters geometry the consumer is at that moment being asked about.
    //
    // The resolver is left **pending** on purpose, so the operation is still in
    // `RELEASING` when the assertion runs. A synchronous resolver would settle
    // and clear the transform before anything could be read, and the row would
    // pass against a `moveTo()` that had taken full effect.
    let resolveDrop!: (value: FreeDragResolution) => void;
    const composed = compose({
      onDrop: () =>
        new Promise<FreeDragResolution>((resolve) => {
          composed.controller.moveTo(FAR);
          resolveDrop = resolve;
        }),
    });

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();

    expect(composed.rendered()).toEqual([40, 30]);

    resolveDrop(FreeDragResolution.accept());
    await settled();

    expect(composed.item.style.transform).toBe('');
  });

  it('should not move the visual when it comes from a landing runner', async () => {
    // `SETTLING`, where the runner owns the transform outright. Two writers on
    // one property is the failure this refuses, and it is invisible to a
    // callback count because the runner overwrites whatever it finds.
    //
    // **The trajectory is held open on purpose.** Calling `done()` immediately
    // finishes the settlement, and the join then pins and disposes the lift —
    // so a fixture that only checks the element afterwards passes against a
    // `moveTo()` that took full effect and was cleaned up behind it. Holding
    // `done` keeps the operation in the one phase the claim is about, and the
    // assertion runs **after** the queue has had a frame and a microtask drain
    // to deliver the late action, which is what makes the reading a fact about
    // the action rather than about the timing.
    let finish!: () => void;
    const seen: string[] = [];
    const composed = compose({
      fragments: [
        {
          // **The `landing` key, not a plugin** (D-146): `startLanding` is
          // producible from this key and no other, so a plugin cannot carry
          // one — which is the cardinality rule as a compile error rather than
          // as a construction-time collision.
          landing: ((): ReturnType<FreeDragLandingInstaller> => ({
            startLanding: (context, done) => {
              seen.push(context.visual.style.transform);
              composed.controller.moveTo(FAR);
              finish = done;
              return { destroy: (): void => {} };
            },
          })) satisfies FreeDragLandingInstaller,
        },
      ],
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();
    await frame();
    await settled();

    // The runner opened at the release delta, and the visual is still there:
    // nothing the queued `moveTo()` staged reached the lift.
    expect(seen).toEqual(['translate(40px, 30px) matrix(1, 0, 0, 1, 0, 0)']);
    expect(composed.rendered()).toEqual([40, 30]);

    finish();
    await settled();

    // And the ordinary end state, so the row also covers the case where a late
    // write survives the runner and is only visible once it lets go.
    expect(composed.item.style.transform).toBe('');
    expect(composed.ends).toHaveLength(1);
  });

  it('should retarget when it comes from onStart', async () => {
    // **The positive control** (D-86). `ACTIVATING` is in the legal set on
    // purpose: a `moveTo()` from `onStart` is intentional retargeting, and the
    // queue may drain it in either live phase. Without this row the fix reads
    // as *refuse everything late*, which is a different and worse rule.
    // Measured before the press: by the time `onStart` runs the visual has
    // already been placed at the threshold delta, so reading its rect there
    // would target a point relative to where it had moved to.
    let origin!: DOMRect;
    const composed = compose({
      config: {
        onStart: (): void => {
          composed.controller.moveTo({
            x: origin.left + 60,
            y: origin.top + 25,
          });
        },
      },
    });

    origin = composed.item.getBoundingClientRect();

    activate(composed);
    await settled();

    expect(composed.rendered()).toEqual([60, 25]);
  });

  it('should publish no failure for the late calls it discards', async () => {
    // **A no-op, not a rejection** (D-86). `prepare` returns the seam's
    // existing discard value, so a consumer calling `moveTo()` from `onEnd` has
    // not made an error the library should classify — no `onError`, no second
    // terminal, nothing on the platform channel.
    let ends = 0;
    const composed = compose({
      config: {
        onEnd: (): void => {
          ends += 1;
          composed.controller.moveTo(FAR);
        },
      },
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(composed.errors).toEqual([]);
    expect(ends).toBe(1);
    expect(composed.errors).toEqual([]);
  });
});

describe('a late invalidate()', () => {
  it('should re-enter neither the axis source nor a third-party constraint', async () => {
    // `TAG_POLICY`'s reason is **hygiene, and it is a different argument** from
    // `TAG_POSITION`'s: it writes no geometry, but it re-enters a declared
    // consumer slot and a third-party capability for no observable effect once
    // no later sample exists. Recording slots are what turn that from a claim
    // into a measurement.
    const constraint = recordingConstraint();
    let axisReads = 0;
    const composed = compose({
      fragments: [constraint.fragment],
      config: {
        axis: () => {
          axisReads += 1;
          return 'both';
        },
        onEnd: (): void => {
          composed.controller.invalidate();
        },
      },
    });

    activate(composed);

    const readsAtActivation = axisReads;
    const invalidationsAtActivation = constraint.invalidations;

    release(30, 10);
    await settled();

    expect(axisReads).toBe(readsAtActivation);
    expect(constraint.invalidations).toBe(invalidationsAtActivation);
  });

  it('should still re-enter both while the operation is active', () => {
    // The positive control for the tag the row above refuses late.
    const constraint = recordingConstraint();
    let axisReads = 0;
    const composed = compose({
      fragments: [constraint.fragment],
      config: {
        axis: () => {
          axisReads += 1;
          return 'both';
        },
      },
    });

    activate(composed);

    const readsAtActivation = axisReads;

    composed.controller.invalidate();

    expect(axisReads).toBe(readsAtActivation + 1);
    expect(constraint.invalidations).toBe(1);
  });
});

describe('a landing that is still installed', () => {
  it('should complete undisturbed by a late position write', async () => {
    // The composition E-04 named as the contended one: a landing runner driving
    // the transform while a queued `moveTo()` sits behind it. The operation
    // ends once, with a clean element.
    let ends = 0;
    const composed = compose({
      fragments: [landing({ duration: 1 })],
      onDrop: () => FreeDragResolution.reject('nope'),
      config: {
        onEnd: (): void => {
          ends += 1;
          composed.controller.moveTo(FAR);
        },
      },
    });

    activate(composed);
    release(30, 10);
    await settled();

    // A 1 ms trajectory still needs a real frame to start and another to
    // finish; the loop waits for the terminal rather than guessing a count.
    for (let i = 0; i < 20; i += 1) {
      // oxlint-disable-next-line no-await-in-loop
      await frame();
      // oxlint-disable-next-line no-await-in-loop
      await settled();

      if (ends > 0) {
        break;
      }
    }

    expect(ends).toBe(1);
    expect(composed.item.style.transform).toBe('');
    expect(composed.errors).toEqual([]);
  });
});
