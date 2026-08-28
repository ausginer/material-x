import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DraggableWarning } from '../../src/kernel/errors.ts';
import {
  acquireLift,
  acquireTopLayer,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type VisualLiftSession,
} from '../../src/kernel/presentation.ts';
import { createRealm } from '../../src/kernel/realm.ts';
import type { Unwind } from '../../src/kernel/unwind.ts';

const created: HTMLElement[] = [];
const sessions: VisualLiftSession[] = [];

/** The best-effort channel: a rollback that fails on its way out. */
let reported: unknown[] = [];

/**
 * **The unwind guard is an argument now** (D-130). `acquireTopLayer` is a free
 * function that holds no controller reference, so the fixture supplies the
 * guard and observes what it catches — which is what the ambient
 * `globalThis.reportError` stub used to do less directly.
 */
const unwind: Unwind = (step) => {
  try {
    return step();
  } catch (error) {
    reported.push(
      new DraggableWarning('drag: unwind/step-failed', { cause: error }),
    );
    return undefined;
  }
};

beforeEach(() => {
  reported = [];
});

afterEach(() => {});

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
  const { session } = acquireLift(
    visual,
    mode as Parameters<typeof acquireLift>[1],
    visual.getBoundingClientRect(),
    createRealm(visual),
    unwind,
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

  it('should restore an authored longhand the lift overwrote with a shorthand', () => {
    // The lift writes `margin: 0`. A shorthand only serializes when every
    // longhand is present, so capturing by shorthand records nothing here — and
    // restoring by shorthand then removes the authored declaration outright.
    const visual = createBox({ marginLeft: '17px' });
    const session = lift(visual, LIFT_FLAT);

    expect(visual.style.marginLeft).toBe('0px');
    session.dispose();

    expect(visual.style.marginLeft).toBe('17px');
  });

  it('should restore the authored longhands of every shorthand it writes', () => {
    // One case per shorthand the lift writes, because each is a separate entry
    // in the restored set and a missing one is silent.
    const visual = createBox();

    visual.style.setProperty('top', '11px');
    visual.style.setProperty('padding-bottom', '3px');
    visual.style.setProperty('border-right-width', '4px');
    visual.style.setProperty('border-left-style', 'dashed');
    visual.style.setProperty('border-top-color', 'rgb(1, 2, 3)');
    visual.style.setProperty('overflow-x', 'scroll');
    visual.style.setProperty('transition-duration', '3s');

    const session = lift(visual, LIFT_FLAT);

    session.dispose();

    expect(visual.style.top).toBe('11px');
    expect(visual.style.paddingBottom).toBe('3px');
    expect(visual.style.borderRightWidth).toBe('4px');
    expect(visual.style.borderLeftStyle).toBe('dashed');
    expect(visual.style.borderTopColor).toBe('rgb(1, 2, 3)');
    expect(visual.style.overflowX).toBe('scroll');
    expect(visual.style.transitionDuration).toBe('3s');
  });

  it('should restore the priority of an authored declaration', () => {
    // Priority is per declaration, so it can only be restored per longhand.
    const visual = createBox();

    visual.style.setProperty('padding-top', '5px', 'important');

    const session = lift(visual, LIFT_FLAT);

    session.dispose();

    expect(visual.style.getPropertyValue('padding-top')).toBe('5px');
    expect(visual.style.getPropertyPriority('padding-top')).toBe('important');
  });

  it('should leave a consumer write to an untouched property alone', () => {
    // The reason restoration is per property rather than a saved `style`
    // attribute: the consumer's own code runs during the drag and may write
    // inline styles the lift never touches.
    const visual = createBox();
    const session = lift(visual, LIFT_FLAT);

    visual.style.setProperty('opacity', '0.5');
    session.dispose();

    expect(visual.style.opacity).toBe('0.5');
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

describe('acquireLift cleanup', () => {
  it('should restore the inline styles when top-layer acquisition throws', () => {
    // A lift is all-or-nothing. The style lease is taken before the visual is
    // mutated, but the *caller* only receives it through the returned session —
    // so a throw after the mutation and before the return would leave the
    // visual restyled with nothing left that could ever restore it.
    const visual = createBox();

    visual.showPopover = (): void => {
      throw new Error('no top layer');
    };

    expect(() =>
      acquireLift(
        visual,
        LIFT_FLAT,
        visual.getBoundingClientRect(),
        createRealm(visual),
        unwind,
      ),
    ).toThrow('no top layer');

    expect(visual.style.position).toBe('absolute');
    expect(visual.style.width).toBe('80px');
  });

  it('should restore the inline styles when the top-layer release throws', () => {
    // The composite disposer releases the top layer first. That is consumer-
    // adjacent DOM state — a popover the page also drives — and a throw there
    // must not cost the visual its authored `position`, `width` and `transform`
    // permanently.
    const visual = createBox();
    const { session } = acquireLift(
      visual,
      LIFT_FLAT,
      visual.getBoundingClientRect(),
      createRealm(visual),
      unwind,
    );

    visual.hidePopover = (): void => {
      throw new Error('no hide');
    };

    expect(() => session.dispose()).toThrow('no hide');
    expect(visual.style.position).toBe('absolute');
    expect(visual.style.transform).toBe('');
  });
});

describe('acquireTopLayer rollback', () => {
  it('should leave no popover attribute when showPopover throws on a plain element', () => {
    // Promotion is two writes. Setting `popover` lands first, and until the
    // function returns there is no disposer that could undo it.
    const visual = createBox();

    visual.showPopover = (): void => {
      throw new Error('cannot promote');
    };

    expect(() => acquireTopLayer(visual, unwind)).toThrow('cannot promote');
    expect(visual.hasAttribute('popover')).toBe(false);
  });

  it('should restore the authored popover attribute when showPopover throws', () => {
    const visual = createBox();

    visual.setAttribute('popover', 'auto');
    visual.showPopover = (): void => {
      throw new Error('cannot promote');
    };

    expect(() => acquireTopLayer(visual, unwind)).toThrow('cannot promote');
    expect(visual.getAttribute('popover')).toBe('auto');
  });

  it('should keep the acquisition error primary when the rollback also throws', () => {
    // The rollback re-enters the very API that failed: restoring a
    // previously-open popover *is* another `showPopover()`. The acquisition
    // error is the one that explains why the lift was refused.
    const visual = createBox();
    let calls = 0;

    visual.setAttribute('popover', 'auto');
    visual.showPopover();
    visual.showPopover = (): void => {
      calls += 1;
      throw new Error(calls === 1 ? 'cannot promote' : 'cannot restore');
    };

    expect(() => acquireTopLayer(visual, unwind)).toThrow('cannot promote');
    // Both calls happened: the acquisition and the reopen the rollback tried.
    expect(calls).toBe(2);
  });

  it('should report a throwing rollback through the best-effort channel', () => {
    const visual = createBox();
    let calls = 0;

    visual.setAttribute('popover', 'auto');
    visual.showPopover();
    visual.showPopover = (): void => {
      calls += 1;
      throw new Error(calls === 1 ? 'cannot promote' : 'cannot restore');
    };

    expect(() => acquireTopLayer(visual, unwind)).toThrow('cannot promote');
    expect(
      reported.map((error) => ((error as Error).cause as Error).message),
    ).toEqual(['cannot restore']);
  });

  it('should restore the popover attribute even when the rollback throws', () => {
    // The reopen is the last rollback step, so everything before it must have
    // landed before the throw escaped.
    const visual = createBox();
    let calls = 0;

    visual.setAttribute('popover', 'auto');
    visual.showPopover();
    visual.showPopover = (): void => {
      calls += 1;
      throw new Error(calls === 1 ? 'cannot promote' : 'cannot restore');
    };

    expect(() => acquireTopLayer(visual, unwind)).toThrow('cannot promote');
    expect(visual.getAttribute('popover')).toBe('auto');
  });
});

describe('acquireTopLayer release', () => {
  it('should reopen a popover the page had already opened', () => {
    const visual = createBox();

    visual.setAttribute('popover', 'auto');
    visual.showPopover();
    acquireTopLayer(visual, unwind)();

    expect(visual.getAttribute('popover')).toBe('auto');
    expect(visual.matches(':popover-open')).toBe(true);
  });

  it('should restore a previously-open popover exactly once', () => {
    // The disposer is now reachable twice — from the acquisition catch and
    // from the presentation lifetime — so the latch carries real weight. It
    // cannot be observed through the *end state*, because restoring twice
    // lands on the same state; what a second pass costs is a redundant
    // close/reopen, two more top-layer transitions on a popover the page owns.
    const visual = createBox();

    visual.setAttribute('popover', 'auto');
    visual.showPopover();

    const dispose = acquireTopLayer(visual, unwind);
    const nativeHide = HTMLElement.prototype.hidePopover;
    let hides = 0;

    visual.hidePopover = function hidePopover(): void {
      hides += 1;
      nativeHide.call(this);
    };

    dispose();
    dispose();

    expect(hides).toBe(1);
    expect(visual.matches(':popover-open')).toBe(true);
  });
});
