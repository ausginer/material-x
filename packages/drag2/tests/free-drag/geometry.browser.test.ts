/**
 * **L-5 — a geometry fixture per lift mode, under an ancestor transform and
 * under zoom.**
 *
 * Phase 11's lesson, and the reason this is a phase deliverable rather than a
 * nice-to-have: 644 tests passed through a lift-mode regression because none of
 * them compared the lifted visual's **on-screen box** to what it should be. A
 * transform written into an inline style is not evidence that the element is
 * where the consumer sees it; `getBoundingClientRect()` is.
 *
 * The three modes promise three different boxes, and the differences are the
 * whole point of having three:
 *
 * | mode | what the box does |
 * | --- | --- |
 * | `faithful` | keeps the stage's shape and size, and travels by the viewport delta |
 * | `flat` | drops the stage's transform — untransformed size, centred where the item was, travelling by the viewport delta |
 * | `in-place` | stays in the container under the authored transform, and still travels by the viewport delta |
 *
 * **Every mode travels by the same viewport delta**, which is the invariant a
 * projection bug breaks: an in-place lift that forgot to invert the inherited
 * linear part moves at the ancestor's scale instead of the pointer's.
 */
import { describe, expect, it } from 'vitest';
import {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode,
} from '../../src/free-drag.ts';
import { activate, freeDragHarness, move } from '../support/free-drag.ts';

const { compose } = freeDragHarness();

/** The delta the drag has travelled once the sequence below has run. */
const DX = 40;
const DY = 30;

/** The item's authored, untransformed border box. */
const NATURAL_WIDTH = 100;
const NATURAL_HEIGHT = 40;

/**
 * `toBeCloseTo`'s **precision in digits**, not a tolerance: 1 admits half a
 * tenth of a pixel, which is sub-pixel transform rounding and nothing else.
 */
const PRECISION = 1;

const expectBox = (
  actual: DOMRect,
  expected: Readonly<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>,
): void => {
  expect(actual.left).toBeCloseTo(expected.left, PRECISION);
  expect(actual.top).toBeCloseTo(expected.top, PRECISION);
  expect(actual.width).toBeCloseTo(expected.width, PRECISION);
  expect(actual.height).toBeCloseTo(expected.height, PRECISION);
};

/**
 * Presses, activates and drags to `(DX, DY)`, returning the box the item had
 * **before** anything was lifted and the box it has now.
 */
const drag = (
  lift: LiftMode,
  stageStyle: Readonly<Record<string, string>>,
): Readonly<{ before: DOMRect; after: DOMRect }> => {
  const composed = compose({ config: { lift }, stageStyle });
  const before = composed.item.getBoundingClientRect();

  activate(composed);
  move(10 + DX, 10 + DY);

  return { before, after: composed.item.getBoundingClientRect() };
};

/** A rotated, scaled stage — the shipped `TransformedStage` story's geometry. */
const WARPED = {
  transform: 'rotate(12deg) scale(1.4)',
  transformOrigin: '0 0',
} as const;

/** A zoomed stage. Inherited zoom is not a transform and does not compose. */
const ZOOMED = { zoom: '2' } as const;

describe('the faithful lift', () => {
  it('should keep the stage geometry and travel by the viewport delta under a transform', () => {
    // The mode's promise: promoted to the top layer and **undistorted** — the
    // composed element→viewport matrix is its base transform, so the box it had
    // in the stage is the box it keeps.
    const { before, after } = drag(LIFT_FAITHFUL, WARPED);

    expectBox(after, {
      left: before.left + DX,
      top: before.top + DY,
      width: before.width,
      height: before.height,
    });
  });

  it('should keep the stage geometry and travel by the viewport delta under zoom', () => {
    // The lift divides the inherited zoom back out — the top layer does not
    // escape it — so the matrix stays the sole source of scale.
    const { before, after } = drag(LIFT_FAITHFUL, ZOOMED);

    expectBox(after, {
      left: before.left + DX,
      top: before.top + DY,
      width: before.width,
      height: before.height,
    });
  });
});

