import { afterEach, describe, expect, it } from 'vitest';
import { ancestry, box, coordinates, space, type Box } from '../src/index.ts';
import {
  createBox,
  createFlowBox,
  createShadowBox,
  inherited,
  measure,
  resetDocument,
} from './support/fixtures.ts';

const BOX_LENGTH = 8;
const SPACE_LENGTH = 5;

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const SPACE_A = 0;
const SPACE_B = 1;
const SPACE_C = 2;
const SPACE_D = 3;
const SPACE_ANCESTOR_ZOOM = 4;

afterEach(resetDocument);

const TOLERANCE = 0.000001;

function sentinels(): Box {
  return new Float64Array(BOX_LENGTH).map((_value, index) => index + 1);
}

function expectNear(
  actual: number,
  expected: number,
  tolerance: number = TOLERANCE,
): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe('coordinates', () => {
  it('should report an untransformed box as an identity matrix at its position', () => {
    const measured = measure(
      createBox({ styles: { left: '100px', top: '50px' } }),
    );

    expectNear(measured[BOX_A]!, 1);
    expectNear(measured[BOX_B]!, 0);
    expectNear(measured[BOX_C]!, 0);
    expectNear(measured[BOX_D]!, 1);
    expectNear(measured[BOX_E]!, 100);
    expectNear(measured[BOX_F]!, 50);
  });

  it('should report the untransformed border-box size', () => {
    const measured = measure(
      createBox({ styles: { width: '80px', height: '40px' } }),
    );

    expectNear(measured[BOX_WIDTH]!, 80);
    expectNear(measured[BOX_HEIGHT]!, 40);
  });

  it('should derive the border-box size of a content-box element', () => {
    const measured = measure(
      createBox({
        styles: {
          boxSizing: 'content-box',
          width: '80px',
          height: '40px',
          padding: '5px',
          border: '2px solid',
        },
      }),
    );

    expectNear(measured[BOX_WIDTH]!, 94);
    expectNear(measured[BOX_HEIGHT]!, 54);
  });

  it('should keep the border-box size untransformed under a scale', () => {
    const measured = measure(
      createBox({
        styles: { width: '80px', height: '40px', transform: 'scale(2)' },
      }),
    );

    // The scale belongs to the matrix; the size it acts on does not change.
    expectNear(measured[BOX_A]!, 2);
    expectNear(measured[BOX_D]!, 2);
    expectNear(measured[BOX_WIDTH]!, 80);
    expectNear(measured[BOX_HEIGHT]!, 40);
  });

  it('should report a transform rotation in the matrix', () => {
    const measured = measure(
      createBox({ styles: { transform: 'rotate(90deg)' } }),
    );

    expectNear(measured[BOX_A]!, 0);
    expectNear(measured[BOX_B]!, 1);
    expectNear(measured[BOX_C]!, -1);
    expectNear(measured[BOX_D]!, 0);
  });

  it('should compose an ancestor transform into the matrix', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', transform: 'scale(3)' },
    });

    expectNear(measure(createBox({ parent }))[BOX_A]!, 3);
  });

  it('should honour the individual rotate property', () => {
    const measured = measure(createBox({ styles: { rotate: '90deg' } }));

    expectNear(measured[BOX_A]!, 0);
    expectNear(measured[BOX_B]!, 1);
  });

  it('should honour the individual scale property', () => {
    const measured = measure(createBox({ styles: { scale: '2 3' } }));

    expectNear(measured[BOX_A]!, 2);
    expectNear(measured[BOX_D]!, 3);
  });

  it('should honour the individual translate property', () => {
    const measured = measure(
      createBox({
        styles: { left: '10px', top: '20px', translate: '15px 25px' },
      }),
    );

    expectNear(measured[BOX_E]!, 25);
    expectNear(measured[BOX_F]!, 45);
  });

  it('should compose the individual properties in rotate, scale, transform order', () => {
    const measured = measure(
      createBox({
        styles: { rotate: '90deg', scale: '2', transform: 'scale(3)' },
      }),
    );

    expectNear(measured[BOX_A]!, 0);
    expectNear(measured[BOX_B]!, 6);
  });
});

