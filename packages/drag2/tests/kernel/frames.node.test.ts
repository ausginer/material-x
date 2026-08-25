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

describe('composeFrame', () => {
  /**
   * **The anti-rot rows for seven deleted rejections, and nothing more.**
   * `validateFramePart` refused these shapes; the last of its arms went with
   * the function on 2026-08-25 (D-122), so composition now accepts every part
   * a factory can return. Each row asserts only that — **the library does not
   * refuse this input** — which is what a returning guard has to argue with.
   *
   * ~~And this is the wreckage each one leaves.~~ **Those assertions went in
   * the same pass** (the D-124 landing review, §1.1 (C)): a colliding key
   * overwriting `phase`, a `__proto__` part nulling the prototype and a
   * non-writable key arriving writable are `Object.assign` semantics that hold
   * for any plain object and would pass with this library absent. Freezing
   * them made the shape of behaviour under out-of-contract input a regression
   * contract, which is the coupling the deletions removed from the runtime.
   * The consequences are recorded in D-121 … D-124 and in `COVERAGE.md`, which
   * is where evidence about undefined behaviour belongs.
   */
  const accepts = (part: object): void => {
    expect(() => composeFrame(() => part)).not.toThrow();
  };

  it('should accept a symbol-keyed part', () => {
    // D-122's row. The term is published on `FramePartOf` now, and the author
    // is told what it costs them — invisibility to the scrub instruments —
    // rather than refused.
    accepts({ [Symbol('x')]: 1 });
  });

  it('should accept a part declaring a kernel frame key', () => {
    accepts({ phase: 7 });
  });

  it('should accept an own prototype-mutating data property', () => {
    const part = {};

    Object.defineProperty(part, '__proto__', {
      value: null,
      enumerable: true,
      writable: true,
      configurable: true,
    });

    accepts(part);
  });

  it('should accept an accessor part', () => {
    const part = {};

    Object.defineProperty(part, 'item', {
      get: () => null,
      enumerable: true,
      configurable: true,
    });

    accepts(part);
  });

  it('should accept a non-enumerable key', () => {
    const part = {};

    Object.defineProperty(part, 'item', {
      value: null,
      enumerable: false,
      writable: true,
      configurable: true,
    });

    accepts(part);
  });

  it('should accept a non-writable key', () => {
    const part = {};

    Object.defineProperty(part, 'item', {
      value: null,
      enumerable: true,
      writable: false,
      configurable: true,
    });

    accepts(part);
  });

  it('should accept a class instance', () => {
    class Part {
      item: HTMLElement | null = null;
    }

    accepts(new Part());
  });

  it('should compose the kernel slice first, then the behavior part', () => {
    const frame = composeFrame(createExamplePart);

    expect(Object.keys(frame)).toEqual([
      ...KERNEL_FRAME_KEYS,
      'item',
      'insertion',
    ]);
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
      /frame\/shape-mismatch/u,
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
      /frame\/scrub-shape-changed/u,
    );
  });

  it('should reject a reset that deletes a key', () => {
    const frame = composeFrame(createExamplePart);
    const armedKeys = captureFrameKeys(frame);

    scrubFrame(frame, (part) => {
      delete (part as Partial<ExamplePart>).insertion;
    });

    expect(() => assertFrameScrubbed(frame, armedKeys)).toThrow(
      /frame\/scrub-shape-changed/u,
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
      /frame\/scrub-retained item/u,
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
