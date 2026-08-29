/**
 * **Zero reads across a committed move**, and none on a warm spatial frame.
 *
 * The claim made executable rather than asserted in prose, and stated at the
 * precision the flow-versus-presented amendment left it:
 *
 * - **a warm spatial frame reads nothing**, in every composition. This is the
 *   read that dominated — it was once per frame — and it is unconditional;
 * - **a committed move on a linear axis reads nothing once the displacement
 *   constant is established**, which costs one row, once per operation and once
 *   more after each invalidation;
 * - **a committed move on `xy()` performs one measured rebuild**, because a
 *   cellular move cannot be predicted from presented geometry at all. That is
 *   one list-wide pass where the old shape paid two.
 *
 * **It replaces M-4′**, which measured the same bracket when it read `n − 1`
 * candidates and the placeholder on every committed move, and recorded the read
 * count's position relative to the write. There is no position left to record.
 *
 * **Reads are counted per element, never on `Element.prototype`.** The
 * prototype is shared with every other browser-mode file in the same page, so a
 * prototype patch would count the suite instead of the drag. Only the fixture's
 * own rows and its placeholder are instrumented, which is the whole set a
 * committed move could touch.
 *
 * **The equivalence instrument is switched off for this file**, and that is not
 * a weakening. It performs the very full scan these counts exist to detect, it
 * is `DEV`-only, and it exists in no build a consumer can install — leaving it
 * on would report a number that describes nothing that ships. `g3-conformance`
 * is where it runs.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { setRefreshVerification } from '../../src/sortable/rect-index.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  type SortableConfig,
  type SortableController,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 31;
const ITEM_HEIGHT = 40;
const COUNT = 6;

const cleanup: Array<() => void> = [];

beforeEach(() => {
  // See the file header: the instrument is the one thing in a `DEV` build that
  // reads geometry on this path.
  setRefreshVerification(false);
});

afterEach(() => {
  setRefreshVerification(true);

  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

type Field = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  placeholder(): HTMLElement | null;
  /** Counts every `getBoundingClientRect` on the rows and the placeholder. */
  instrument(): void;
  reads(): number;
}>;

const press = (target: HTMLElement, y: number): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: y,
    }),
  );
};

const pointerEvent = (type: string, y: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: 10,
      clientY: y,
    }),
  );
};

