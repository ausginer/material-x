// oxlint-disable typescript/no-unsafe-type-assertion
import { describe, expectTypeOf, it } from 'vitest';
import type {
  Draft,
  Frame,
  FramePartOf,
  KernelFrame,
} from '../../src/kernel/frames.ts';

type ExamplePart = {
  item: HTMLElement | null;
  insertion: number | null;
};

const draft = null as unknown as Draft<ExamplePart>;
const current = null as unknown as Readonly<Frame<ExamplePart>>;

describe('Draft', () => {
  it('should allow a prepare to write its own part', () => {
    draft.item = null;
    draft.insertion = 4;
  });

  it('should expose the kernel slice for reading', () => {
    expectTypeOf(draft.phase).toEqualTypeOf<number>();
    expectTypeOf(draft.pointerY).toEqualTypeOf<number>();
  });

  it('should reject a write to a kernel frame field', () => {
    // Tier A, I-5: only the kernel writes kernel frame fields.
    // @ts-expect-error: the kernel slice is readonly on the draft
    draft.phase = 3;
  });

  it('should project a colliding part key away instead of leaving it writable', () => {
    type Colliding = { phase: number; item: HTMLElement | null };
    const colliding = null as unknown as Draft<Colliding>;

    // The `Omit` in `Draft` is what makes this fail: a plain intersection
    // would leave the part's own mutable `phase` assignable (Q-2).
    // @ts-expect-error: the colliding key resolves to the readonly kernel slice
    colliding.phase = 3;
  });
});

describe('Frame', () => {
  it('should reject assignment to a top-level slot from an effect', () => {
    // Tier A, I-2/I-18.
    // @ts-expect-error: `effect` receives `Readonly<Frame<Part>>`
    current.insertion = 4;
  });

  it('should reject assignment to a kernel field from an effect', () => {
    // @ts-expect-error: `effect` receives `Readonly<Frame<Part>>`
    current.phase = 3;
  });

  it('should still allow reading both slices', () => {
    expectTypeOf(current.phase).toEqualTypeOf<number>();
    expectTypeOf(current.item).toEqualTypeOf<HTMLElement | null>();
  });
});

describe('FramePartOf', () => {
  it('should pass a disjoint part through unchanged', () => {
    expectTypeOf<FramePartOf<ExamplePart>>().toEqualTypeOf<ExamplePart>();
  });

  it('should make a colliding part unreturnable from a factory', () => {
    type Colliding = { phase: number };

    const createFramePart = (): FramePartOf<Colliding> =>
      // @ts-expect-error: the collision brand names the offending key
      ({ phase: 0 });

    expectTypeOf(createFramePart).toBeFunction();
  });

  it('should not claim to catch a broad index signature', () => {
    // Documented limit (review 6 §19): `Extract<string, keyof KernelFrame>` is
    // `never`, so an index signature declares no colliding key even though a
    // runtime `phase` property is entirely possible. `validateFramePart` is the
    // authoritative check.
    expectTypeOf<FramePartOf<Record<string, unknown>>>().toEqualTypeOf<
      Record<string, unknown>
    >();
  });
});

describe('KernelFrame', () => {
  it('should carry exactly the seven kernel-owned fields', () => {
    expectTypeOf<keyof KernelFrame>().toEqualTypeOf<
      | 'phase'
      | 'operation'
      | 'pointerId'
      | 'originX'
      | 'originY'
      | 'pointerX'
      | 'pointerY'
    >();
  });
});
