/**
 * `drag:DRI-17`: the hot path. This file runs in the `shipped` project, with
 * `__DEV__` false, so the development equivalence check is not in the census.
 */
import { describe, expect, it } from 'vitest';
import { Lifter } from '../src/lift.ts';
import { landing } from '../src/sortable/landing.ts';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  commands,
  frames,
  grab,
  isChromium,
  log,
  makeList,
  managed,
  moveHeld,
  press,
  release,
  rowsOf,
  onCleanup,
  targetOf,
} from './support/harness.ts';

/** Counts every layout-reading call on the prototypes that hold them. */
function countLayoutReads(): { reads(): number } {
  let count = 0;
  const originals: Array<() => void> = [];
  const wrapMethod = (target: object, name: string): void => {
    const original = (target as Record<string, unknown>)[name] as (
      this: unknown,
    ) => unknown;

    (target as Record<string, unknown>)[name] = function counted(
      this: unknown,
    ): unknown {
      count += 1;
      return original.call(this);
    };
    originals.push(() => {
      (target as Record<string, unknown>)[name] = original;
    });
  };
  const wrapGetter = (target: object, name: string): void => {
    const descriptor = Object.getOwnPropertyDescriptor(target, name)!;

    Object.defineProperty(target, name, {
      ...descriptor,
      get(this: unknown) {
        count += 1;
        return descriptor.get!.call(this);
      },
    });
    originals.push(() => {
      Object.defineProperty(target, name, descriptor);
    });
  };

  wrapMethod(Element.prototype, 'getBoundingClientRect');
  wrapMethod(Element.prototype, 'getClientRects');
  wrapGetter(HTMLElement.prototype, 'offsetWidth');
  wrapGetter(HTMLElement.prototype, 'offsetHeight');
  wrapGetter(HTMLElement.prototype, 'offsetLeft');
  wrapGetter(HTMLElement.prototype, 'offsetTop');
  onCleanup(() => {
    for (const restore of originals) {
      restore();
    }
  });

  return { reads: () => count };
}

