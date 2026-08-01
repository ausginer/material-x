import { afterEach, describe, expect, it } from 'vitest';
import {
  acquireLift,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type VisualLiftSession,
} from '../../src/kernel/presentation.ts';
import { createRealm } from '../../src/kernel/realm.ts';

const created: HTMLElement[] = [];
const sessions: VisualLiftSession[] = [];

afterEach(() => {
  for (const session of sessions.splice(0)) {
    session.dispose();
  }

  for (const element of created.splice(0)) {
    element.remove();
  }
});

function createBox(
  styles: Partial<CSSStyleDeclaration> = {},
  parent: HTMLElement = document.body,
): HTMLElement {
  const element = document.createElement('div');
  Object.assign(
    element.style,
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
  parent.append(element);
  created.push(element);
  return element;
}

function lift(visual: HTMLElement, mode: number): VisualLiftSession {
  const session = acquireLift(
    visual,
    mode as Parameters<typeof acquireLift>[1],
    visual.getBoundingClientRect(),
    createRealm(visual),
  );
  sessions.push(session);
  return session;
}

describe('VisualLiftSession.write', () => {
  it('should write the composed transform for a faithful lift', () => {
    const visual = createBox();
    const session = lift(visual, LIFT_FAITHFUL);

    session.write(17, 23);

    expect(visual.style.transform).toBe(session.compose(17, 23));
  });

  it('should write the composed transform for a flat lift', () => {
    const visual = createBox();
    const session = lift(visual, LIFT_FLAT);

    session.write(17, 23);

    expect(visual.style.transform).toBe(session.compose(17, 23));
  });

  it('should preserve the authored base transform of an in-place lift', () => {
    const visual = createBox({ transform: 'scale(2)' });
    const session = lift(visual, LIFT_IN_PLACE);

    session.write(10, 0);

    // The write is a translate composed *with* the authored transform, never a
    // replacement of it.
    expect(session.baseTransform).not.toBe('');
    expect(visual.style.transform).toContain(session.baseTransform);
  });

  it('should overwrite a previous write rather than accumulate', () => {
    const visual = createBox();
    const session = lift(visual, LIFT_FLAT);

    session.write(10, 10);
    session.write(20, 30);

    expect(visual.style.transform).toBe(session.compose(20, 30));
  });
});

describe('acquireLift', () => {
  it('should restore inline styles exactly once', () => {
    const visual = createBox({ transform: 'translate(5px, 5px)' });
    const authored = visual.style.transform;
    const session = lift(visual, LIFT_IN_PLACE);

    session.write(40, 40);
    session.dispose();
    session.dispose();

    expect(visual.style.transform).toBe(authored);
  });

  it('should remove an inline property the lift introduced', () => {
    const visual = createBox();
    const session = lift(visual, LIFT_FLAT);

    expect(visual.style.position).toBe('fixed');
    session.dispose();

    // `position` was authored as `absolute` before the lift, so restoration
    // returns it rather than removing it.
    expect(visual.style.position).toBe('absolute');
  });
});

describe('in-place projection', () => {
  /** How far the visual actually moved on screen, in viewport pixels. */
  function displacement(
    visual: HTMLElement,
    session: VisualLiftSession,
    x: number,
    y: number,
  ): Readonly<{ x: number; y: number }> {
    const before = visual.getBoundingClientRect();

    session.write(x, y);

    const after = visual.getBoundingClientRect();
    return { x: after.left - before.left, y: after.top - before.top };
  }

  it('should move the visual by the requested viewport delta with no ancestor transform', () => {
    const visual = createBox();
    const moved = displacement(visual, lift(visual, LIFT_IN_PLACE), 30, 20);

    expect(moved.x).toBeCloseTo(30, 1);
    expect(moved.y).toBeCloseTo(20, 1);
  });

  it('should not divide the visual own transform out of the delta', () => {
    // The translate is prepended, so it is applied outside the authored
    // `scale(2)` and must not be pre-divided by it.
    const visual = createBox({ transform: 'scale(2)' });
    const moved = displacement(visual, lift(visual, LIFT_IN_PLACE), 30, 20);

    expect(moved.x).toBeCloseTo(30, 1);
    expect(moved.y).toBeCloseTo(20, 1);
  });

  it('should divide an ancestor scale out of the delta', () => {
    const parent = createBox({
      position: 'absolute',
      width: '400px',
      height: '400px',
      transform: 'scale(2)',
      transformOrigin: '0 0',
    });
    const visual = createBox({}, parent);
    const moved = displacement(visual, lift(visual, LIFT_IN_PLACE), 30, 20);

    expect(moved.x).toBeCloseTo(30, 1);
    expect(moved.y).toBeCloseTo(20, 1);
  });

  it('should look past a display-contents wrapper to the scaling ancestor', () => {
    // A `display: contents` element has no principal box, so it cannot be
    // measured; the space the translate acts in is the next real ancestor.
    const grandparent = createBox({
      position: 'absolute',
      width: '400px',
      height: '400px',
      transform: 'scale(2)',
      transformOrigin: '0 0',
    });
    const wrapper = createBox({ display: 'contents' }, grandparent);
    const visual = createBox({}, wrapper);
    const moved = displacement(visual, lift(visual, LIFT_IN_PLACE), 30, 20);

    expect(moved.x).toBeCloseTo(30, 1);
    expect(moved.y).toBeCloseTo(20, 1);
  });

  it('should invert an ancestor rotation', () => {
    const parent = createBox({
      position: 'absolute',
      width: '400px',
      height: '400px',
      transform: 'rotate(90deg)',
      transformOrigin: '0 0',
    });
    const visual = createBox({}, parent);
    const moved = displacement(visual, lift(visual, LIFT_IN_PLACE), 30, 0);

    expect(moved.x).toBeCloseTo(30, 1);
    expect(moved.y).toBeCloseTo(0, 1);
  });
});
