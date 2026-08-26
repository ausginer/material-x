/**
 * **The sortable half of L-5, and the gap Phase 11 left open.**
 *
 * Phase 11 found a lift-mode regression that all 644 tests of the day passed
 * through, because none of them compared the lifted row's **on-screen box** to
 * the placeholder's — it was caught by driving a demo. The sortable ships one
 * lift mode (`LIFT_FAITHFUL`, chosen so the lift and the placeholder agree),
 * and this suite is that comparison, under an ancestor transform and under
 * zoom.
 *
 * **The two claims, stated as boxes rather than as transforms:**
 *
 * - at activation the lifted row occupies **exactly** the placeholder's box —
 *   promotion is visually transparent, which is why `LIFT_FAITHFUL` writes its
 *   base matrix before the first sample rather than waiting for one;
 * - and it then travels by the **viewport** delta, not by the ancestor's scaled
 *   one.
 *
 * Both are read with `getBoundingClientRect()`, because a transform in an
 * inline style is not evidence about where a reader sees the row.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DraggableError, DraggableWarning } from '../../src/drag.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type SortableController,
} from '../../src/sortable.ts';

const POINTER_ID = 31;
const ITEM_HEIGHT = 40;
/**
 * `toBeCloseTo`'s precision **in digits**: 1 admits half a tenth of a pixel,
 * which is sub-pixel transform rounding and nothing else.
 */
const PRECISION = 1;

type Fixture = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  placeholder(): HTMLElement | null;
  controller: SortableController;
}>;

const cleanup: Array<() => void> = [];

/**
 * **Everything the library surfaces, in one array** (D-130). ~~A
 * `globalThis.reportError` stub.~~ The lift path's faults reach the consumer's
 * `onError` now, so the fixture collects there — which is also what makes
 * *nothing was reported* a claim about the published surface rather than about
 * an ambient global.
 */
let reported: Array<DraggableError | DraggableWarning> = [];

beforeEach(() => {
  reported = [];
});

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

function build(rootStyle: Readonly<Record<string, string>> = {}): Fixture {
  const root = document.createElement('div');

  Object.assign(
    root.style,
    {
      position: 'absolute',
      top: '120px',
      left: '40px',
      width: '200px',
    },
    rootStyle,
  );
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < 3; i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const controller = sortable(root, {
    items: () => items,
    axis: y(),
    onReorder: () => ReorderResolution.accept(),
    onError: (error): void => {
      reported.push(error);
    },
  });

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return {
    root,
    items,
    placeholder: () =>
      root.querySelector<HTMLElement>('[data-drag-placeholder]'),
    controller,
  };
}

const pointerEvent = (type: string, x: number, y_: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: x,
      clientY: y_,
    }),
  );
};

/**
 * Presses the first row 10px in from its own on-screen corner and crosses the
 * activation threshold. Returns the row's box **before** the lift and the grab
 * point, so a caller can go on dragging in viewport coordinates.
 *
 * The grab point is derived from the measured rect rather than from the root's
 * authored offsets, because under a transform the two disagree — which is the
 * whole subject here.
 */
const lift = (
  fixture: Fixture,
): Readonly<{ before: DOMRect; grabX: number; grabY: number }> => {
  const item = fixture.items[0]!;
  const before = item.getBoundingClientRect();
  const grabX = before.left + 10;
  const grabY = before.top + 10;

  item.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: grabX,
      clientY: grabY,
    }),
  );
  // 12px down: past the 8px threshold, so the row is lifted and the
  // placeholder is in the tree.
  pointerEvent('pointermove', grabX, grabY + 12);

  return { before, grabX, grabY };
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/**
 * Lifts, then drags `dy` viewport pixels down and lets the frame commit — the
 * sortable renders from the sample *after* the one that activated, so a
 * measurement taken without this frame reads the unmoved row.
 */
const drag = async (
  fixture: Fixture,
  dy: number,
): Promise<Readonly<{ before: DOMRect; after: DOMRect }>> => {
  const { before, grabX, grabY } = lift(fixture);

  pointerEvent('pointermove', grabX, grabY + dy);
  await nextFrame();

  return { before, after: fixture.items[0]!.getBoundingClientRect() };
};

describe('the lifted row', () => {
  it('should occupy the placeholder box at activation under an ancestor transform', () => {
    // Promotion is visually transparent: at the instant the row is lifted it is
    // exactly where it was, which is exactly where the placeholder now is.
    // Measured **before** any frame commits, which is the window the faithful
    // lift writes its base matrix for — the kernel activates *on* a sample and
    // renders from the next one, so without that write the row would paint at
    // the viewport origin, untransformed, for a whole frame.
    const fixture = build({
      transform: 'rotate(8deg) scale(1.3)',
      transformOrigin: '0 0',
    });
    const { before } = lift(fixture);
    const after = fixture.items[0]!.getBoundingClientRect();
    const slot = fixture.placeholder()!.getBoundingClientRect();

    expect(slot.left).toBeCloseTo(before.left, PRECISION);
    expect(slot.top).toBeCloseTo(before.top, PRECISION);
    expect(after.width).toBeCloseTo(slot.width, PRECISION);
    expect(after.height).toBeCloseTo(slot.height, PRECISION);
  });

  it('should travel by the viewport delta under an ancestor transform', async () => {
    // **The row a scale bug fails.** Under a 1.3× stage a 60px pointer travel
    // that composed in the ancestor's space would move the row 78 screen
    // pixels, and the pointer would slide off the row it grabbed.
    const fixture = build({
      transform: 'rotate(8deg) scale(1.3)',
      transformOrigin: '0 0',
    });
    const { before, after } = await drag(fixture, 60);

    expect(after.left).toBeCloseTo(before.left, PRECISION);
    expect(after.top).toBeCloseTo(before.top + 60, PRECISION);
    expect(after.width).toBeCloseTo(before.width, PRECISION);
    expect(after.height).toBeCloseTo(before.height, PRECISION);
  });

  it('should occupy the placeholder box at activation under zoom', () => {
    // The lift divides the inherited zoom back out, so the matrix stays the
    // sole source of scale — and the placeholder, which is *inside* the zoom,
    // still measures the same on-screen box.
    const fixture = build({ zoom: '2' });
    const { before } = lift(fixture);
    const after = fixture.items[0]!.getBoundingClientRect();
    const slot = fixture.placeholder()!.getBoundingClientRect();

    expect(slot.left).toBeCloseTo(before.left, PRECISION);
    expect(slot.top).toBeCloseTo(before.top, PRECISION);
    expect(after.width).toBeCloseTo(slot.width, PRECISION);
    expect(after.height).toBeCloseTo(slot.height, PRECISION);
  });

  it('should travel by the viewport delta under zoom', async () => {
    const fixture = build({ zoom: '2' });
    const { before, after } = await drag(fixture, 60);

    expect(after.left).toBeCloseTo(before.left, PRECISION);
    expect(after.top).toBeCloseTo(before.top + 60, PRECISION);
    expect(after.width).toBeCloseTo(before.width, PRECISION);
    expect(after.height).toBeCloseTo(before.height, PRECISION);
  });

  it('should report nothing at all while doing it', async () => {
    const fixture = build({ zoom: '2' });

    await drag(fixture, 60);

    expect(reported).toEqual([]);
  });
});