describe('drag:DRI-17 hot path', () => {
  it('should read no layout in a sample, and none in a frame with nothing stale', async () => {
    const list = makeList(20);

    basicSortable(list);

    const start = await press('#r0');

    await commands.pointerMove(start.x + 5, start.y + 10, 2);
    await frames();
    await commands.pointerMove(start.x + 8, start.y + 12);
    await frames();

    const census = countLayoutReads();

    // Inside the same slot: the gap does not change.
    for (let i = 0; i < 20; i += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one sample per step
      await commands.pointerMove(start.x + 10 + i, start.y + 12);
      // oxlint-disable-next-line no-await-in-loop -- one sample per step
      await frames(1);
    }

    expect(census.reads()).toBe(0);
    await commands.keyPress('Escape');
  });

  it('should run the spatial search at most once per frame', async () => {
    const list = makeList(20);
    let resolved = 0;
    const originalItems = rowsOf(list);

    basicSortable(list, { items: () => originalItems });

    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await frames();

    const requestAnimationFrameOriginal =
      window.requestAnimationFrame.bind(window);

    window.requestAnimationFrame = (callback) => {
      resolved += 1;
      return requestAnimationFrameOriginal(callback);
    };
    onCleanup(() => {
      window.requestAnimationFrame = requestAnimationFrameOriginal;
    });

    // One command delivering several samples in one frame schedules one task.
    await commands.pointerMove(start.x + 40, start.y + 21, 8);

    const scheduled = resolved;

    window.requestAnimationFrame = requestAnimationFrameOriginal;
    expect(scheduled).toBeLessThanOrEqual(8);
    await frames();
    await commands.keyPress('Escape');
  });

  it.each([
    [false, 0],
    [true, 1],
  ] as const)(
    'should measure a landing target only with a landing composed: %s',
    async (composed, expected) => {
      const list = makeList(4);
      const original = Element.prototype.getBoundingClientRect;
      let placeholderReads = 0;

      Element.prototype.getBoundingClientRect = function measure(
        this: Element,
      ) {
        if (this.hasAttribute('data-drag-placeholder')) {
          placeholderReads += 1;
        }

        return original.call(this);
      };
      onCleanup(() => {
        Element.prototype.getBoundingClientRect = original;
      });
      basicSortable(list, {
        ...(composed ? { landing: landing() } : {}),
        onReorder({ item, next }) {
          placeholderReads = 0;
          list.insertBefore(item, next);
          return ReorderResolution.accept();
        },
        onEnd() {
          log.push(`reads=${placeholderReads}`);
        },
      });
      await grab('#r0', 0, 90);
      await release();
      expect(log.at(-1)).toBe(`reads=${expected}`);
    },
  );

  it('drag:DRD-47 should read as many rects at a pointer drop with a warm cache for 20 items as for 400', async () => {
    const readsAtDrop = async (count: number): Promise<number> => {
      const list = makeList(count);
      const controller = basicSortable(list);
      const start = await press('#r0');

      // Past the threshold, then across one row, so the drop follows a committed
      // move and a frame that resolved against a warm cache.
      await commands.pointerMove(start.x, start.y + 20, 2);
      await frames();
      await moveHeld(start.x, start.y + 50);

      const census = countLayoutReads();

      await commands.pointerUp();
      // A frame passes in every engine before the release is counted, and with no
      // landing nothing after the drop reads layout.
      await frames();

      const reads = census.reads();

      await controller.requestDestroy();
      list.remove();
      return reads;
    };

    const few = await readsAtDrop(20);
    const many = await readsAtDrop(400);

    expect(log.filter((entry) => entry === 'end:accepted')).toHaveLength(2);
    expect(many).toBe(few);
  });

  it('drag:DRD-49 should read as many rects from the activation through its first frame for 20 items as for 400', async () => {
    const readsAtActivation = async (count: number): Promise<number> => {
      const list = makeList(count);
      const controller = basicSortable(list);
      const start = await press('#r0');
      const census = countLayoutReads();

      // Past the threshold, and within one row of the placeholder.
      await commands.pointerMove(start.x, start.y + 20, 2);
      await frames();

      const reads = census.reads();

      // Released, so that the next list's press is a new press in every engine.
      await commands.pointerUp();
      await frames();
      await controller.requestDestroy();
      list.remove();
      return reads;
    };

    const few = await readsAtActivation(20);
    const many = await readsAtActivation(400);

    expect(log.filter((entry) => entry === 'end:noop')).toHaveLength(2);
    expect(many).toBe(few);
  });

  it('should run no consumer callback per sample', async () => {
    const list = makeList(5);
    let calls = 0;

    basicSortable(list, {
      items() {
        calls += 1;
        return rowsOf(list);
      },
    });

    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await frames();

    const before = calls;

    await moveHeld(start.x + 30, start.y + 21);
    expect(calls).toBe(before);
    await commands.keyPress('Escape');
  });

  it.runIf(isChromium)(
    'should allocate per sample only the CSS string a lifted write needs',
    async () => {
      const list = makeList(20);

      basicSortable(list);

      const start = await press('#r0');

      await commands.pointerMove(start.x, start.y + 10, 2);
      await frames();

      // This first pass is not sampled. It lets the kernel's code reach its
      // optimized form, so the test bounds what warm code allocates. What the
      // earlier tiers allocate depends on what ran before the test.
      for (let i = 0; i < 300; i += 1) {
        // oxlint-disable-next-line no-await-in-loop -- one sample per step
        await commands.pointerMove(start.x + (i % 40), start.y + 12);
      }

      await frames();
      await commands.startHeapSampling(64);

      for (let i = 0; i < 300; i += 1) {
        // Inside one slot, so that only samples and warm frames run.
        // oxlint-disable-next-line no-await-in-loop -- one sample per step
        await commands.pointerMove(start.x + (i % 40), start.y + 12);
      }

      // The server's root is this package, so a url path that starts with `/src/`
      // is this package's source, and a key is `<path under src>:<function>`.
      const bytes = await commands.stopHeapSampling('/src/');

      await commands.keyPress('Escape');

      const kernelPerMove =
        Object.entries(bytes)
          .filter(
            ([key]) =>
              key.startsWith('kernel/') || key.startsWith('draggable.ts:'),
          )
          .reduce((sum, [, size]) => sum + size, 0) / 300;
      const liftFunctions = Object.keys(bytes).filter((key) =>
        key.startsWith('lift.ts:'),
      );

      // The kernel is every module under `src/kernel/` and `src/draggable.ts`.
      // Warm, the kernel reads 0 to about 1 B per move. An allocation that
      // escapes, such as an object per sample, shows as tens of bytes.
      expect(kernelPerMove, JSON.stringify(bytes)).toBeLessThan(16);
      expect(liftFunctions, JSON.stringify(bytes)).toEqual([
        'lift.ts:translate',
      ]);
    },
  );

  it.runIf(isChromium)(
    'drag:DRF-2 should allocate per sample in the lift only its CSS string, at a non-integer displacement',
    async () => {
      const list = makeList(20);
      const lifter = new Lifter(window);

      managed(list, {
        admit: (event) => ({ item: targetOf(event) }),
        activate(drag) {
          const lift = lifter.acquire(drag);

          return {
            move() {
              // Off the integers, so every displacement `translate` receives is
              // one.
              lift.translate(
                drag.x - drag.originX + 0.25,
                drag.y - drag.originY + 0.5,
              );
            },
          };
        },
      }).use(lifter.cancelLanding);

      const start = await press('#r0');

      await commands.pointerMove(start.x, start.y + 10, 2);
      await frames();
      await commands.startHeapSampling(16);

      for (let i = 0; i < 300; i += 1) {
        // oxlint-disable-next-line no-await-in-loop -- one sample per step
        await commands.pointerMove(start.x + (i % 40), start.y + 12);
      }

      const bytes = await commands.stopHeapSampling('/src/');

      await commands.keyPress('Escape');

      const liftFunctions = Object.keys(bytes).filter((key) =>
        key.startsWith('lift.ts:'),
      );
      const translatePerMove = (bytes['lift.ts:translate'] ?? 0) / 300;

      expect(liftFunctions, JSON.stringify(bytes)).toEqual([
        'lift.ts:translate',
      ]);
      // The bound is set by a rule, not chosen: the largest of five runs of this
      // test without it, rounded up to a whole byte, plus 8. Measured at the commit
      // that added this test, the five read 140.03 to 144.85 B per move. If they
      // had differed by more than 8 B, the interval could not resolve a small
      // object.
      expect(translatePerMove, JSON.stringify(bytes)).toBeLessThan(153);
    },
  );
});
