/**
 * **What a committed move reads**, and that a warm spatial frame reads nothing.
 *
 * The claim made executable rather than asserted in prose, and stated at the
 * precision the flow-versus-presented amendment left it:
 *
 * - **a warm spatial frame reads nothing**, in every composition. This is the
 *   read that dominated — it was once per frame — and it is unconditional;
 * - **a committed move on a linear axis reads one row while the displacement
 *   constant is unestablished** — once per operation, and once more after each
 *   invalidation — **and one placeholder afterwards**. Where the hole lands is
 *   a flow quantity that no admissible prediction yields, so it is re-read on
 *   the spatial frame *after* the move, off a tree already laid out. A frame
 *   with no committed move before it still reads nothing;
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
  /**
   * Reads taken **inside the task that performed the placeholder write** — the
   * ones that force a synchronous layout, as against the ones a later animation
   * frame takes against a tree the browser has already laid out.
   */
  forced(): number;
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
  let forced = 0;
  /**
   * Whether the placeholder write is still on the stack, in the loose sense
   * that matters: the write happens inside an animation-frame callback, and a
   * microtask queued from it runs only once that callback has returned. So a
   * read counted while this is set is a read the write's own task performed,
   * and a read counted after it is one a later frame took.
   */
  let writing = false;
  const placeholder = (): HTMLElement | null =>
    root.querySelector('[data-drag-placeholder]');

  /** Wrap one element's own `getBoundingClientRect`, never the prototype's. */
  const count = (element: HTMLElement): void => {
    const native = element.getBoundingClientRect.bind(element);

    element.getBoundingClientRect = (): DOMRect => {
      reads += 1;

      if (writing) {
        forced += 1;
      }

      return native();
    };
  };

  /**
   * `movePlaceholder` writes through the **anchor row's** `before`/`after`, so
   * the rows are where the write is observable without patching a prototype
   * the whole page shares.
   */
  const watching =
    (
      native: (...nodes: Array<Node | string>) => void,
    ): ((...nodes: Array<Node | string>) => void) =>
    (...nodes) => {
      writing = true;
      queueMicrotask(() => {
        writing = false;
      });
      native(...nodes);
    };
  const watchWrite = (element: HTMLElement): void => {
    element.before = watching(element.before.bind(element));
    element.after = watching(element.after.bind(element));
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
      items.forEach(watchWrite);
    },
    reads: () => reads,
    forced: () => forced,
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

