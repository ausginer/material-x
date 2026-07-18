import { afterEach, describe, expect, it } from 'vitest';
import { createMapper, viewportMatrix } from '../../src/kernel/coordinate.ts';

/**
 * A reference box with the given inline styles, appended to the body. Always
 * borderless and `position: relative` so its border-box origin coincides with
 * the padding origin absolutely-positioned probes are measured against.
 */
function reference(css: Partial<CSSStyleDeclaration>): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'relative',
    width: '200px',
    height: '150px',
    border: '0',
    padding: '0',
  });
  Object.assign(el.style, css);
  document.body.append(el);
  return el;
}

/**
 * Ground-truth viewport image of the local point `(lx, ly)` inside `ref`: a
 * zero-size marker positioned there measures as that single transformed point,
 * so its rect corner is the exact viewport coordinate — rotation and skew
 * included, with no axis-aligned bounding-box error.
 */
function probe(
  ref: HTMLElement,
  lx: number,
  ly: number,
): { x: number; y: number } {
  const marker = document.createElement('div');
  Object.assign(marker.style, {
    position: 'absolute',
    left: `${lx}px`,
    top: `${ly}px`,
    width: '0',
    height: '0',
  });
  ref.append(marker);
  const rect = marker.getBoundingClientRect();
  marker.remove();
  return { x: rect.left, y: rect.top };
}

/** Asserts the mapper agrees with the browser at a spread of local points. */
function expectAnchored(ref: HTMLElement): void {
  const mapper = createMapper(ref);

  for (const [lx, ly] of [
    [0, 0],
    [200, 0],
    [0, 150],
    [200, 150],
    [70, 40],
  ] as const) {
    const mapped = mapper.toViewport({ x: lx, y: ly });
    const truth = probe(ref, lx, ly);

    expect(mapped.x).toBeCloseTo(truth.x, 1);
    expect(mapped.y).toBeCloseTo(truth.y, 1);

    // The inverse round-trips back to the same local point.
    const back = mapper.fromViewport(mapped);
    expect(back.x).toBeCloseTo(lx, 1);
    expect(back.y).toBeCloseTo(ly, 1);
  }
}

describe('viewportMatrix', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should map an untransformed element to its viewport rect', () => {
    const ref = reference({ left: '30px', top: '40px', position: 'absolute' });
    const rect = ref.getBoundingClientRect();
    const origin = viewportMatrix(ref).transformPoint(new DOMPoint(0, 0));

    expect(origin.x).toBeCloseTo(rect.left, 1);
    expect(origin.y).toBeCloseTo(rect.top, 1);
  });

  it('should anchor local points under a translate', () => {
    expectAnchored(reference({ transform: 'translate(45px, 25px)' }));
  });

  it('should anchor local points under a uniform scale', () => {
    expectAnchored(reference({ transform: 'scale(1.5)' }));
  });

  it('should anchor local points under a non-uniform scale', () => {
    expectAnchored(reference({ transform: 'scale(1.4, 0.6)' }));
  });

  it('should anchor local points under a rotation', () => {
    expectAnchored(reference({ transform: 'rotate(20deg)' }));
  });

  it('should anchor local points under a skew', () => {
    expectAnchored(reference({ transform: 'skew(12deg, 7deg)' }));
  });

  it('should anchor local points under a custom transform-origin', () => {
    expectAnchored(
      reference({
        transform: 'rotate(15deg) scale(1.3)',
        transformOrigin: '20px 10px',
      }),
    );
  });

  it('should anchor local points under CSS zoom', () => {
    expectAnchored(reference({ zoom: '1.6' }));
  });
});

describe('createMapper', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should anchor local points under nested transforms and zoom', () => {
    const outer = reference({
      zoom: '0.8',
      transform: 'rotate(6deg) scale(1.25)',
    });
    const inner = document.createElement('div');
    Object.assign(inner.style, {
      position: 'absolute',
      left: '20px',
      top: '15px',
      width: '120px',
      height: '90px',
      transform: 'translateX(30px) skewY(3deg)',
    });
    outer.append(inner);

    const mapper = createMapper(inner);

    for (const [lx, ly] of [
      [0, 0],
      [120, 0],
      [0, 90],
      [60, 45],
    ] as const) {
      const mapped = mapper.toViewport({ x: lx, y: ly });
      const truth = probe(inner, lx, ly);

      expect(mapped.x).toBeCloseTo(truth.x, 0);
      expect(mapped.y).toBeCloseTo(truth.y, 0);
    }
  });

  it('should convert viewport deltas into scaled local deltas', () => {
    const ref = reference({ transform: 'scale(2, 4)' });
    const mapper = createMapper(ref);

    // A viewport delta shrinks by the local scale on each axis.
    const local = mapper.deltaFromViewport({ x: 20, y: 20 });

    expect(local.x).toBeCloseTo(10, 1);
    expect(local.y).toBeCloseTo(5, 1);
  });
});