describe('the flat lift', () => {
  it('should drop the ancestor transform and keep its natural size', () => {
    // `flat` floats above at its **untransformed** size, centred on the box it
    // came from. That is what makes it the right mode for a drag whose stage is
    // rotated: the visual comes upright under the pointer.
    const { before, after } = drag(LIFT_FLAT, WARPED);

    expectBox(after, {
      left: before.left + before.width / 2 - NATURAL_WIDTH / 2 + DX,
      top: before.top + before.height / 2 - NATURAL_HEIGHT / 2 + DY,
      width: NATURAL_WIDTH,
      height: NATURAL_HEIGHT,
    });
  });

  it('should drop the inherited zoom and keep its natural size', () => {
    const { before, after } = drag(LIFT_FLAT, ZOOMED);

    expectBox(after, {
      left: before.left + before.width / 2 - NATURAL_WIDTH / 2 + DX,
      top: before.top + before.height / 2 - NATURAL_HEIGHT / 2 + DY,
      width: NATURAL_WIDTH,
      height: NATURAL_HEIGHT,
    });
  });
});

describe('the in-place lift', () => {
  it('should keep the authored transform and still travel by the viewport delta', () => {
    // **The row a projection bug fails.** An in-place translate is prepended to
    // the visual's authored transform, so it acts in the *inherited* space; the
    // lift inverts that linear part, which is why 40 viewport pixels stay 40
    // viewport pixels under a 1.4× rotated stage instead of becoming 56 rotated
    // ones.
    const { before, after } = drag(LIFT_IN_PLACE, WARPED);

    expectBox(after, {
      left: before.left + DX,
      top: before.top + DY,
      width: before.width,
      height: before.height,
    });
  });

  it('should keep the authored transform and still travel by the viewport delta under zoom', () => {
    const { before, after } = drag(LIFT_IN_PLACE, ZOOMED);

    expectBox(after, {
      left: before.left + DX,
      top: before.top + DY,
      width: before.width,
      height: before.height,
    });
  });
});

describe('the reported geometry', () => {
  it('should report the local delta in the stage space under a transform', () => {
    // The local delta is the viewport delta mapped through the **inverse
    // inherited** linear part (D-72) — the space an authored translate acts in.
    // Under `scale(2)` a 40px viewport travel is 20px of stage-local motion.
    const composed = compose({
      stageStyle: { transform: 'scale(2)', transformOrigin: '0 0' },
    });

    activate(composed);
    move(10 + DX, 10 + DY);

    const geometry = composed.moves.at(-1)!;

    expect(geometry.viewportDeltaX).toBe(DX);
    expect(geometry.viewportDeltaY).toBe(DY);
    expect(geometry.localDeltaX).toBeCloseTo(DX / 2, PRECISION);
    expect(geometry.localDeltaY).toBeCloseTo(DY / 2, PRECISION);
  });

  it('should report the viewport delta itself when the ancestry is untransformed', () => {
    // The common case, and the one `captureLocalSpace` answers with `null` so
    // the hot path skips the arithmetic entirely.
    const composed = compose();

    activate(composed);
    move(10 + DX, 10 + DY);

    const geometry = composed.moves.at(-1)!;

    expect(geometry.localDeltaX).toBe(geometry.viewportDeltaX);
    expect(geometry.localDeltaY).toBe(geometry.viewportDeltaY);
  });

  it('should derive the current rect from the origin rect under a transform', () => {
    // No layout read per sample: the rect the consumer is handed is arithmetic
    // over the origin rect, which is measured once at activation.
    const composed = compose({ stageStyle: WARPED });

    activate(composed);
    move(10 + DX, 10 + DY);

    const { currentRect, originRect } = composed.moves.at(-1)!;

    expect(currentRect.left).toBeCloseTo(originRect.left + DX, PRECISION);
    expect(currentRect.top).toBeCloseTo(originRect.top + DY, PRECISION);
  });
});
