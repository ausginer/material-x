import { afterEach, describe, expect, it } from 'vitest';
import {
  ancestry,
  box,
  coordinates,
  delta,
  localDelta,
  space,
} from '../src/index.ts';
import { resetDocument } from './support/fixtures.ts';

afterEach(resetDocument);

const VIEWPORT_DX = 30;
const VIEWPORT_DY = -20;
const PRECISION = 5;

function createNested(ancestorStyle: string, ownStyle = ''): HTMLElement {
  const parent = document.createElement('div');
  const child = document.createElement('div');

  parent.style.cssText = `position: fixed; left: 200px; top: 200px; width: 100px; height: 100px; ${ancestorStyle}`;
  child.style.cssText = `position: absolute; left: 0; top: 0; width: 40px; height: 20px; ${ownStyle}`;
  parent.append(child);
  document.body.append(parent);
  return child;
}

const ANCESTOR_CASES: ReadonlyArray<readonly [string, string]> = [
  ['identity', ''],
  ['rotate', 'rotate: 30deg'],
  ['scale', 'scale: 2 0.5'],
  ['skew', 'transform: skewX(20deg)'],
  ['zoom', 'zoom: 1.5'],
  [
    'combined',
    'zoom: 1.25; rotate: -15deg; transform: scale(1.5) skewY(10deg)',
  ],
];

describe('localDelta', () => {
  it.each(ANCESTOR_CASES)(
    'should produce a Space delta that moves the element by the viewport delta under %s',
    (_name, ancestorStyle) => {
      const element = createNested(ancestorStyle);
      const before = element.getBoundingClientRect();
      const above = space();
      const out = delta();

      expect(ancestry(element, above)).toBe(true);
      expect(localDelta(above, VIEWPORT_DX, VIEWPORT_DY, out)).toBe(true);

      element.style.translate = `${out[0]}px ${out[1]}px`;

      const after = element.getBoundingClientRect();

      expect(after.left - before.left).toBeCloseTo(VIEWPORT_DX, PRECISION - 2);
      expect(after.top - before.top).toBeCloseTo(VIEWPORT_DY, PRECISION - 2);
    },
  );

  it.each(ANCESTOR_CASES)(
    'should produce a Box delta that resizes the element along the viewport delta under %s',
    (_name, ancestorStyle) => {
      const element = createNested(ancestorStyle, 'rotate: 10deg');
      const measured = box();
      const out = delta();

      expect(coordinates(element, measured)).toBe(true);
      expect(localDelta(measured, VIEWPORT_DX, VIEWPORT_DY, out)).toBe(true);

      // The linear part of a box maps its local axes to the viewport, so the
      // local result mapped back must recover the viewport delta.
      const [a, b, c, d] = measured as unknown as readonly [
        number,
        number,
        number,
        number,
      ];

      expect(a * out[0]! + c * out[1]!).toBeCloseTo(VIEWPORT_DX, PRECISION);
      expect(b * out[0]! + d * out[1]!).toBeCloseTo(VIEWPORT_DY, PRECISION);
    },
  );

  it('should return the delta unchanged for the identity basis', () => {
    const out = delta();

    expect(localDelta(Float64Array.of(1, 0, 0, 1, 1), 3, 4, out)).toBe(true);
    expect([...out]).toEqual([3, 4]);
  });

  it('should exclude the element own zoom from a Space and leave that division to the caller', () => {
    const element = createNested('', 'zoom: 2');
    const before = element.getBoundingClientRect();
    const above = space();
    const out = delta();

    ancestry(element, above);
    localDelta(above, VIEWPORT_DX, VIEWPORT_DY, out);
    element.style.translate = `${out[0]! / 2}px ${out[1]! / 2}px`;

    const after = element.getBoundingClientRect();

    expect(after.left - before.left).toBeCloseTo(VIEWPORT_DX, PRECISION - 2);
    expect(after.top - before.top).toBeCloseTo(VIEWPORT_DY, PRECISION - 2);
  });

  it('should leave the output untouched for a singular basis', () => {
    const out = Float64Array.of(11, 22);

    expect(localDelta(Float64Array.of(1, 2, 2, 4, 1), 3, 4, out)).toBe(false);
    expect([...out]).toEqual([11, 22]);
  });

  it('should leave the output untouched for a zero delta through a singular basis', () => {
    const out = Float64Array.of(11, 22);

    expect(localDelta(Float64Array.of(0, 0, 0, 0, 1), 0, 0, out)).toBe(false);
    expect([...out]).toEqual([11, 22]);
  });

  it('should leave the output untouched for a non-finite basis', () => {
    const out = Float64Array.of(11, 22);

    expect(localDelta(Float64Array.of(Number.NaN, 0, 0, 1, 1), 3, 4, out)).toBe(
      false,
    );
    expect([...out]).toEqual([11, 22]);
  });
});
