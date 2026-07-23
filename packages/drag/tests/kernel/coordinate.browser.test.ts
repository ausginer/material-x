import { afterEach, describe, expect, it } from 'vitest';
import {
  ancestorZoom,
  createMapper,
  IDENTITY_MAPPER,
  viewportMatrix,
} from '../../src/kernel/coordinate.ts';
import { createRealm } from '../../src/kernel/realm.ts';
import type { Point } from '../../src/kernel/types.ts';

function createBox(
  styles: Partial<CSSStyleDeclaration> = {},
  parent: HTMLElement = document.body,
): HTMLElement {
  const el = document.createElement('div');
  Object.assign(
    el.style,
    {
      position: 'absolute',
      left: '40px',
      top: '60px',
      width: '80px',
      height: '50px',
      boxSizing: 'border-box',
    },
    styles,
  );
  parent.append(el);
  return el;
}

/**
 * The element's border-box origin in viewport space, as the matrix reports it.
 * This is the value the whole coordinate layer exists to produce, so comparing
 * it against `getBoundingClientRect` is an independent oracle rather than a
 * restatement of the implementation.
 */
function matrixOrigin(el: HTMLElement): Point {
  const realm = createRealm(el);
  const point = viewportMatrix(el, realm).transformPoint(new DOMPoint(0, 0));
  return { x: point.x, y: point.y };
}

function expectOriginMatchesLayout(el: HTMLElement): void {
  const rect = el.getBoundingClientRect();
  const origin = matrixOrigin(el);

  // `offsetLeft`/`offsetTop` are integers, so allow one pixel of rounding.
  expect(origin.x).toBeCloseTo(rect.left, 0);
  expect(origin.y).toBeCloseTo(rect.top, 0);
}

describe('viewportMatrix', () => {
  afterEach(() => {
    document.body.replaceChildren();
    window.scrollTo(0, 0);
  });

  it('should map a plain positioned element to its viewport origin', () => {
    expectOriginMatchesLayout(createBox());
  });

  it('should accumulate nested offset parents', () => {
    const outer = createBox({ left: '30px', top: '20px', width: '400px' });
    const inner = createBox({ left: '15px', top: '25px' }, outer);

    expectOriginMatchesLayout(inner);
  });

  it('should fold in an ancestor transform', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      transform: 'translate(25px, 15px)',
    });

    expectOriginMatchesLayout(createBox({ left: '10px', top: '10px' }, stage));
  });

  it('should fold in an ancestor transform taken about a non-default origin', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      transform: 'scale(1.5)',
      transformOrigin: '0 0',
    });

    expectOriginMatchesLayout(createBox({ left: '20px', top: '30px' }, stage));
  });

  it('should fold in the element own transform', () => {
    expectOriginMatchesLayout(createBox({ transform: 'translate(12px, 8px)' }));
  });

  it('should compose two nested transforms', () => {
    const outer = createBox({
      width: '500px',
      height: '400px',
      transform: 'translate(20px, 10px)',
    });
    const middle = createBox(
      {
        left: '10px',
        top: '10px',
        width: '300px',
        height: '200px',
        transform: 'scale(1.25)',
      },
      outer,
    );

    expectOriginMatchesLayout(createBox({ left: '5px', top: '5px' }, middle));
  });

  it('should subtract ancestor scroll offsets', () => {
    const scroller = createBox({
      left: '0px',
      top: '0px',
      width: '200px',
      height: '150px',
      overflow: 'auto',
    });
    const inner = createBox(
      {
        position: 'relative',
        left: '0px',
        top: '0px',
        width: '180px',
        height: '600px',
      },
      scroller,
    );
    const box = createBox({ left: '20px', top: '300px' }, inner);
    scroller.scrollTop = 120;

    expectOriginMatchesLayout(box);
  });

  it('should account for the offset parent border', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      border: '12px solid black',
    });

    expectOriginMatchesLayout(createBox({ left: '10px', top: '10px' }, stage));
  });

  it('should account for page scroll', () => {
    const spacer = createBox({
      position: 'static',
      width: '10px',
      height: '3000px',
    });
    const box = createBox({ top: '1500px' });
    window.scrollTo(0, 400);

    expectOriginMatchesLayout(box);
    expect(spacer.isConnected).toBeTruthy();
  });

  it('should apply an ancestor CSS zoom', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      zoom: '2',
    });

    expectOriginMatchesLayout(createBox({ left: '20px', top: '15px' }, stage));
  });

  it('should apply the element own CSS zoom', () => {
    expectOriginMatchesLayout(createBox({ zoom: '1.5' }));
  });

  it('should combine ancestor zoom with an ancestor transform', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      zoom: '1.5',
      transform: 'translate(10px, 20px)',
    });

    expectOriginMatchesLayout(createBox({ left: '10px', top: '10px' }, stage));
  });
});