describe('a committed move reads only what it must', () => {
  it('should read one row on the move that establishes the constant', async () => {
    // **What the move itself costs, and it is one row.** The displacement
    // constant is a flow quantity, so it cannot be derived from a difference
    // between two elements' measured rects — it is observed once, as one
    // crossed row's own displacement across one committed move. The hole the
    // move left stale is read on the *next* frame, which this row stops before.
    const field = compose();

    await settle(field);
    field.instrument();

    const before = order(field);

    await commit(2);

    expect(order(field)).not.toBe(before);
    expect(field.reads()).toBe(1);
  });

  it('should read only the stale hole in the minimal composition', async () => {
    const field = compose();

    await settle(field);
    // The establishing move, which the row above prices. Everything after it is
    // predicted — except the hole, which is measured because no prediction G5
    // admits reaches it.
    await commit(2);
    field.instrument();

    const before = order(field);

    await commit(4);

    expect(order(field)).not.toBe(before);
    // One: the placeholder, at the head of this frame, left stale by the
    // preceding move. The crossed rows are predicted and cost nothing.
    expect(field.reads()).toBe(1);
  });

  it('should read the hole once however many rows the move crosses', async () => {
    // **The read is per move, not per crossed row**, which is the property that
    // separates this from the pre-arc model: that one read the placeholder on
    // every spatial frame, this reads it on the first frame after a move.
    const field = compose();

    await settle(field);
    await commit(2);
    field.instrument();

    // Two more moves, crossing four rows between them.
    await commit(4);
    await commit(1);

    expect(field.reads()).toBe(2);
  });

  it('should read one rebuild and no more with xy()', async () => {
    // **`xy()` does not predict, and this is the amended claim.** A cellular
    // move sets a slot to the position another slot holds, which carries the
    // difference of two elements' authored presentation; no single measurement
    // recovers that. So a committed move here rebuilds — five destination rows
    // and the placeholder, **once**, where the old shape paid a list-wide pass
    // on each side of the write.
    const field = compose({ axis: xy() });

    await settle(field);
    await commit(2);
    field.instrument();

    const before = order(field);

    await commit(4);

    expect(order(field)).not.toBe(before);
    expect(field.reads()).toBe(COUNT);
  });

  it('should force no layout in the write’s own task with a bare xy()', async () => {
    // **The measurement exists to be reported, so with nothing to report it
    // does not happen here** (F-205). A read taken straight after a DOM write
    // flushes layout; the same read taken on the following animation frame
    // finds a tree the browser has already laid out. The rebuild above is that
    // later pass — the count is unchanged and its instant is not.
    const field = compose({ axis: xy() });

    await settle(field);
    await commit(2);
    field.instrument();

    await commit(4);

    expect(field.forced()).toBe(0);
    expect(field.reads()).toBe(COUNT);
  });

  it('should measure inside the write’s own task once xy() has a sink', async () => {
    // **The other side of the same branch, and it is inherent rather than a
    // regression.** The vectors have to exist before the animations start, so
    // with a sink composed the rebuild happens where the write did. This row is
    // what keeps the one above from being read as "`xy()` never forces layout".
    const field = compose({ axis: xy() }, layoutAnimation({ duration: 500 }));

    await settle(field);
    await commit(2);
    field.instrument();

    await commit(4);

    expect(field.forced()).toBe(COUNT);
  });

  it('should force no layout in the write’s own task with a settled y()', async () => {
    // The linear axis's counterpart. The one read a settled `y()` still takes
    // is the stale hole, and it is taken at the head of the *following* frame
    // rather than beside the write — so the tree it finds is one the browser
    // has already laid out and nothing is forced.
    const field = compose();

    await settle(field);
    await commit(2);
    field.instrument();

    await commit(4);

    expect(field.forced()).toBe(0);
  });

  it('should read only the stale hole with layoutAnimation composed', async () => {
    const field = compose(layoutAnimation({ duration: 500 }));

    await settle(field);
    await commit(2);
    field.instrument();

    const before = order(field);

    await commit(4);

    expect(order(field)).not.toBe(before);
    // The sink is handed vectors and measures nothing, which is what makes the
    // displaced composition read the same as the bare one.
    expect(field.reads()).toBe(1);
  });

  it('should read nothing on a warm spatial frame', async () => {
    // The other half of the claim, and the one that survived both amendments
    // untouched: a frame on which the pointer travels inside the same slot
    // proposes no move, so nothing left the hole stale, and the cache it
    // resolves against is already current — including the placeholder's own
    // rect, which a per-frame model measured every time.
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

/**
 * **A committed move allocates nothing.**
 *
 * The sink's visitor arrives as an argument rather than as a plan coming back,
 * so a committed move constructs nothing at all — not even in a composition
 * that consumes no vectors, which passes `null` and never enters the walk.
 *
 * **Closures cannot be counted from script, so the checkable half is the
 * buffers**, and they are the half a per-candidate probe would show: one
 * scratch buffer per rebuild, and one more per establishing measurement.
 */
describe('a committed move allocates nothing', () => {
  const NativeBuffer = Float64Array;

  const buffersDuring = async (run: () => Promise<void>): Promise<number> => {
    let built = 0;

    // A subclass rather than a proxy, so every construction the library makes
    // is counted and every instance still behaves as the buffer it is.
    globalThis.Float64Array = class extends NativeBuffer {
      constructor(...args: ConstructorParameters<typeof NativeBuffer>) {
        super(...args);
        built += 1;
      }
    };

    try {
      await run();
    } finally {
      globalThis.Float64Array = NativeBuffer;
    }

    return built;
  };

  const compositions: ReadonlyArray<
    readonly [string, ReadonlyArray<Partial<SortableConfig>>]
  > = [
    ['minimal', []],
    ['minimal (xy)', [{ axis: xy() }]],
    ['minimal + layoutAnimation', [layoutAnimation({ duration: 500 })]],
    [
      'complete',
      [{ axis: xy() }, layoutAnimation({ duration: 500 }), landing()],
    ],
  ];

  for (const [name, fragments] of compositions) {
    it(`should build no buffer per committed move in ${name}`, async () => {
      const field = compose(...fragments);

      await settle(field);
      // Two moves first: the establishing read, and one growth the cellular
      // rule's own snapshot buffer is entitled to. Everything after them is
      // steady state, which is what this measures.
      await commit(2);
      await commit(4);

      const built = await buffersDuring(async () => {
        await commit(2);
        await commit(4);
      });

      expect(built).toBe(0);
    });
  }
});