describe('coordinates numeric precision', () => {
  it('should derive an exact size for an axis-aligned box', () => {
    const measured = measure(
      createBox({ styles: { width: '80px', height: '40px' } }),
    );

    expect(measured[BOX_WIDTH]).toBe(80);
    expect(measured[BOX_HEIGHT]).toBe(40);
  });

  it('should derive a rotated and scaled size to within a ten-thousandth', () => {
    // The size is recovered by un-projecting `getClientRects()` through the
    // matrix determinant, so a rotation with a non-integer scale leaves a small
    // residual — around 3e-5 here. This is where that error lives: `projection`
    // itself is exact to Float64 precision, which the DOM-free self-inverse
    // suite pins separately.
    const measured = measure(
      createBox({
        styles: {
          width: '20px',
          height: '10px',
          transform: 'rotate(30deg) scale(1.5)',
        },
      }),
    );

    expect(measured[BOX_WIDTH]).not.toBe(20);
    expectNear(measured[BOX_WIDTH]!, 20, 0.0001);
    expectNear(measured[BOX_HEIGHT]!, 10, 0.0001);
  });

  it('should fall back to the computed size for a near-degenerate matrix', () => {
    // A heavy shear leaves the determinant tiny next to its scale, where
    // un-projecting the axis-aligned rect would amplify input error. The
    // computed border-box size is used instead — exactly. Note a small uniform
    // scale does *not* reach this path: its determinant shrinks in step with
    // its scale, so the un-projection stays well conditioned.
    const measured = measure(
      createBox({
        styles: {
          width: '20px',
          height: '10px',
          transform: 'matrix(1, 1, 1, 1.0001, 0, 0)',
        },
      }),
    );

    expect(measured[BOX_WIDTH]).toBe(20);
    expect(measured[BOX_HEIGHT]).toBe(10);
  });
});

describe('coordinates zoom', () => {
  it('should carry the element own zoom in the matrix', () => {
    expectNear(measure(createBox({ styles: { zoom: '2' } }))[BOX_A]!, 2);
  });

  it('should compose an ancestor zoom into the matrix', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', zoom: '2' },
    });
    const measured = measure(createBox({ parent, styles: { zoom: '3' } }));

    expectNear(measured[BOX_A]!, 6);
  });
});

describe('ancestry zoom', () => {
  it('should default the ancestor zoom to 1', () => {
    expectNear(inherited(createBox())[SPACE_ANCESTOR_ZOOM]!, 1);
  });

  it('should report an ancestor zoom', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', zoom: '2' },
    });

    expectNear(inherited(createBox({ parent }))[SPACE_ANCESTOR_ZOOM]!, 2);
  });

  it('should multiply nested ancestor zooms', () => {
    const outer = createBox({
      styles: { width: '400px', height: '400px', zoom: '2' },
    });
    const inner = createBox({
      parent: outer,
      styles: { width: '200px', height: '200px', zoom: '1.5' },
    });

    expectNear(
      inherited(createBox({ parent: inner }))[SPACE_ANCESTOR_ZOOM]!,
      3,
    );
  });

  it('should exclude the element own zoom from the ancestor zoom', () => {
    // The element's own zoom is already carried by the matrix. Reporting it
    // twice would make a consumer cancelling inherited zoom cancel its own too.
    const source = createBox({ styles: { zoom: '2' } });

    expectNear(inherited(source)[SPACE_ANCESTOR_ZOOM]!, 1);
    expectNear(measure(source)[BOX_A]!, 2);
  });

  it('should report the inherited zoom while the matrix carries both', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', zoom: '2' },
    });
    const source = createBox({ parent, styles: { zoom: '3' } });

    expectNear(inherited(source)[SPACE_ANCESTOR_ZOOM]!, 2);
    expectNear(measure(source)[BOX_A]!, 6);
  });
});