const move = (y: number): void => {
  pointerEvent('pointermove', y);
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

function compose(...fragments: ReadonlyArray<Partial<SortableConfig>>): Field {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < COUNT; i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const current: readonly HTMLElement[] = items;
  const controller = sortable(
    root,
    {
      items: () => current,
      axis: y(),
      onReorder: () => ReorderResolution.accept(),
    },
    ...fragments,
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  let reads = 0;
  const placeholder = (): HTMLElement | null =>
    root.querySelector('[data-drag-placeholder]');

  /** Wrap one element's own `getBoundingClientRect`, never the prototype's. */
  const count = (element: HTMLElement): void => {
    const native = element.getBoundingClientRect.bind(element);

    element.getBoundingClientRect = (): DOMRect => {
      reads += 1;

      return native();
    };
  };

  const field: Field = {
    root,
    items,
    controller,
    placeholder,
    instrument(): void {
      const counted = [...items];
      const hole = placeholder();

      if (hole) {
        counted.push(hole);
      }

      counted.forEach(count);
    },
    reads: () => reads,
  };

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return field;
}

/**
 * Press the first row and cross the threshold, then let the first spatial frame
 * rebuild the cache — the one measured pass every operation is entitled to.
 *
 * **The second frame is the one that matters.** Activation invalidates, and the
 * rebuild that services it runs on the first spatial frame after it, which
 * lands *after* the press rather than inside it. Instrumenting before that
 * rebuild would count the activation scan.
 */
const settle = async (field: Field): Promise<void> => {
  press(field.items[0]!, 10);
  move(30);
  await nextFrame();
  move(31);
  await nextFrame();
};

/** The gap the pointer sits in, as a string of item indices and `_`. */
const order = (field: Field): string =>
  [...field.root.children]
    .map((child) => {
      const index = field.items.indexOf(child as HTMLElement);

      return index === -1 ? '_' : String(index);
    })
    .join('');

/** Commit one placeholder move by crossing `steps` boundaries from the press. */
const commit = async (steps: number): Promise<void> => {
  move(30 + ITEM_HEIGHT * steps);
  await nextFrame();
};

describe('a committed move reads no geometry', () => {
  it('should read one row on the move that establishes the constant', async () => {
    // **The linear axis's whole measured budget, and it is one row.** The
    // displacement constant is a flow quantity, so it cannot be derived from a
    // difference between two elements' measured rects — it is observed once, as
    // one crossed row's own displacement across one committed move.
    const field = compose();

    await settle(field);
    field.instrument();

    const before = order(field);

    await commit(2);

    expect(order(field)).not.toBe(before);
    expect(field.reads()).toBe(1);
  });

  it('should read nothing in the minimal composition', async () => {
    const field = compose();

    await settle(field);
    // The establishing move, which the row above prices. Everything after it is
    // predicted.
    await commit(2);
    field.instrument();

    const before = order(field);

    await commit(4);

    expect(order(field)).not.toBe(before);
    expect(field.reads()).toBe(0);
  });

  it('should read one rebuild and no more with xy()', async () => {
    // **`xy()` does not predict, and this is the amended claim.** A cellular
    // move sets a slot to the position another slot holds, which carries the
    // difference of two elements' authored presentation; no single measurement
    // recovers that. So a committed move here rebuilds after the write — five
    // destination rows and the placeholder, **once**, where the old shape paid
    // a list-wide pass on each side of it.
    const field = compose({ axis: xy() });

    await settle(field);
    await commit(2);
    field.instrument();

    const before = order(field);

    await commit(4);

    expect(order(field)).not.toBe(before);
    expect(field.reads()).toBe(COUNT);
  });

  it('should read nothing with layoutAnimation composed', async () => {
    const field = compose(layoutAnimation({ duration: 500 }));

    await settle(field);
    await commit(2);
    field.instrument();

    const before = order(field);

    await commit(4);

    expect(order(field)).not.toBe(before);
    // The sink is handed vectors and measures nothing, which is what makes the
    // displaced composition read the same as the bare one.
    expect(field.reads()).toBe(0);
  });

  it('should read nothing on a warm spatial frame', async () => {
    // The other half of the claim, and the one that survived the amendment
    // untouched: a frame on which the pointer travels inside the same slot
    // proposes no move, and the cache it resolves against is already current —
    // including the placeholder's own rect, which used to be measured once per
    // frame in both rules.
    const field = compose(landing(), layoutAnimation({ duration: 500 }));

    await settle(field);
    field.instrument();

    const before = order(field);

    move(34);
    await nextFrame();

    expect(order(field)).toBe(before);
    expect(field.reads()).toBe(0);
  });

  it('should read nothing on a warm spatial frame with xy()', async () => {
    // **The measured rebuild is per committed move, not per frame.** Stated as
    // its own row because it is the property the amendment had to preserve
    // while narrowing the committed-move claim.
    const field = compose({ axis: xy() }, layoutAnimation({ duration: 500 }));

    await settle(field);
    field.instrument();

    const before = order(field);

    move(34);
    await nextFrame();

    expect(order(field)).toBe(before);
    expect(field.reads()).toBe(0);
  });

  it('should read the collection again once something invalidates', async () => {
    // **The control.** A test that counts zero everywhere is a test that
    // counts nothing, so this drives the one thing that still measures — an
    // invalidation — and shows the reads arrive.
    const field = compose();

    await settle(field);
    await commit(2);
    field.instrument();
    field.controller.invalidate();
    await commit(4);

    expect(field.reads()).toBeGreaterThan(0);
  });
});
