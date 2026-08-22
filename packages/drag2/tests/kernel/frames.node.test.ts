import { describe, expect, it } from 'vitest';
import {
  assertFrameScrubbed,
  assertFrameShapesMatch,
  beginFrame,
  captureFrameKeys,
  composeFrame,
  createKernelFrame,
  KERNEL_FRAME_KEYS,
  resetKernelFields,
  scrubFrame,
  validateFramePart,
} from '../../src/kernel/frames.ts';
import { ACTIVE, IDLE } from '../../src/kernel/phases.ts';

type ExamplePart = {
  item: HTMLElement | null;
  insertion: number | null;
};

const createExamplePart = (): ExamplePart => ({ item: null, insertion: null });

const resetExamplePart = (part: ExamplePart): void => {
  part.item = null;
  part.insertion = null;
};

describe('createKernelFrame', () => {
  it('should start idle with no operation', () => {
    const frame = createKernelFrame();

    expect(frame.phase).toBe(IDLE);
    expect(frame.operation).toBeNull();
  });

  it('should own exactly the seven declared keys', () => {
    expect(Object.keys(createKernelFrame())).toEqual(KERNEL_FRAME_KEYS);
  });
});

describe('validateFramePart', () => {
  it('should accept a plain enumerable writable record', () => {
    expect(() => validateFramePart(createExamplePart())).not.toThrow();
  });

  it('should reject a part declaring a kernel frame key', () => {
    expect(() => validateFramePart({ phase: 0 })).toThrow(/kernel frame key/u);
  });

  it('should name the colliding kernel key', () => {
    expect(() => validateFramePart({ pointerX: 0 })).toThrow(/pointerX/u);
  });

  it('should reject an own __proto__ data property', () => {
    const part = {};

    Object.defineProperty(part, '__proto__', {
      value: null,
      enumerable: true,
      writable: true,
      configurable: true,
    });

    expect(() => validateFramePart(part)).toThrow(/__proto__/u);
  });

  it('should reject a symbol key', () => {
    expect(() => validateFramePart({ [Symbol('x')]: 1 })).toThrow(/symbol/u);
  });

  // **The four author-contract checks, removed 2026-08-22.** Each cost the
  // author their own field and cost the library nothing, so each is now an
  // asserted outcome rather than a rejection — which is the half of the
  // removal that can rot. A check that comes back has to argue with a test
  // that says what actually happens.

  it('should accept an accessor, which composes to a plain data property', () => {
    const part = {};

    Object.defineProperty(part, 'item', {
      get: () => null,
      enumerable: true,
      configurable: true,
    });

    expect(() => validateFramePart(part)).not.toThrow();
  });

  it('should accept a non-enumerable key, which no frame ever receives', () => {
    const part = {};

    Object.defineProperty(part, 'item', {
      value: null,
      enumerable: false,
      writable: true,
      configurable: true,
    });

    expect(() => validateFramePart(part)).not.toThrow();
    // Absent from *both* frames, so the shapes still match — which is why the
    // old message's claim that it "would not be copied by begin()" described
    // no defect: there is nothing to begin.
    expect('item' in Object.assign(createKernelFrame(), part)).toBe(false);
  });

  it('should accept a non-writable key, whose copy in the frame is writable', () => {
    const part = {};

    Object.defineProperty(part, 'item', {
      value: null,
      enumerable: true,
      writable: false,
      configurable: true,
    });

    expect(() => validateFramePart(part)).not.toThrow();
    // The removed check said the key "would throw on write". `Object.assign`
    // uses `[[Set]]` on a fresh extensible object, so it does not.
    expect(
      Object.getOwnPropertyDescriptor(
        Object.assign(createKernelFrame(), part),
        'item',
      ),
    ).toMatchObject({ writable: true });
  });

  it('should accept a class instance, whose own fields are what the model uses', () => {
    class Part {
      item: HTMLElement | null = null;
    }

    expect(() => validateFramePart(new Part())).not.toThrow();
  });

  it('should accept an array, whose indices become ordinary keys', () => {
    expect(() => validateFramePart([])).not.toThrow();
  });
});

describe('composeFrame', () => {
  it('should compose the kernel slice first, then the behavior part', () => {
    const frame = composeFrame(createExamplePart);

    expect(Object.keys(frame)).toEqual([
      ...KERNEL_FRAME_KEYS,
      'item',
      'insertion',
    ]);
  });

  it('should validate every factory result, not only the first', () => {
    let calls = 0;
    const drifting = (): ExamplePart => {
      calls += 1;
      // The factory is not proven deterministic (F-2), so the second frame is
      // where a collision would otherwise slip in.
      return calls === 1
        ? createExamplePart()
        : ({ phase: 0 } as unknown as ExamplePart);
    };

    expect(() => composeFrame(drifting)).not.toThrow();
    expect(() => composeFrame(drifting)).toThrow(/kernel frame key/u);
  });

  it('should produce two frames with an identical key set', () => {
    const current = composeFrame(createExamplePart);
    const draft = composeFrame(createExamplePart);

    expect(Object.keys(current)).toEqual(Object.keys(draft));
  });
});

