/**
 * `drag:DRI-17`: the hot path. This file runs in the `shipped` project, with
 * `__DEV__` false, so the development equivalence check is not in the census.
 */
import { describe, expect, it } from 'vitest';
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
  moveHeld,
  press,
  release,
  rowsOf,
  onCleanup,
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
      // eslint-disable-next-line @typescript-eslint/unbound-method -- restored and called with `this`
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

      // The kernel is every module under `src/kernel/` and `src/draggable.ts`. A
      // sampling profile attributes in steps of its interval, so a few bytes per
      // move remain from reading an event field. An object per sample would show as
      // tens of bytes.
      expect(kernelPerMove, JSON.stringify(bytes)).toBeLessThan(16);
      expect(liftFunctions, JSON.stringify(bytes)).toEqual([
        'lift.ts:translate',
      ]);
    },
  );
});
