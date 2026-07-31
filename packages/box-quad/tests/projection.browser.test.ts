import { afterEach, describe, expect, it } from 'vitest';
import { projection, quad, type Box } from '../src/index.ts';
import {
  createBox,
  expectQuad,
  measure,
  resetDocument,
} from './support/fixtures.ts';

const BOX_LENGTH = 13;
const QUAD_LENGTH = 8;

const BOX_A = 0;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;

afterEach(resetDocument);

function sentinels(): Box {
  return new Float64Array([11, 22, 33, 44, 55, 66, 77, 88]);
}

/**
 * A measured box built from numbers alone, with no DOM involved. The trailing
 * inherited-basis slots are irrelevant to projection and are left at zero
 * unless a case sets them.
 */
function syntheticBox(values: readonly number[]): Box {
  const out = new Float64Array(BOX_LENGTH);

  out.set(values);
  return out;
}

describe('projection into the viewport', () => {
  it('should project the four corners of an untransformed box', () => {
    const source = measure(
      createBox({
        styles: { left: '100px', top: '50px', width: '20px', height: '10px' },
      }),
    );
    const out = quad();

    expect(projection(source, out)).toBe(true);
    expectQuad(out, [100, 50, 120, 50, 120, 60, 100, 60]);
  });

  it('should project a scaled box', () => {
    const source = measure(
      createBox({
        styles: {
          left: '0px',
          top: '0px',
          width: '20px',
          height: '10px',
          transform: 'scale(2)',
          transformOrigin: '0 0',
        },
      }),
    );
    const out = quad();

    expect(projection(source, out)).toBe(true);
    expectQuad(out, [0, 0, 40, 0, 40, 20, 0, 20]);
  });

  it('should project a rotated box in physical-corner order', () => {
    const source = measure(
      createBox({
        styles: {
          left: '0px',
          top: '0px',
          width: '20px',
          height: '10px',
          transform: 'rotate(90deg)',
          transformOrigin: '0 0',
        },
      }),
    );
    const out = quad();

    expect(projection(source, out)).toBe(true);
    // p1 stays the origin corner; p2 is width away along the rotated x axis.
    expectQuad(out, [0, 0, 0, 20, -10, 20, -10, 0]);
  });

  it('should project from synthetic numbers with no DOM at all', () => {
    const out = quad();

    expect(projection(syntheticBox([1, 0, 0, 1, 5, 7, 20, 10, 1]), out)).toBe(
      true,
    );
    expectQuad(out, [5, 7, 25, 7, 25, 17, 5, 17]);
  });
});