describe('beginFrame', () => {
  it('should copy every enumerable own key of both slices', () => {
    const current = composeFrame(createExamplePart);
    const draft = composeFrame(createExamplePart);

    current.phase = ACTIVE;
    current.insertion = 4;
    beginFrame(draft, current);

    expect(draft.phase).toBe(ACTIVE);
    expect(draft.insertion).toBe(4);
  });

  it('should leave both frames referencing the same nested value', () => {
    const current = composeFrame(createExamplePart);
    const draft = composeFrame(createExamplePart);
    const shared = { index: 1 };

    (current as unknown as { nested: object }).nested = shared;
    beginFrame(draft, current);

    // The copy is shallow, which is exactly why the shallow-copy contract
    // exists: every frame field must be a scalar, immutable, or
    // replace-on-write (contract 04).
    expect((draft as unknown as { nested: object }).nested).toBe(shared);
  });
});

describe('scrubFrame', () => {
  it('should reset both slices', () => {
    const frame = composeFrame(createExamplePart);

    frame.phase = ACTIVE;
    frame.insertion = 4;
    frame.item = { nodeType: 1 } as unknown as HTMLElement;
    scrubFrame(frame, resetExamplePart);

    expect(frame.phase).toBe(IDLE);
    expect(frame.insertion).toBeNull();
    expect(frame.item).toBeNull();
  });

  it('should preserve the frame shape', () => {
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    scrubFrame(frame, resetExamplePart);

    expect(captureFrameKeys(frame)).toEqual(armedKeys);
  });
});

describe('resetKernelFields', () => {
  it('should clear the operation identity', () => {
    const frame = createKernelFrame();

    frame.operation = { id: 1 };
    resetKernelFields(frame);

    expect(frame.operation).toBeNull();
  });
});

describe('assertFrameShapesMatch', () => {
  it('should accept two frames from the same factory', () => {
    expect(() =>
      assertFrameShapesMatch(
        composeFrame(createExamplePart),
        composeFrame(createExamplePart),
      ),
    ).not.toThrow();
  });

  it('should reject frames from a non-deterministic factory', () => {
    const current = composeFrame(createExamplePart);
    const incomplete = { item: null };
    const draft = composeFrame(() => incomplete as unknown as ExamplePart);

    expect(() => assertFrameShapesMatch(current, draft)).toThrow(
      /different shapes/u,
    );
  });
});

describe('assertFrameScrubbed', () => {
  it('should reject a reset that adds a key', () => {
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    scrubFrame(frame, (part) => {
      resetExamplePart(part);
      (part as unknown as Record<string, unknown>)['extra'] = null;
    });

    expect(() => assertFrameScrubbed(frame, armedKeys)).toThrow(
      /changed the frame shape/u,
    );
  });

  it('should reject a reset that deletes a key', () => {
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    scrubFrame(frame, (part) => {
      delete (part as Partial<ExamplePart>).insertion;
    });

    expect(() => assertFrameScrubbed(frame, armedKeys)).toThrow(
      /changed the frame shape/u,
    );
  });

  it('should reject a field redefined as an accessor', () => {
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    // A key-set comparison cannot see a redefinition: the key keeps its name
    // and its position.
    Object.defineProperty(frame, 'insertion', {
      get: () => null,
      enumerable: true,
      configurable: true,
    });

    expect(() => assertFrameScrubbed(frame, armedKeys)).toThrow(/redefined/u);
  });

  it('should reject a reference left behind by an incomplete reset', () => {
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    frame.item = { nodeType: 1 } as unknown as HTMLElement;
    scrubFrame(frame, (part) => {
      part.insertion = null;
    });

    expect(() => assertFrameScrubbed(frame, armedKeys)).toThrow(
      /reset left a reference in "item"/u,
    );
  });

  it('should accept a complete reset', () => {
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    frame.item = { nodeType: 1 } as unknown as HTMLElement;
    scrubFrame(frame, resetExamplePart);

    expect(() => assertFrameScrubbed(frame, armedKeys)).not.toThrow();
  });

  it('should not catch a stale non-null scalar', () => {
    // The documented gap (F-11, I-28): the heuristic guesses at contents, and
    // a scalar that should have been reset keeps its key and its type.
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    frame.insertion = 4;
    scrubFrame(frame, (part) => {
      part.item = null;
    });

    expect(() => assertFrameScrubbed(frame, armedKeys)).not.toThrow();
    expect(frame.insertion).toBe(4);
  });
});
