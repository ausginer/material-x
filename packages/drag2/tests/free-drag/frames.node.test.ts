import { describe, expect, it } from 'vitest';
import {
  type FreeDragFramePart,
  freeDragFramePart,
} from '../../src/free-drag/frames.ts';
import { AT_CONSUMER, CANCEL_SUPPLIED } from '../../src/kernel/failures.ts';

/**
 * **One function, two operations, and the shared source is the point** (D-142).
 * The shape that preceded it was a create/reset pair whose field lists had to
 * agree by inspection: a field added to one and not the other allocates and is
 * never cleared, or is cleared and was never allocated, and nothing anywhere
 * could see the disagreement. `kernel/frames.ts` already ran this shape over
 * the kernel's own slice; these rows are it applied to a behavior part.
 */
describe('freeDragFramePart', () => {
  it('should allocate a part at its defaults', () => {
    const allocated = freeDragFramePart();

    expect(allocated.visual).toBeNull();
    expect(allocated.request).toBeNull();
    expect(allocated.domain).toBeNull();
    expect(allocated.offsetX).toBe(0);
    expect(allocated.offsetY).toBe(0);
  });

  it('should return an existing part to those same defaults', () => {
    // The identity is the assertion. A reset that allocated would leave the
    // kernel's composed frame pointing at the part it armed with, so the
    // clearing would be invisible to everything that reads the frame.
    const existing = freeDragFramePart();

    existing.offsetX = 12;
    existing.domain = {
      type: 'canceled',
      request: null,
      reason: null,
      origin: CANCEL_SUPPLIED,
      stage: AT_CONSUMER,
    };

    expect(freeDragFramePart(existing)).toBe(existing);
    expect(existing.offsetX).toBe(0);
    expect(existing.domain).toBeNull();
  });

  it('should clear every field it allocates', () => {
    // **The invariant a create/reset pair could not hold** (D-128). Written
    // over the key list rather than field by field, so a sixth field added to
    // the part is covered the day it appears.
    const part = freeDragFramePart();

    for (const key of Object.keys(part) as Array<keyof FreeDragFramePart>) {
      (part as Record<string, unknown>)[key] = 'dirty';
    }

    expect(freeDragFramePart(part)).toEqual(freeDragFramePart());
  });
});