describe('projection relative to another box', () => {
  it('should express a source in an untransformed target local space', () => {
    const target = measure(
      createBox({
        styles: { left: '10px', top: '20px', width: '200px', height: '100px' },
      }),
    );
    const source = measure(
      createBox({
        styles: { left: '40px', top: '60px', width: '20px', height: '10px' },
      }),
    );
    const out = quad();

    expect(projection(source, out, target)).toBe(true);
    expectQuad(out, [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  it('should divide a target scale out of the source', () => {
    const target = measure(
      createBox({
        styles: {
          left: '0px',
          top: '0px',
          width: '200px',
          height: '100px',
          transform: 'scale(2)',
          transformOrigin: '0 0',
        },
      }),
    );
    const source = measure(
      createBox({
        styles: { left: '40px', top: '20px', width: '20px', height: '10px' },
      }),
    );
    const out = quad();

    expect(projection(source, out, target)).toBe(true);
    expectQuad(out, [20, 10, 30, 10, 30, 15, 20, 15]);
  });

  it('should divide a target rotation out of the source', () => {
    const target = measure(
      createBox({
        styles: {
          left: '0px',
          top: '0px',
          width: '200px',
          height: '100px',
          transform: 'rotate(90deg)',
          transformOrigin: '0 0',
        },
      }),
    );
    const source = measure(
      createBox({
        styles: { left: '0px', top: '40px', width: '20px', height: '10px' },
      }),
    );
    const out = quad();

    expect(projection(source, out, target)).toBe(true);
    expectQuad(out, [40, 0, 40, -20, 50, -20, 50, 0]);
  });

  it('should divide a target zoom out of the source', () => {
    const target = measure(
      createBox({
        styles: {
          left: '0px',
          top: '0px',
          width: '200px',
          height: '100px',
          zoom: '2',
        },
      }),
    );
    const source = measure(
      createBox({
        styles: { left: '40px', top: '20px', width: '20px', height: '10px' },
      }),
    );
    const out = quad();

    expect(projection(source, out, target)).toBe(true);
    expectQuad(out, [20, 10, 30, 10, 30, 15, 20, 15]);
  });

  it('should compose a transformed source with a transformed target', () => {
    const target = measure(
      createBox({
        styles: {
          left: '0px',
          top: '0px',
          width: '200px',
          height: '100px',
          transform: 'scale(2)',
          transformOrigin: '0 0',
        },
      }),
    );
    const source = measure(
      createBox({
        styles: {
          left: '10px',
          top: '10px',
          width: '20px',
          height: '10px',
          transform: 'scale(4)',
          transformOrigin: '0 0',
        },
      }),
    );
    const out = quad();

    expect(projection(source, out, target)).toBe(true);
    expectQuad(out, [5, 5, 45, 5, 45, 25, 5, 25]);
  });

  it('should reduce a box against itself to its own local border box', () => {
    const source = measure(
      createBox({
        styles: {
          left: '37px',
          top: '19px',
          width: '20px',
          height: '10px',
          transform: 'rotate(30deg) scale(1.5)',
        },
      }),
    );
    const out = quad();

    const width = source[BOX_WIDTH]!;
    const height = source[BOX_HEIGHT]!;

    expect(projection(source, out, source)).toBe(true);
    // Strict: the corners are the box's own size, whatever the measurement
    // derived it to be. Comparing against the *authored* 20x10 instead would
    // fold the measurement's precision into an assertion about projection —
    // see the DOM-free precision suite below, and the measurement test that
    // owns that residual.
    expectQuad(out, [0, 0, width, 0, width, height, 0, height]);
  });

  it('should treat an identity target as a viewport projection', () => {
    const source = measure(
      createBox({ styles: { left: '40px', top: '25px' } }),
    );
    const identity = syntheticBox([1, 0, 0, 1, 0, 0, 0, 0, 1]);
    const viewport = quad();
    const relative = quad();

    expect(projection(source, viewport)).toBe(true);
    expect(projection(source, relative, identity)).toBe(true);
    expectQuad(relative, viewport);
  });
});

describe('projection failure', () => {
  it('should preserve every output sentinel when the target is singular', () => {
    const source = measure(createBox());
    const singular = syntheticBox([0, 0, 0, 0, 0, 0, 20, 10, 1]);
    const out = sentinels();

    expect(projection(source, out, singular)).toBe(false);
    expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
  });

  it('should reject a non-invertible measured target', () => {
    const source = measure(createBox());
    const target = measure(createBox({ styles: { transform: 'scale(0)' } }));

    expect(projection(source, quad(), target)).toBe(false);
  });

  it('should preserve every output sentinel on a non-finite source', () => {
    const out = sentinels();

    expect(
      projection(syntheticBox([1, 0, 0, 1, Number.NaN, 0, 20, 10, 1]), out),
    ).toBe(false);
    expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
  });

  it('should reject an infinite source dimension', () => {
    expect(
      projection(
        syntheticBox([1, 0, 0, 1, 0, 0, Number.POSITIVE_INFINITY, 10, 1]),
        quad(),
      ),
    ).toBe(false);
  });
});

describe('projection purity', () => {
  it('should not read the DOM after measurement', () => {
    const source = createBox({ styles: { left: '10px', top: '20px' } });
    const measured = measure(source);
    const out = quad();

    // Both the layout and the element itself go away between the two steps.
    source.style.left = '900px';
    source.remove();

    expect(projection(measured, out)).toBe(true);
    expectQuad(out, [10, 20, 30, 20, 30, 30, 10, 30]);
  });

  it('should reuse one measured box for repeated projections', () => {
    const source = measure(
      createBox({ styles: { left: '10px', top: '20px' } }),
    );
    const target = measure(
      createBox({
        styles: { left: '5px', top: '5px', width: '200px', height: '100px' },
      }),
    );
    const first = quad();
    const second = quad();
    const third = quad();

    expect(projection(source, first)).toBe(true);
    expect(projection(source, second, target)).toBe(true);
    expect(projection(source, third)).toBe(true);

    // Projecting does not mutate its inputs, so the third read repeats the first.
    expectQuad(third, first);
    expectQuad(second, [5, 15, 25, 15, 25, 25, 5, 25]);
  });

  it('should leave the source and target boxes unmodified', () => {
    const source = measure(createBox());
    const target = measure(
      createBox({ styles: { width: '200px', height: '100px' } }),
    );
    const sourceBefore = Array.from(source);
    const targetBefore = Array.from(target);

    expect(projection(source, quad(), target)).toBe(true);

    expect(Array.from(source)).toEqual(sourceBefore);
    expect(Array.from(target)).toEqual(targetBefore);
  });

  it('should ignore ancestorZoom, which the matrices already carry', () => {
    const base = [1, 0, 0, 1, 10, 20, 20, 10] as const;
    const withoutZoom = syntheticBox([...base, 1]);
    const withZoom = syntheticBox([...base, 4]);
    const first = quad();
    const second = quad();

    expect(projection(withoutZoom, first)).toBe(true);
    expect(projection(withZoom, second)).toBe(true);
    expectQuad(second, first);
  });
});

describe('quad', () => {
  it('should allocate storage of the required length', () => {
    expect(quad()).toHaveLength(QUAD_LENGTH);
  });
});

describe('measured box reuse', () => {
  it('should let one measurement answer both matrix and projection questions', () => {
    const element = createBox({
      styles: { left: '40px', top: '25px', transform: 'scale(2)' },
    });
    const measured = measure(element);
    const out = quad();

    expect(projection(measured, out)).toBe(true);
    // The same array carries the drag-space scalars the lift needs.
    expect(measured[BOX_A]).toBeCloseTo(2, 6);
    expect(measured[BOX_D]).toBeCloseTo(2, 6);
    expect(out[0]).toBeCloseTo(measured[BOX_E]!, 6);
    expect(out[1]).toBeCloseTo(measured[BOX_F]!, 6);
  });
});

describe('projection self-inverse precision', () => {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;

  const rotation = (
    degrees: number,
    scale = 1,
  ): readonly [number, number, number, number] => {
    const cos = Math.cos(radians(degrees)) * scale;
    const sin = Math.sin(radians(degrees)) * scale;
    return [cos, sin, -sin, cos];
  };

  /**
   * Float64 epsilon scaled to these coordinate magnitudes. The scalar inverse
   * and composition are exact to a few ULPs; anything looser here would be
   * hiding an arithmetic error behind a tolerance.
   */
  const EXACT = 1e-12;

  it.each([
    { description: 'an identity matrix', matrix: [1, 0, 0, 1], e: 0, f: 0 },
    { description: 'a translation', matrix: [1, 0, 0, 1], e: 37, f: 19 },
    { description: 'a uniform scale', matrix: [1.5, 0, 0, 1.5], e: 0, f: 0 },
    { description: 'a non-uniform scale', matrix: [2, 0, 0, 3], e: 11, f: 7 },
    { description: 'a rotation', matrix: rotation(30), e: 37, f: 19 },
    {
      description: 'a rotation with a non-integer scale',
      matrix: rotation(30, 1.5),
      e: 37,
      f: 19,
    },
    {
      description: 'a composed affine matrix',
      matrix: [1.2, 0.3, -0.4, 2.1],
      e: 13.7,
      f: -9.2,
    },
    {
      description: 'a very small scale',
      matrix: [1e-6, 0, 0, 1e-6],
      e: 0,
      f: 0,
    },
    { description: 'a very large scale', matrix: [1e6, 0, 0, 1e6], e: 0, f: 0 },
  ] as const)(
    'should self-project $description to its own border box exactly',
    ({ matrix, e, f }) => {
      const source = syntheticBox([...matrix, e, f, 20, 10]);
      const out = quad();

      expect(projection(source, out, source)).toBe(true);
      expectQuad(out, [0, 0, 20, 0, 20, 10, 0, 10], EXACT);
    },
  );

  it('should compose an inverse with a distinct source exactly', () => {
    // A target that is a pure 2x scale about the origin: the source's corners
    // land at exactly half their viewport coordinates.
    const target = syntheticBox([2, 0, 0, 2, 0, 0, 100, 100]);
    const source = syntheticBox([2, 0, 0, 2, 40, 60, 20, 10]);
    const out = quad();

    expect(projection(source, out, target)).toBe(true);
    expectQuad(out, [20, 30, 40, 30, 40, 40, 20, 40], EXACT);
  });

  it('should round-trip a source through its own basis exactly', () => {
    const source = syntheticBox([...rotation(37, 2.25), 13, -8, 20, 10]);
    const viewport = quad();
    const local = quad();

    expect(projection(source, viewport)).toBe(true);
    expect(projection(source, local, source)).toBe(true);

    // The viewport quad's first corner is the matrix translation, and the
    // local quad's is the origin — the two describe the same corner.
    expectQuad(local, [0, 0, 20, 0, 20, 10, 0, 10], EXACT);
    expect(Math.abs(viewport[0]! - source[BOX_E]!)).toBeLessThanOrEqual(EXACT);
    expect(Math.abs(viewport[1]! - source[BOX_F]!)).toBeLessThanOrEqual(EXACT);
  });
});
