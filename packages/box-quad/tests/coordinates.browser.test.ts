import { afterEach, describe, expect, it } from 'vitest';
import { box, cache, coordinates, type Box } from '../src/index.ts';
import {
  createBox,
  createFlowBox,
  createShadowBox,
  measure,
  resetDocument,
} from './support/fixtures.ts';

const BOX_LENGTH = 13;

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const BOX_ANCESTOR_ZOOM = 8;
const BOX_ANCESTOR_A = 9;
const BOX_ANCESTOR_B = 10;
const BOX_ANCESTOR_C = 11;
const BOX_ANCESTOR_D = 12;

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
  it('should default the ancestor zoom to 1', () => {
    expectNear(measure(createBox())[BOX_ANCESTOR_ZOOM]!, 1);
  });

  it('should report an ancestor zoom', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', zoom: '2' },
    });

    expectNear(measure(createBox({ parent }))[BOX_ANCESTOR_ZOOM]!, 2);
  });

  it('should multiply nested ancestor zooms', () => {
    const outer = createBox({
      styles: { width: '400px', height: '400px', zoom: '2' },
    });
    const inner = createBox({
      parent: outer,
      styles: { width: '200px', height: '200px', zoom: '1.5' },
    });

    expectNear(measure(createBox({ parent: inner }))[BOX_ANCESTOR_ZOOM]!, 3);
  });

  it('should exclude the element own zoom from the ancestor zoom', () => {
    // The element's own zoom is already carried by the matrix. Reporting it
    // twice would make a consumer cancelling inherited zoom cancel its own too.
    const measured = measure(createBox({ styles: { zoom: '2' } }));

    expectNear(measured[BOX_ANCESTOR_ZOOM]!, 1);
    expectNear(measured[BOX_A]!, 2);
  });

  it('should carry the own zoom in the matrix and the inherited zoom separately', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', zoom: '2' },
    });
    const measured = measure(createBox({ parent, styles: { zoom: '3' } }));

    expectNear(measured[BOX_ANCESTOR_ZOOM]!, 2);
    expectNear(measured[BOX_A]!, 6);
  });
});

describe('coordinates inherited basis', () => {
  it('should report an identity inherited basis for a plain box', () => {
    const measured = measure(createBox());

    expectNear(measured[BOX_ANCESTOR_A]!, 1);
    expectNear(measured[BOX_ANCESTOR_B]!, 0);
    expectNear(measured[BOX_ANCESTOR_C]!, 0);
    expectNear(measured[BOX_ANCESTOR_D]!, 1);
  });

  it('should exclude the element own transform from the inherited basis', () => {
    // The distinction that matters to a consumer writing a transform onto the
    // element: its own transform is not part of the space that transform acts
    // in.
    const measured = measure(createBox({ styles: { transform: 'scale(2)' } }));

    expectNear(measured[BOX_A]!, 2);
    expectNear(measured[BOX_ANCESTOR_A]!, 1);
  });

  it('should exclude the element own zoom from the inherited basis', () => {
    const measured = measure(createBox({ styles: { zoom: '2' } }));

    expectNear(measured[BOX_A]!, 2);
    expectNear(measured[BOX_ANCESTOR_A]!, 1);
  });

  it('should report an ancestor scale', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', transform: 'scale(3)' },
    });
    const measured = measure(createBox({ parent }));

    expectNear(measured[BOX_ANCESTOR_A]!, 3);
    expectNear(measured[BOX_ANCESTOR_D]!, 3);
  });

  it('should report an ancestor rotation', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', transform: 'rotate(90deg)' },
    });
    const measured = measure(createBox({ parent }));

    expectNear(measured[BOX_ANCESTOR_A]!, 0);
    expectNear(measured[BOX_ANCESTOR_B]!, 1);
    expectNear(measured[BOX_ANCESTOR_C]!, -1);
    expectNear(measured[BOX_ANCESTOR_D]!, 0);
  });

  it('should compose nested ancestor transforms', () => {
    const outer = createBox({
      styles: { width: '400px', height: '400px', transform: 'scale(2)' },
    });
    const inner = createBox({
      parent: outer,
      styles: { width: '200px', height: '200px', transform: 'scale(3)' },
    });

    expectNear(measure(createBox({ parent: inner }))[BOX_ANCESTOR_A]!, 6);
  });

  it('should include an ancestor zoom in the inherited basis', () => {
    const parent = createBox({
      styles: { width: '200px', height: '200px', zoom: '2' },
    });
    const measured = measure(createBox({ parent }));

    expectNear(measured[BOX_ANCESTOR_A]!, 2);
    expectNear(measured[BOX_ANCESTOR_ZOOM]!, 2);
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

    expectNear(measure(createBox({ parent: wrapper }))[BOX_ANCESTOR_A]!, 2);
  });

  it('should cross a shadow boundary to reach the host transform', () => {
    const { source } = createShadowBox('open');

    // `offsetParent` stops at the shadow boundary; the flat-tree walk does not.
    expectNear(measure(source)[BOX_ANCESTOR_A]!, 1);
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

    expectNear(measure(source)[BOX_ANCESTOR_A]!, 2);
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

describe('coordinates caching', () => {
  it('should serve a repeated read from one epoch', () => {
    const recache = cache();
    const source = createBox();
    const first = box();
    const second = box();

    expect(coordinates(source, first, recache)).toBe(true);
    expect(coordinates(source, second, recache)).toBe(true);

    expect(Array.from(second)).toEqual(Array.from(first));
  });

  it('should observe changed geometry after the epoch is ended', () => {
    const recache = cache();
    const source = createBox();
    const out = box();

    expect(coordinates(source, out, recache)).toBe(true);
    source.style.left = '30px';
    recache();
    expect(coordinates(source, out, recache)).toBe(true);

    expectNear(out[BOX_E]!, 30);
  });

  it('should stay usable across repeated epochs', () => {
    const recache = cache();
    const source = createBox();

    recache();
    recache();

    expect(coordinates(source, box(), recache)).toBe(true);
  });

  it('should keep separate caches independent', () => {
    const source = createBox();
    const first = cache();
    const second = cache();
    const firstOut = box();
    const secondOut = box();

    expect(coordinates(source, firstOut, first)).toBe(true);
    source.style.left = '30px';
    expect(coordinates(source, secondOut, second)).toBe(true);

    expectNear(secondOut[BOX_E]!, 30);
  });

  it('should perform a fresh read when no cache is supplied', () => {
    const source = createBox();
    const out = box();

    expect(coordinates(source, out)).toBe(true);
    source.style.left = '30px';
    expect(coordinates(source, out)).toBe(true);

    expectNear(out[BOX_E]!, 30);
  });

  it('should remeasure after cross-document adoption', () => {
    const recache = cache();
    const source = createBox({ styles: { left: '10px', top: '20px' } });
    const out = box();

    expect(coordinates(source, out, recache)).toBe(true);

    const frame = document.createElement('iframe');
    frame.style.border = '0';
    document.body.append(frame);
    const frameDocument = frame.contentDocument!;
    frameDocument.body.style.margin = '0px';
    frameDocument.adoptNode(source);
    source.style.left = '40px';
    frameDocument.body.append(source);

    // The cached entry belongs to the previous document, so it is not reused.
    expect(coordinates(source, out, recache)).toBe(true);
    expectNear(out[BOX_E]!, 40);
  });
});

describe('box', () => {
  it('should allocate storage of the required length', () => {
    expect(box()).toHaveLength(BOX_LENGTH);
  });
});
