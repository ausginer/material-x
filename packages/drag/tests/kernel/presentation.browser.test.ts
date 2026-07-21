import { afterEach, describe, expect, it } from 'vitest';
import { IDENTITY_MAPPER } from '../../src/kernel/coordinate.ts';
import {
  acquireLift,
  acquireTopLayer,
  captureInlineStyles,
  createDragRenderer,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
} from '../../src/kernel/presentation.ts';
import { createRealm } from '../../src/kernel/realm.ts';
import type { Point } from '../../src/kernel/types.ts';

/** Sub-pixel tolerance: `offsetLeft`/`offsetTop` are integers. */
const NEAR = 1;

function expectRectNear(
  actual: DOMRectReadOnly,
  expected: DOMRectReadOnly,
): void {
  expect(actual.left).toBeCloseTo(expected.left, -Math.log10(NEAR));
  expect(actual.top).toBeCloseTo(expected.top, -Math.log10(NEAR));
  expect(actual.width).toBeCloseTo(expected.width, 1);
  expect(actual.height).toBeCloseTo(expected.height, 1);
}

/** A positioned box with predictable geometry. */
function createBox(
  styles: Partial<CSSStyleDeclaration> = {},
  parent: HTMLElement = document.body,
): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'absolute',
    left: '40px',
    top: '60px',
    width: '80px',
    height: '50px',
    boxSizing: 'border-box',
    ...styles,
  });
  parent.append(el);
  return el;
}

describe('acquireLift geometry contract', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  /**
   * The invariant a drag depends on: promoting the visual must be visually
   * transparent. If the lift's base transform is computed against a layout that
   * has already shifted, the element jumps the instant the drag starts.
   */
  it('should keep a faithful lift at the same viewport rect', () => {
    const box = createBox();
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();

    const lift = acquireLift(box, LIFT_FAITHFUL, before, (d) => d, realm);
    createDragRenderer(lift).render({ x: 0, y: 0 });

    expectRectNear(box.getBoundingClientRect(), before);
    lift.dispose();
  });

  it('should keep a flat lift at the same viewport rect', () => {
    const box = createBox();
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();

    const lift = acquireLift(box, LIFT_FLAT, before, (d) => d, realm);
    createDragRenderer(lift).render({ x: 0, y: 0 });

    expectRectNear(box.getBoundingClientRect(), before);
    lift.dispose();
  });

  it('should keep an in-place lift at the same viewport rect', () => {
    const box = createBox();
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();

    const lift = acquireLift(box, LIFT_IN_PLACE, before, (d) => d, realm);
    createDragRenderer(lift).render({ x: 0, y: 0 });

    expectRectNear(box.getBoundingClientRect(), before);
    lift.dispose();
  });

  it('should keep a faithful lift transparent inside a transformed ancestor', () => {
    const stage = createBox({
      left: '30px',
      top: '20px',
      width: '400px',
      height: '300px',
      transform: 'translate(25px, 15px)',
    });
    const box = createBox({ left: '10px', top: '10px' }, stage);
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();

    // The top layer escapes the ancestor transform, so the base matrix must
    // reintroduce it or the visual snaps to the untransformed position.
    const lift = acquireLift(box, LIFT_FAITHFUL, before, (d) => d, realm);
    createDragRenderer(lift).render({ x: 0, y: 0 });

    expectRectNear(box.getBoundingClientRect(), before);
    lift.dispose();
  });

  it('should keep a faithful lift transparent inside a scrolled container', () => {
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
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();

    const lift = acquireLift(box, LIFT_FAITHFUL, before, (d) => d, realm);
    createDragRenderer(lift).render({ x: 0, y: 0 });

    expectRectNear(box.getBoundingClientRect(), before);
    lift.dispose();
  });

  it('should translate a faithful lift by the rendered viewport delta', () => {
    const box = createBox();
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();
    const delta: Point = { x: 35, y: -20 };

    const lift = acquireLift(box, LIFT_FAITHFUL, before, (d) => d, realm);
    createDragRenderer(lift).render(delta);
    const after = box.getBoundingClientRect();

    expect(after.left - before.left).toBeCloseTo(delta.x, 0);
    expect(after.top - before.top).toBeCloseTo(delta.y, 0);
    lift.dispose();
  });

  it('should translate a faithful lift by the viewport delta under an ancestor transform', () => {
    const stage = createBox({
      width: '400px',
      height: '300px',
      transform: 'translate(25px, 15px)',
    });
    const box = createBox({ left: '10px', top: '10px' }, stage);
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();
    const delta: Point = { x: 40, y: 30 };

    const lift = acquireLift(box, LIFT_FAITHFUL, before, (d) => d, realm);
    createDragRenderer(lift).render(delta);
    const after = box.getBoundingClientRect();

    // Movement is authored in viewport pixels regardless of the ancestor.
    expect(after.left - before.left).toBeCloseTo(delta.x, 0);
    expect(after.top - before.top).toBeCloseTo(delta.y, 0);
    lift.dispose();
  });

  it('should restore the original viewport rect after disposal', () => {
    const box = createBox();
    const realm = createRealm(box);
    const before = box.getBoundingClientRect();

    const lift = acquireLift(box, LIFT_FAITHFUL, before, (d) => d, realm);
    createDragRenderer(lift).render({ x: 90, y: 90 });
    lift.dispose();

    expectRectNear(box.getBoundingClientRect(), before);
  });

  it('should promote a faithful lift into the top layer', () => {
    const box = createBox();
    const realm = createRealm(box);
    const lift = acquireLift(
      box,
      LIFT_FAITHFUL,
      box.getBoundingClientRect(),
      (d) => d,
      realm,
    );

    expect(box.matches(':popover-open')).toBeTruthy();

    lift.dispose();
    expect(box.matches(':popover-open')).toBeFalsy();
  });

  it('should leave an in-place lift in normal flow', () => {
    const box = createBox({ position: 'static' });
    const realm = createRealm(box);
    const lift = acquireLift(
      box,
      LIFT_IN_PLACE,
      box.getBoundingClientRect(),
      (d) => d,
      realm,
    );

    // In place stays in the container: no top layer, no fixed positioning.
    expect(box.matches(':popover-open')).toBeFalsy();
    expect(getComputedStyle(box).position).toBe('static');
    lift.dispose();
  });

  it('should compose the drag translation ahead of the authored transform', () => {
    const box = createBox({ transform: 'rotate(45deg)' });
    const realm = createRealm(box);
    const lift = acquireLift(
      box,
      LIFT_IN_PLACE,
      box.getBoundingClientRect(),
      (d) => IDENTITY_MAPPER.deltaFromViewport(d),
      realm,
    );

    // The authored rotation survives as its computed matrix; the engine only
    // prepends its own translation, so the consumer's transform still applies.
    const authored = getComputedStyle(box).transform;
    expect(lift.baseTransform).toBe(authored);
    expect(lift.compose({ x: 5, y: 5 })).toBe(
      `translate(5px, 5px) ${authored}`,
    );
    lift.dispose();
  });
});