describe('ancestry', () => {
  it('should report an identity space for a plain box', () => {
    const out = inherited(createBox());

    expectNear(out[SPACE_A]!, 1);
    expectNear(out[SPACE_B]!, 0);
    expectNear(out[SPACE_C]!, 0);
    expectNear(out[SPACE_D]!, 1);
  });

  it('should exclude the element own transform', () => {
    // The distinction that matters to a consumer writing a transform onto the
    // element: its own transform is not part of the space that transform acts
    // in.
    const source = createBox({ styles: { transform: 'scale(2)' } });

    expectNear(measure(source)[BOX_A]!, 2);
    expectNear(inherited(source)[SPACE_A]!, 1);
  });

  it('should exclude the element own zoom', () => {
    const source = createBox({ styles: { zoom: '2' } });

    expectNear(measure(source)[BOX_A]!, 2);
    expectNear(inherited(source)[SPACE_A]!, 1);
  });

  it('should report an ancestor scale', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', transform: 'scale(3)' },
    });
    const out = inherited(createBox({ parent }));

    expectNear(out[SPACE_A]!, 3);
    expectNear(out[SPACE_D]!, 3);
  });

  it('should report an ancestor rotation', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', transform: 'rotate(90deg)' },
    });
    const out = inherited(createBox({ parent }));

    expectNear(out[SPACE_A]!, 0);
    expectNear(out[SPACE_B]!, 1);
    expectNear(out[SPACE_C]!, -1);
    expectNear(out[SPACE_D]!, 0);
  });

  it('should compose nested ancestor transforms', () => {
    const outer = createBox({
      styles: { width: '400px', height: '400px', transform: 'scale(2)' },
    });
    const inner = createBox({
      parent: outer,
      styles: { width: '200px', height: '200px', transform: 'scale(3)' },
    });

    expectNear(inherited(createBox({ parent: inner }))[SPACE_A]!, 6);
  });

  it('should include an ancestor zoom in the inherited basis', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', zoom: '2' },
    });
    const out = inherited(createBox({ parent }));

    expectNear(out[SPACE_A]!, 2);
    expectNear(out[SPACE_ANCESTOR_ZOOM]!, 2);
  });

  it('should look through a display-contents wrapper to the scaling ancestor', () => {
    // A `display: contents` element contributes no transform, and has no
    // principal box of its own. A consumer that walked up element by element
    // would have to know both facts; the traversal already does.
    const grandparent = createBox({
      styles: { width: '400px', height: '400px', transform: 'scale(2)' },
    });
    const wrapper = createBox({
      parent: grandparent,
      styles: { display: 'contents' },
    });

    expectNear(inherited(createBox({ parent: wrapper }))[SPACE_A]!, 2);
  });

  it('should cross a shadow boundary to reach the host transform', () => {
    const { source } = createShadowBox('open');

    // `offsetParent` stops at the shadow boundary; the flat-tree walk does not.
    expectNear(inherited(source)[SPACE_A]!, 1);
    expectNear(measure(source)[BOX_A]!, 1);
  });

  it('should report a shadow host scale in the inherited basis', () => {
    const host = createBox({
      styles: { width: '200px', height: '150px', transform: 'scale(2)' },
    });
    const root = host.attachShadow({ mode: 'open' });
    const source = document.createElement('div');

    Object.assign(source.style, {
      boxSizing: 'border-box',
      position: 'absolute',
      width: '20px',
      height: '10px',
    });
    root.append(source);

    expectNear(inherited(source)[SPACE_A]!, 2);
  });
});