describe('ancestorZoom', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should be 1 with no zoomed ancestor', () => {
    const box = createBox();

    expect(ancestorZoom(box, createRealm(box))).toBeCloseTo(1, 5);
  });

  it('should report a single zoomed ancestor', () => {
    const stage = createBox({ zoom: '2' });
    const box = createBox({}, stage);

    expect(ancestorZoom(box, createRealm(box))).toBeCloseTo(2, 5);
  });

  it('should multiply nested zoomed ancestors', () => {
    const outer = createBox({ zoom: '2' });
    const inner = createBox({ zoom: '1.5' }, outer);
    const box = createBox({}, inner);

    expect(ancestorZoom(box, createRealm(box))).toBeCloseTo(3, 5);
  });

  it('should exclude the element own zoom', () => {
    const stage = createBox({ zoom: '2' });
    const box = createBox({ zoom: '4' }, stage);

    expect(ancestorZoom(box, createRealm(box))).toBeCloseTo(2, 5);
  });
});

describe('createMapper', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should map a local point into viewport space', () => {
    const stage = createBox({ width: '400px', height: '300px' });
    const mapper = createMapper(stage, createRealm(stage));
    const rect = stage.getBoundingClientRect();

    const mapped = mapper.toViewport({ x: 10, y: 20 });

    expect(mapped.x).toBeCloseTo(rect.left + 10, 0);
    expect(mapped.y).toBeCloseTo(rect.top + 20, 0);
  });

  it('should round-trip a point through viewport space', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      transform: 'translate(30px, 40px) scale(1.5)',
    });
    const mapper = createMapper(stage, createRealm(stage));
    const local: Point = { x: 17, y: 23 };

    const round = mapper.fromViewport(mapper.toViewport(local));

    expect(round.x).toBeCloseTo(local.x, 3);
    expect(round.y).toBeCloseTo(local.y, 3);
  });

  it('should ignore translation when mapping a delta', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      transform: 'translate(120px, 80px)',
    });
    const mapper = createMapper(stage, createRealm(stage));

    // A delta is a direction, not a position: pure translation must not move it.
    const delta = mapper.deltaFromViewport({ x: 10, y: 20 });

    expect(delta.x).toBeCloseTo(10, 3);
    expect(delta.y).toBeCloseTo(20, 3);
  });

  it('should scale a delta by an ancestor scale', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      transform: 'scale(2)',
      transformOrigin: '0 0',
    });
    const mapper = createMapper(stage, createRealm(stage));

    // Moving 20 viewport pixels covers 10 local units inside a 2x space.
    const delta = mapper.deltaFromViewport({ x: 20, y: 40 });

    expect(delta.x).toBeCloseTo(10, 3);
    expect(delta.y).toBeCloseTo(20, 3);
  });

  it('should capture the transform once rather than tracking later changes', () => {
    const stage = createBox({ width: '400px', height: '300px' });
    const mapper = createMapper(stage, createRealm(stage));
    const before = mapper.toViewport({ x: 0, y: 0 });

    stage.style.transform = 'translate(500px, 500px)';

    // The mapper is an immutable snapshot taken at a discrete moment; coordinate
    // behaviour changes by supplying a replacement, never by mutating layout.
    expect(mapper.toViewport({ x: 0, y: 0 })).toEqual(before);
  });
});

describe('IDENTITY_MAPPER', () => {
  it('should return the same point from toViewport', () => {
    const point: Point = { x: 3, y: 4 };

    expect(IDENTITY_MAPPER.toViewport(point)).toBe(point);
  });

  it('should return the same point from fromViewport', () => {
    const point: Point = { x: 3, y: 4 };

    expect(IDENTITY_MAPPER.fromViewport(point)).toBe(point);
  });

  it('should return the same delta from deltaFromViewport', () => {
    const delta: Point = { x: 3, y: 4 };

    expect(IDENTITY_MAPPER.deltaFromViewport(delta)).toBe(delta);
  });
});