describe('captureInlineStyles', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should restore a property that had no inline value by removing it', () => {
    const box = createBox();
    const restore = captureInlineStyles(box);

    box.style.transform = 'translate(10px, 10px)';
    restore();

    expect(box.style.transform).toBe('');
  });

  it('should restore a pre-existing inline value rather than clearing it', () => {
    const box = createBox({ transform: 'rotate(10deg)' });
    const restore = captureInlineStyles(box);

    box.style.transform = 'translate(10px, 10px)';
    restore();

    expect(box.style.transform).toBe('rotate(10deg)');
  });

  it('should preserve an inline priority flag through restoration', () => {
    const box = createBox();
    box.style.setProperty('transform', 'rotate(10deg)', 'important');
    const restore = captureInlineStyles(box);

    box.style.transform = 'translate(10px, 10px)';
    restore();

    expect(box.style.getPropertyPriority('transform')).toBe('important');
  });

  it('should be idempotent', () => {
    const box = createBox({ transform: 'rotate(10deg)' });
    const restore = captureInlineStyles(box);

    box.style.transform = 'translate(10px, 10px)';
    restore();
    box.style.transform = 'scale(2)';
    restore();

    // A second call is a no-op, so the value written after the first restore
    // survives rather than being reverted again.
    expect(box.style.transform).toBe('scale(2)');
  });
});

describe('acquireTopLayer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('should open the element as a manual popover', () => {
    const box = createBox();
    const release = acquireTopLayer(box);

    expect(box.matches(':popover-open')).toBeTruthy();
    expect(box.getAttribute('popover')).toBe('manual');
    release();
  });

  it('should remove the popover attribute the element did not have', () => {
    const box = createBox();
    const release = acquireTopLayer(box);

    release();

    expect(box.hasAttribute('popover')).toBeFalsy();
    expect(box.matches(':popover-open')).toBeFalsy();
  });

  it('should restore a pre-existing popover attribute', () => {
    const box = createBox();
    box.setAttribute('popover', 'auto');
    const release = acquireTopLayer(box);

    release();

    expect(box.getAttribute('popover')).toBe('auto');
  });

  it('should be idempotent', () => {
    const box = createBox();
    const release = acquireTopLayer(box);

    release();
    expect(() => {
      release();
    }).not.toThrow();
    expect(box.hasAttribute('popover')).toBeFalsy();
  });
});