describe('ancestry without a principal box', () => {
  // The whole reason the space is its own value: an element can inherit a
  // perfectly well-defined space and have no box of its own to measure.
  it('should answer for a display-contents element that cannot be measured', () => {
    const parent = createBox({
      styles: { width: '400px', height: '400px', transform: 'scale(2)' },
    });
    const source = createBox({ parent, styles: { display: 'contents' } });

    expect(coordinates(source, box())).toBe(false);
    expectNear(inherited(source)[SPACE_A]!, 2);
  });

  it('should answer for an element fragmented across lines', () => {
    const parent = createFlowBox({
      styles: { width: '60px', transform: 'scale(2)', transformOrigin: '0 0' },
    });
    const source = createFlowBox({
      parent,
      tag: 'span',
      styles: { display: 'inline', width: 'auto', height: 'auto' },
    });

    source.textContent = 'aaaa bbbb cccc dddd eeee ffff';
    expect(source.getClientRects().length).toBeGreaterThan(1);
    expect(coordinates(source, box())).toBe(false);
    expectNear(inherited(source)[SPACE_A]!, 2);
  });

  it('should answer for a disconnected element', () => {
    const out = space();

    expect(ancestry(document.createElement('div'), out)).toBe(true);
    expectNear(out[SPACE_A]!, 1);
  });

  it('should reject an ancestor that is not representable in 2D', () => {
    const parent = createBox({
      styles: {
        width: '200px',
        height: '200px',
        transform: 'rotateX(30deg)',
      },
    });
    const out = space();

    expect(ancestry(createBox({ parent }), out)).toBe(false);
    expect(Array.from(out)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('coordinates with a supplied ancestry', () => {
  it('should agree with the internally read one', () => {
    const parent = createBox({
      styles: { width: '400px', height: '400px', transform: 'scale(2)' },
    });
    const source = createBox({
      parent,
      styles: { left: '10px', top: '20px', transform: 'rotate(30deg)' },
    });
    const supplied = box();

    expect(coordinates(source, supplied, inherited(source))).toBe(true);

    const internal = measure(source);

    for (let index = 0; index < BOX_LENGTH; index += 1) {
      expectNear(supplied[index]!, internal[index]!);
    }
  });

  it('should measure an element whose own transform is not 2D as a failure', () => {
    const source = createBox({ styles: { transform: 'rotateX(30deg)' } });

    expect(coordinates(source, box(), inherited(source))).toBe(false);
  });
});

describe('coordinates flat-tree traversal', () => {
  it('should compose a shadow host transform', () => {
    const { source } = createShadowBox('open');

    // `offsetParent` stops at the shadow boundary; the flat-tree walk does not.
    expectNear(measure(source)[BOX_E]!, 30);
  });

  it('should traverse a closed shadow root', () => {
    const { source } = createShadowBox('closed');

    expectNear(measure(source)[BOX_E]!, 30);
  });

  it('should traverse through an assigned slot', () => {
    const host = createBox({
      styles: { width: '200px', height: '150px', transform: 'scale(2)' },
    });
    const root = host.attachShadow({ mode: 'open' });
    const slot = document.createElement('slot');
    root.append(slot);

    const light = createBox({ parent: host, styles: { position: 'static' } });

    expectNear(measure(light)[BOX_A]!, 2);
  });
});

describe('coordinates recognized limits', () => {
  it('should preserve every output sentinel on a recognized failure', () => {
    const source = createBox();
    const out = sentinels();

    source.remove();

    expect(coordinates(source, out)).toBe(false);
    expect(Array.from(out)).toEqual(Array.from(sentinels()));
  });

  it('should reject a disconnected element', () => {
    const source = createBox();

    source.remove();

    expect(coordinates(source, box())).toBe(false);
  });

  it('should reject an element with no principal box', () => {
    expect(coordinates(createBox({ styles: { display: 'none' } }), box())).toBe(
      false,
    );
  });

  it('should reject a fragmented element', () => {
    const container = createFlowBox({
      styles: {
        width: '100px',
        height: '30px',
        columnCount: '2',
        columnGap: '0px',
        columnFill: 'auto',
      },
    });
    const source = createFlowBox({
      parent: container,
      styles: { display: 'block', width: '50px', height: '80px' },
    });

    expect(source.getClientRects().length).toBeGreaterThan(1);
    expect(coordinates(source, box())).toBe(false);
  });

  it('should reject a 3D transform', () => {
    expect(
      coordinates(
        createBox({ styles: { transform: 'rotateY(30deg)' } }),
        box(),
      ),
    ).toBe(false);
  });

  it('should reject an ancestor perspective', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', perspective: '500px' },
    });

    expect(coordinates(createBox({ parent }), box())).toBe(false);
  });

  it('should reject an ancestor preserve-3d', () => {
    const parent = createBox({
      styles: {
        width: '200px',
        height: '200px',
        transformStyle: 'preserve-3d',
      },
    });

    expect(coordinates(createBox({ parent }), box())).toBe(false);
  });

  it('should reject a 3D individual translate', () => {
    expect(
      coordinates(createBox({ styles: { translate: '0px 0px 10px' } }), box()),
    ).toBe(false);
  });

  it('should let an unexpected platform exception escape', () => {
    const source = createBox();

    Object.defineProperty(source, 'ownerDocument', {
      configurable: true,
      get() {
        throw new Error('owner document failed');
      },
    });

    expect(() => coordinates(source, box())).toThrow('owner document failed');
  });
});

describe('box', () => {
  it('should allocate storage of the required length', () => {
    expect(box()).toHaveLength(BOX_LENGTH);
  });
});

describe('space', () => {
  it('should allocate storage of the required length', () => {
    expect(space()).toHaveLength(SPACE_LENGTH);
  });
});
