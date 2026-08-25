import { describe, expect, it } from 'vitest';
import { frame, KERNEL_FRAME_KEYS } from '../../src/kernel/frames.ts';
import { IDLE } from '../../src/kernel/phases.ts';

/**
 * **What is left of this file is the kernel slice itself** (D-128).
 *
 * `createKernelFrame`, `resetKernelFields`, `composeFrame`, `beginFrame`,
 * `scrubFrame`, `captureFrameKeys`, `assertFrameShapesMatch` and
 * `assertFrameScrubbed` were deleted in the source-shape pass, and their suites
 * went with them rather than being re-pointed: every one of those rows asserted
 * `Object.assign` or `Object.keys` through a wrapper, and re-spelling them
 * against the language would be testing the language. The two assertion
 * families had behaviour of their own, and that behaviour no longer exists —
 * what an unvalidated frame part now does is asserted at `arm()`, in
 * `tests/kernel/kernel.browser.test.ts`, which is where it actually happens.
 */
describe('frame', () => {
  it('should allocate a slice that is idle with no operation', () => {
    const allocated = frame();

    expect(allocated.phase).toBe(IDLE);
    expect(allocated.operation).toBeNull();
  });

  it('should allocate exactly the seven declared keys, in order', () => {
    // The order is load-bearing: the kernel folds the behavior's part over
    // this, so a composed frame reads kernel-slice-first (contract 04).
    expect(Object.keys(frame())).toEqual(KERNEL_FRAME_KEYS);
  });

  it('should return an existing frame to its defaults', () => {
    const existing = frame();

    existing.operation = { id: 1 };
    existing.pointerId = 7;
    frame(existing);

    expect(existing.operation).toBeNull();
    expect(existing.pointerId).toBe(-1);
  });

  it('should preserve the shape of a frame it resets', () => {
    // The reset arm runs over a *composed* frame, so it must not add or drop a
    // key: the behavior's own part keeps its fields and its positions, and
    // `resetFramePart` clears them separately.
    const composed = Object.assign(frame(), { item: null, insertion: 3 });
    const armed = Object.keys(composed);

    frame(composed);

    expect(Object.keys(composed)).toEqual(armed);
    expect(composed.insertion).toBe(3);
  });
});
