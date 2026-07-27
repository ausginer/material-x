import { afterEach, describe, expect, it } from 'vitest';
import { readBoxQuad } from '../src/index.js';
import {
  createBox,
  createFlowBox,
  expectQuad,
  QUAD_TOLERANCE,
  readSuccessfulBoxQuad,
  resetDocument,
  sentinels,
} from './support/fixtures.ts';

afterEach(resetDocument);

describe('layout and physical coordinate spaces', () => {
  // SPACE-01
  it('should return viewport border-box corners', () => {
    const out = new Float64Array(8);

    expect(
      readBoxQuad(createBox({ styles: { left: '100px', top: '50px' } }), out),
    ).toBe(true);
    expectQuad(out, [100, 50, 120, 50, 120, 60, 100, 60]);
  });

  // SPACE-02
  it('should retain rotated 180-degree corner identity', () => {
    const out = new Float64Array(8);
    const source = createBox({ styles: { transform: 'rotate(180deg)' } });

    expect(readBoxQuad(source, out)).toBe(true);
    expectQuad(out, [0, 0, -20, 0, -20, -10, 0, -10]);
  });

  // SPACE-03
  it('should retain negative-scale corner identity', () => {
    const out = new Float64Array(8);
    const source = createBox({ styles: { transform: 'scale(-1, 1)' } });

    expect(readBoxQuad(source, out)).toBe(true);
    expectQuad(out, [0, 0, -20, 0, -20, 10, 0, 10]);
  });

  // SPACE-04
  it('should translate an untransformed source into target space', () => {
    const source = createBox({ styles: { left: '100px', top: '80px' } });
    const target = createBox({ styles: { left: '70px', top: '40px' } });
    const out = new Float64Array(8);

    expect(readBoxQuad(source, out, target)).toBe(true);
    expectQuad(out, [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  // SPACE-05
  it('should return local corners for an invertible self target', () => {
    const source = createBox({
      styles: { left: '100px', transform: 'rotate(90deg)' },
    });
    const out = new Float64Array(8);

    expect(readBoxQuad(source, out, source)).toBe(true);
    expectQuad(out, [0, 0, 20, 0, 20, 10, 0, 10]);
  });

  // SPACE-06
  it('should preserve zero-width source geometry', () => {
    const source = createBox({ styles: { width: '0px' } });
    const out = new Float64Array(8);

    expect(readBoxQuad(source, out)).toBe(true);
    expectQuad(out, [0, 0, 0, 0, 0, 10, 0, 10]);
  });

  // SPACE-07
  it('should preserve a singular source projection in viewport space', () => {
    const source = createBox({ styles: { transform: 'scale(0)' } });
    const out = new Float64Array(8);

    expect(readBoxQuad(source, out)).toBe(true);
    expectQuad(out, [0, 0, 0, 0, 0, 0, 0, 0]);
  });

  // LAYOUT-01
  it('should read a plain block border box', () => {
    const source = createBox({ styles: { left: '30px', top: '40px' } });

    expectQuad(readSuccessfulBoxQuad(source), [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  // LAYOUT-02
  it('should include content-box padding and borders', () => {
    const source = createBox({
      styles: {
        boxSizing: 'content-box',
        width: '20px',
        height: '10px',
        padding: '2px 3px 4px 5px',
        border: '1px solid black',
        transform: 'matrix(1, 1, 1, 1, 0, 0)',
      },
    });

    expectQuad(readSuccessfulBoxQuad(source), [0, 0, 30, 30, 48, 48, 18, 18]);
  });

  // LAYOUT-03
  it('should read an inline-block without display-specific handling', () => {
    const source = createFlowBox({
      styles: {
        display: 'inline-block',
        marginLeft: '30px',
        verticalAlign: 'top',
      },
    });

    expectQuad(readSuccessfulBoxQuad(source), [30, 0, 50, 0, 50, 10, 30, 10]);
  });

  // LAYOUT-04
  it('should read a flex item border box', () => {
    const parent = createBox({
      styles: {
        display: 'flex',
        left: '30px',
        top: '40px',
        width: '100px',
        height: '30px',
      },
    });
    const source = createBox({
      parent,
      styles: { position: 'static', flex: '0 0 20px', height: '10px' },
    });

    expectQuad(readSuccessfulBoxQuad(source), [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  // LAYOUT-05
  it('should read a grid item border box', () => {
    const parent = createBox({
      styles: {
        display: 'grid',
        left: '30px',
        top: '40px',
        width: '100px',
        height: '30px',
        gridTemplateColumns: '20px',
      },
    });
    const source = createBox({
      parent,
      styles: { position: 'static', height: '10px' },
    });

    expectQuad(readSuccessfulBoxQuad(source), [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  // LAYOUT-06
  it('should read an explicitly sized replaced image border box', () => {
    const source = createBox({
      tag: 'img',
      styles: { left: '30px', top: '40px', width: '20px', height: '10px' },
    });

    expectQuad(readSuccessfulBoxQuad(source), [30, 40, 50, 40, 50, 50, 30, 50]);
  });

  // LAYOUT-07
  it('should include asymmetric border extents', () => {
    const source = createBox({
      styles: {
        left: '30px',
        top: '40px',
        width: '30px',
        height: '20px',
        borderLeft: '2px solid black',
        borderRight: '4px solid black',
        borderTop: '3px solid black',
        borderBottom: '5px solid black',
      },
    });

    expectQuad(readSuccessfulBoxQuad(source), [30, 40, 60, 40, 60, 60, 30, 60]);
  });

  // LAYOUT-08
  it('should include relative and absolute ancestor offsets once', () => {
    const outer = createBox({
      styles: {
        left: '30px',
        top: '40px',
        width: '100px',
        height: '100px',
        position: 'relative',
      },
    });
    const inner = createBox({
      parent: outer,
      styles: { left: '10px', top: '20px' },
    });

    expectQuad(readSuccessfulBoxQuad(inner), [40, 60, 60, 60, 60, 70, 40, 70]);
  });

  it.each([
    // LAYOUT-09
    { description: 'a disconnected source', styles: {}, remove: true },
    // LAYOUT-10
    { description: 'display:none', styles: { display: 'none' }, remove: false },
    // LAYOUT-11
    {
      description: 'display:contents',
      styles: { display: 'contents' },
      remove: false,
    },
  ] as const)(
    'should fail atomically without a source principal box for $description',
    ({ styles, remove }) => {
      const source = createBox({ styles });
      const out = sentinels();

      if (remove) {
        source.remove();
      }

      expect(readBoxQuad(source, out)).toBe(false);
      expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
    },
  );

  // LAYOUT-12
  it('should fail atomically without a target principal box', () => {
    const source = createBox();
    const target = createBox({ styles: { display: 'none' } });
    const out = sentinels();

    expect(readBoxQuad(source, out, target)).toBe(false);
    expectQuad(out, [11, 22, 33, 44, 55, 66, 77, 88]);
  });

  it.each([
    {
      description: 'a 2D transform',
      styles: { transform: 'rotate(90deg)' },
    },
    {
      description: 'a 3D transform',
      styles: { transform: 'rotateX(90deg)' },
    },
    {
      description: 'perspective',
      styles: { perspective: '100px' },
    },
    {
      description: 'preserve-3d',
      styles: { transformStyle: 'preserve-3d' },
    },
  ] as const)(
    'should ignore $description on a display:contents ancestor',
    ({ styles }) => {
      const ancestor = createBox({
        styles: { display: 'contents', ...styles },
      });
      const source = createBox({ parent: ancestor });

      expectQuad(readSuccessfulBoxQuad(source), [0, 0, 20, 0, 20, 10, 0, 10]);
    },
  );
});

describe('2D transforms', () => {
  it.each([
    // TRANSFORM-01
    {
      description: 'integer translation',
      transform: 'translate(5px, 7px)',
      expected: [5, 7, 25, 7, 25, 17, 5, 17],
    },
    // TRANSFORM-02
    {
      description: 'uniform scale',
      transform: 'scale(2)',
      expected: [0, 0, 40, 0, 40, 20, 0, 20],
    },
    // TRANSFORM-03
    {
      description: 'non-uniform scale',
      transform: 'scale(2, 3)',
      expected: [0, 0, 40, 0, 40, 30, 0, 30],
    },
    // TRANSFORM-04
    {
      description: '90-degree rotation',
      transform: 'rotate(90deg)',
      expected: [0, 0, 0, 20, -10, 20, -10, 0],
    },
    // TRANSFORM-05
    {
      description: '180-degree rotation',
      transform: 'rotate(180deg)',
      expected: [0, 0, -20, 0, -20, -10, 0, -10],
    },
    // TRANSFORM-06
    {
      description: 'negative scale',
      transform: 'scale(-1, 1)',
      expected: [0, 0, -20, 0, -20, 10, 0, 10],
    },
    // TRANSFORM-07
    {
      description: '2D skew',
      transform: 'skewX(45deg)',
      expected: [0, 0, 20, 0, 30, 10, 10, 10],
    },
    // TRANSFORM-08
    {
      description: 'arbitrary CSS matrix',
      transform: 'matrix(1, 0.5, 0.25, 1, 5, 7)',
      expected: [5, 7, 25, 17, 27.5, 27, 7.5, 17],
    },
    // TRANSFORM-16
    {
      description: '2D-equivalent computed matrix',
      transform: 'matrix(1, 0, 0, 1, 5, 7)',
      expected: [5, 7, 25, 7, 25, 17, 5, 17],
    },
  ] as const)(
    'should map each local border corner through $description',
    ({ transform, expected }) => {
      const source = createBox({ styles: { transform } });

      expectQuad(readSuccessfulBoxQuad(source), expected);
    },
  );

  // TRANSFORM-09
  it('should apply a non-default pixel transform origin', () => {
    const source = createBox({
      styles: { transform: 'rotate(180deg)', transformOrigin: '10px 5px' },
    });

    expectQuad(readSuccessfulBoxQuad(source), [20, 10, 0, 10, 0, 0, 20, 0]);
  });

  // TRANSFORM-10
  it('should resolve percentage origin against the border box', () => {
    const source = createBox({
      styles: { transform: 'scale(2)', transformOrigin: '50% 50%' },
    });

    expectQuad(
      readSuccessfulBoxQuad(source),
      [-10, -5, 30, -5, 30, 15, -10, 15],
    );
  });

  // TRANSFORM-11
  it('should compose source and ancestor transforms in CSS order', () => {
    const parent = createBox({
      styles: {
        width: '100px',
        height: '100px',
        transform: 'translate(10px, 20px) scale(2)',
      },
    });
    const source = createBox({
      parent,
      styles: { left: '5px', top: '7px', transform: 'translate(3px, 4px)' },
    });

    // Parent maps (x, y) to (10 + 2x, 20 + 2y); source translation occurs first.
    expectQuad(readSuccessfulBoxQuad(source), [26, 42, 66, 42, 66, 62, 26, 62]);
  });

  it.each([
    // TRANSFORM-12
    {
      description: 'individual translate',
      styles: { translate: '5px 7px' },
      expected: [5, 7, 25, 7, 25, 17, 5, 17],
    },
    // TRANSFORM-13
    {
      description: 'individual rotate',
      styles: { rotate: '90deg' },
      expected: [0, 0, 0, 20, -10, 20, -10, 0],
    },
    // TRANSFORM-14
    {
      description: 'individual scale',
      styles: { scale: '2' },
      expected: [0, 0, 40, 0, 40, 20, 0, 20],
    },
  ] as const)('should apply $description', ({ styles, expected }) => {
    expectQuad(readSuccessfulBoxQuad(createBox({ styles })), expected);
  });

  it('should treat a zero-angle 3D-axis individual rotation as 2D identity', () => {
    const source = createBox({ styles: { rotate: 'x 0deg' } });

    expectQuad(readSuccessfulBoxQuad(source), [0, 0, 20, 0, 20, 10, 0, 10]);
  });

  it('should apply a z-axis individual rotation in 2D', () => {
    const source = createBox({ styles: { rotate: 'z 90deg' } });

    expectQuad(readSuccessfulBoxQuad(source), [0, 0, 0, 20, -10, 20, -10, 0]);
  });

  it.each(['100grad', '0.25turn', `${Math.PI / 2}rad`])(
    'should apply a 90-degree individual rotation authored as %s',
    (rotate) => {
      const source = createBox({ styles: { rotate } });

      expectQuad(readSuccessfulBoxQuad(source), [0, 0, 0, 20, -10, 20, -10, 0]);
    },
  );

  // TRANSFORM-15
  it('should use the browser composition order for individual and classic transforms', () => {
    const source = createBox({
      styles: {
        translate: '5px 0px',
        rotate: '90deg',
        scale: '2',
        transform: 'translate(3px, 4px)',
      },
    });

    // CSS individual transforms compose translate → rotate → scale before transform.
    expectQuad(readSuccessfulBoxQuad(source), [-3, 6, -3, 46, -23, 46, -23, 6]);
  });

  // TRANSFORM-17
  it('should use a content-box percentage origin while returning border-box corners', () => {
    const source = createBox({
      styles: {
        width: '50px',
        height: '30px',
        borderLeft: '2px solid black',
        borderRight: '4px solid black',
        borderTop: '3px solid black',
        borderBottom: '5px solid black',
        padding: '4px 8px 6px 6px',
        transformBox: 'content-box',
        transform: 'scale(2)',
        transformOrigin: '100% 100%',
      },
    });

    // Content-box bottom-right is border-local (38, 19): scale about that point.
    expectQuad(
      readSuccessfulBoxQuad(source),
      [-38, -19, 62, -19, 62, 41, -38, 41],
    );
  });

  // TRANSFORM-18
  it('should resolve classic percentage translation against the border box', () => {
    expectQuad(
      readSuccessfulBoxQuad(
        createBox({ styles: { transform: 'translate(50%, 50%)' } }),
      ),
      [10, 5, 30, 5, 30, 15, 10, 15],
    );
  });

  // TRANSFORM-19
  it('should resolve individual percentage translation against the content box', () => {
    const source = createBox({
      styles: {
        transformBox: 'content-box',
        padding: '0px 5px',
        translate: '50% 0px',
      },
    });

    // A 20px border box with 5px horizontal padding has a 10px content width.
    expectQuad(readSuccessfulBoxQuad(source), [5, 0, 25, 0, 25, 10, 5, 10]);
  });

  // TRANSFORM-20
  it('should preserve rendered fractional border-box precision under scale', () => {
    const source = createBox({
      styles: {
        width: '33.333px',
        transform: 'scale(2)',
      },
    });
    const rect = source.getBoundingClientRect();

    expectQuad(readSuccessfulBoxQuad(source), [
      rect.left,
      rect.top,
      rect.right,
      rect.top,
      rect.right,
      rect.bottom,
      rect.left,
      rect.bottom,
    ]);
  });

  // TRANSFORM-21
  it('should retain rect-based recovery for a well-conditioned fractional rotation', () => {
    const source = createBox({
      styles: {
        width: '33.5px',
        height: '17.25px',
        transform: 'rotate(30deg)',
      },
    });
    const out = readSuccessfulBoxQuad(source);
    const rect = source.getBoundingClientRect();
    const xValues = [out[0]!, out[2]!, out[4]!, out[6]!];
    const yValues = [out[1]!, out[3]!, out[5]!, out[7]!];

    expect(Math.abs(Math.min(...xValues) - rect.left)).toBeLessThanOrEqual(
      QUAD_TOLERANCE,
    );
    expect(Math.abs(Math.max(...xValues) - rect.right)).toBeLessThanOrEqual(
      QUAD_TOLERANCE,
    );
    expect(Math.abs(Math.min(...yValues) - rect.top)).toBeLessThanOrEqual(
      QUAD_TOLERANCE,
    );
    expect(Math.abs(Math.max(...yValues) - rect.bottom)).toBeLessThanOrEqual(
      QUAD_TOLERANCE,
    );
  });

  it.each([
    '44deg',
    '44.99deg',
    '44.999deg',
    '44.9999deg',
    '45deg',
    '45.01deg',
    '46deg',
  ])(
    'should use stable fractional dimensions near the AABB singular band at %s',
    (angle) => {
      const source = createBox({
        styles: {
          width: '33.5px',
          height: '17.25px',
          transform: `rotate(${angle})`,
        },
      });
      const out = readSuccessfulBoxQuad(source);
      const style = getComputedStyle(source);
      const matrix = new DOMMatrix(style.transform);
      const width = Number.parseFloat(style.width);
      const height = Number.parseFloat(style.height);

      expect(
        Math.abs(out[2]! - out[0]! - matrix.a * width),
      ).toBeLessThanOrEqual(QUAD_TOLERANCE);
      expect(
        Math.abs(out[3]! - out[1]! - matrix.b * width),
      ).toBeLessThanOrEqual(QUAD_TOLERANCE);
      expect(
        Math.abs(out[6]! - out[0]! - matrix.c * height),
      ).toBeLessThanOrEqual(QUAD_TOLERANCE);
      expect(
        Math.abs(out[7]! - out[1]! - matrix.d * height),
      ).toBeLessThanOrEqual(QUAD_TOLERANCE);
    },
  );
});
