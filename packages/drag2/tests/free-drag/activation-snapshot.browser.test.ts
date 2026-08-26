/**
 * **One activation snapshot, not two** — D-85, closing E-01.
 *
 * Free drag used to take its own box-quad traversal from `activation.effect`,
 * to invert the inherited linear part into `localDelta`. E-01 established that
 * this was not merely duplicate work: the second walk runs **after**
 * `acquireLift` has changed positioning, dimensions, top-layer state and
 * transforms, and box-quad's own contract says two walks may legitimately
 * disagree. A single activation could therefore lift on one coordinate snapshot
 * and report consumer deltas from another.
 *
 * **The discriminating fixture mutates the ancestry between the two reads.**
 * `setPointerCapture` is a consumer-owned, overridable method on a
 * consumer-owned node, and the kernel calls it inside `acquireActivation` —
 * after `acquireLift` has measured and before `activation.effect` runs. That is
 * the exact interval the old second traversal sat in, and it is the only
 * interval a public-API fixture can reach. Falsified against the pre-D-85
 * implementation, which reports the **new** space:
 *
 * ```text
 * pre-D-85   localDelta { x: 10,  y: 7.5 }   — scale(4), read after the lift
 * D-85       localDelta { x: 20,  y: 15  }   — scale(2), read before it
 * ```
 *
 * The rows are asserted under a **lifted** mode as well as in place, because
 * the lifted modes are where the second read had most to disagree about, and
 * because `compose`'s own projection is `null` for them — so a fix that reused
 * the session's projection instead of the scope's would hand back the identity
 * here, wrong and silent.
 */
import { describe, expect, it } from 'vitest';
import type { DraggableError } from '../../src/drag.ts';
import { FAILURE_ACTIVATION } from '../../src/kernel/failures.ts';
import {
  activate,
  freeDragHarness,
  move,
  release,
  settled,
  type Composed,
} from '../support/free-drag.ts';

const { compose } = freeDragHarness();

const DX = 40;
const DY = 30;
/** `toBeCloseTo`'s precision **in digits**: sub-pixel rounding and nothing else. */
const PRECISION = 1;

/**
 * Warps the stage from inside the activation window — after the kernel has
 * measured the space and before the behavior can read one.
 */
const warpDuringActivation = (composed: Composed, transform: string): void => {
  composed.item.setPointerCapture = (): void => {
    composed.stage.style.transform = transform;
  };
};

describe('the reported local delta', () => {
  it('should come from the pre-lift measurement when the ancestry changes during activation', () => {
    // **The row the pre-D-85 tree fails.** The drag began on a `scale(2)`
    // stage; by the time a second traversal could run, the stage is `scale(4)`.
    // The consumer's delta describes the space the operation actually started
    // in, which is the one the lift itself was computed against.
    const composed = compose({
      stageStyle: { transform: 'scale(2)', transformOrigin: '0 0' },
    });

    warpDuringActivation(composed, 'scale(4)');
    activate(composed);
    move(10 + DX, 10 + DY);

    const geometry = composed.moves.at(-1)!;

    expect(geometry.viewportDelta).toEqual({ x: DX, y: DY });
    expect(geometry.localDelta.x).toBeCloseTo(DX / 2, PRECISION);
    expect(geometry.localDelta.y).toBeCloseTo(DY / 2, PRECISION);
  });

  it('should come from the pre-lift measurement under zoom as well', () => {
    // Zoom contributes to the inherited linear part exactly as a scale does, so
    // the same split is reachable through a property that is not a transform at
    // all — which is why the fix is a fact about the *measurement* rather than
    // about any one CSS feature.
    const composed = compose({ stageStyle: { zoom: '2' } });

    composed.item.setPointerCapture = (): void => {
      composed.stage.style.zoom = '4';
    };
    activate(composed);
    move(10 + DX, 10 + DY);

    const geometry = composed.moves.at(-1)!;

    expect(geometry.localDelta.x).toBeCloseTo(DX / 2, PRECISION);
    expect(geometry.localDelta.y).toBeCloseTo(DY / 2, PRECISION);
  });

  it('should come from the pre-lift measurement for an in-place lift', () => {
    // The mode whose `compose` projection *equals* this value, asserted so the
    // pair below reads as a real distinction rather than an accident of which
    // mode the fixture happened to pick.
    const composed = compose({
      config: { lift: 'in-place' },
      stageStyle: { transform: 'scale(2)', transformOrigin: '0 0' },
    });

    warpDuringActivation(composed, 'scale(4)');
    activate(composed);
    move(10 + DX, 10 + DY);

    expect(composed.moves.at(-1)!.localDelta.x).toBeCloseTo(DX / 2, PRECISION);
  });

  it('should be reported for a lifted mode, where the session projection is null', () => {
    // **The row that refuses the cheaper fix.** `BehaviorLiftSession.compose`
    // carries a same-shaped projection, and it is `null` for both lifted modes
    // because a lifted visual is repositioned into the viewport. Reusing it
    // would report the viewport delta as the local one under a transformed
    // ancestry — the identity, silently.
    const composed = compose({
      config: { lift: 'flat' },
      stageStyle: { transform: 'scale(2)', transformOrigin: '0 0' },
    });

    activate(composed);
    move(10 + DX, 10 + DY);

    const geometry = composed.moves.at(-1)!;

    expect(geometry.localDelta.x).toBeCloseTo(DX / 2, PRECISION);
    expect(geometry.localDelta).not.toEqual(geometry.viewportDelta);
  });

  it('should report the release delta in the same space', async () => {
    // The request the consumer resolves is built from the same snapshot, so a
    // fix applied to the movement path alone would leave `onDrop` disagreeing
    // with the `onMove` that preceded it.
    const composed = compose({
      stageStyle: { transform: 'scale(2)', transformOrigin: '0 0' },
    });

    warpDuringActivation(composed, 'scale(4)');
    activate(composed);
    move(10 + DX, 10 + DY);
    release(10 + DX, 10 + DY);
    await settled();

    expect(composed.requests.at(-1)!.localDelta.x).toBeCloseTo(
      DX / 2,
      PRECISION,
    );
  });
});

describe('an unreadable space', () => {
  it('should still fail activation rather than resolving to the identity', () => {
    // **The failure policy the single read makes total** (D-85). The two reads
    // disagreed here as well: `acquireLift` refuses an unreadable space while
    // the behavior's own traversal silently substituted the identity for it. A
    // detached visual is the reachable form — the `visual` resolver returns an
    // element that is not in the document, so the lift's traversal fails.
    const composed = compose({
      config: { visual: () => document.createElement('div') },
    });

    activate(composed);

    expect(composed.errors.map((error) => (error as DraggableError).stage)) //
      .toEqual([FAILURE_ACTIVATION]);
    expect(composed.starts).toEqual([]);
  });
});
