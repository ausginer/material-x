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
  MotionDraft,
} from '../../src/free-drag/feature.ts';
import { landing } from '../../src/free-drag/landing.ts';
import {
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import {
  activate,
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
  it('should re-enter no third-party constraint', async () => {
    // `TAG_POLICY`'s reason is **hygiene, and it is a different argument** from
    // `TAG_POSITION`'s: it writes no geometry, but it re-enters a third-party
    // capability for no observable effect once no later sample exists. A
    // recording constraint is what turns that from a claim into a measurement.
    //
    // ~~The `axis` source is the other half of this row.~~ **Deleted with the
    // source** (D-148): `axis` is fixed configuration, read from the slot
    // record, so this seam reaches exactly one consumer surface.
    const constraint = recordingConstraint();
    const composed = compose({
      fragments: [constraint.fragment],
      config: {
        onEnd: (): void => {
          composed.controller.invalidate();
        },
      },
    });

    activate(composed);

    const invalidationsAtActivation = constraint.invalidations;

    release(30, 10);
    await settled();

    expect(constraint.invalidations).toBe(invalidationsAtActivation);
  });

  it('should still re-enter it while the operation is active', () => {
    // The positive control for the tag the row above refuses late.
    const constraint = recordingConstraint();
    const composed = compose({ fragments: [constraint.fragment] });

    activate(composed);
    composed.controller.invalidate();

    expect(constraint.invalidations).toBe(1);
  });
});

describe('a landing that is still installed', () => {
  it('should complete undisturbed by a late position write', async () => {
    // The composition E-04 named as the contended one, in the shape it has
    // now: a tail interpolating the released element while a `moveTo()` queued
    // from `onEnd` sits behind it. The operation ends once, with a clean
    // element — the tail claims no inline style, so the late write has nothing
    // to contend with and nothing to leave behind.
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

    // The terminal does not wait for the tail: the drop is decided, pinned and
    // released before anything interpolates, so one drain is the whole wait.
    expect(ends).toBe(1);
    // The tail is genuinely in flight, which is what keeps the row about a
    // landing rather than about an ordinary drop.
    expect(composed.item.getAnimations()).toHaveLength(1);
    expect(composed.item.style.transform).toBe('');
    expect(composed.errors).toEqual([]);
  });
});
