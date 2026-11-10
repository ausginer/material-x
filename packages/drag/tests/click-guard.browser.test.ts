/** `drag:DRI-11`: input policy and the click guard. */
import { describe, expect, it } from 'vitest';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  centerOf,
  commands,
  deliveredClicks,
  dragAndDrop,
  engine,
  frames,
  grab,
  isChromium,
  log,
  makeList,
  managed,
  rawClicks,
  release,
  targetOf,
  wait,
} from './support/harness.ts';

/** A click target outside any list, for "the next click is delivered". */
function addOutside(): HTMLElement {
  const outside = document.createElement('button');

  outside.id = 'out';
  outside.textContent = 'outside';
  outside.style.cssText =
    'position:fixed;right:10px;top:10px;width:80px;height:40px';
  document.body.append(outside);
  return outside;
}

async function clickOn(target: string): Promise<void> {
  const { x, y } = centerOf(target);

  await commands.pointerMove(x, y);
  await commands.pointerDown();
  await commands.pointerUp();
  await wait(0);
}

describe('drag:DRI-11 the click guard', () => {
  it('should swallow the trailing click of a rejected drop, which produces one', async () => {
    addOutside();
    basicSortable(makeList(4), {
      onReorder: () => ReorderResolution.reject('no'),
    });
    await dragAndDrop('#r0', 90);
    expect(log).toEqual(['start', 'end:rejected']);
    await wait(0);
    expect(rawClicks.length).toBeGreaterThan(0);
    expect(deliveredClicks).toEqual([]);
    await clickOn('#out');
    expect(deliveredClicks).toEqual(['out']);
  });

  it('should swallow the trailing click of an accepted reorder, where the engine produces one', async () => {
    addOutside();
    basicSortable(makeList(4));
    await dragAndDrop('#r0', 90);
    await wait(0);
    // Chromium may produce no trailing click here, because the row moved.
    expect(deliveredClicks).toEqual([]);
    await clickOn('#out');
    expect(deliveredClicks).toEqual(['out']);
  });

  it('should swallow the trailing click of a cancel with the button held', async () => {
    addOutside();
    basicSortable(makeList(4));
    await grab('#r0', 0, 20);
    await commands.keyPress('Escape');
    expect(log).toEqual(['start', 'end:canceled']);
    await release();
    await wait(0);
    expect(rawClicks.length).toBeGreaterThan(0);
    expect(deliveredClicks).toEqual([]);
    await clickOn('#out');
    expect(deliveredClicks).toEqual(['out']);
  });

  it('should swallow the trailing click after destruction with the button held', async () => {
    addOutside();

    const controller = basicSortable(makeList(4));

    await grab('#r0', 0, 20);
    await controller.requestDestroy();
    await release();
    await wait(0);
    expect(rawClicks.length).toBeGreaterThan(0);
    expect(deliveredClicks).toEqual([]);
    await clickOn('#out');
    expect(deliveredClicks).toEqual(['out']);
  });

  it('should keep the click of a press below the threshold', async () => {
    basicSortable(makeList(4));

    const { x, y } = centerOf('#r1');

    await commands.pointerMove(x, y);
    await commands.pointerDown();
    await commands.pointerMove(x + 2, y + 2);
    await commands.pointerUp();
    await wait(0);
    expect(deliveredClicks).toEqual(['r1']);
    expect(log).toEqual([]);
  });

  it('should deliver a later click on the same list at once', async () => {
    basicSortable(makeList(4), {
      onReorder: () => ReorderResolution.reject('no'),
    });
    await dragAndDrop('#r0', 90);
    await wait(0);
    await clickOn('#r3');
    expect(deliveredClicks).toEqual(['r3']);
  });

  it('should hold for a custom behavior with no lift', async () => {
    addOutside();
    managed(makeList(2), {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({}),
    });
    await dragAndDrop('#r0', 30);
    await wait(0);
    expect(deliveredClicks).toEqual([]);
    await clickOn('#out');
    expect(deliveredClicks).toEqual(['out']);
  });

  /** Ends the drag with the button held, so that only the guard remains. */
  async function holdGuard(): Promise<number> {
    let pointerId = -1;
    const list = makeList(3);

    list.addEventListener(
      'pointerdown',
      (event) => {
        ({ pointerId } = event);
      },
      { once: true },
    );
    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({}),
    });
    await grab('#r0', 0, 20);
    await commands.keyPress('Escape');
    return pointerId;
  }

  const syntheticClick = (): void => {
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  it('should swallow a click while nothing has expired it', async () => {
    await holdGuard();
    syntheticClick();
    expect(rawClicks).toHaveLength(1);
    expect(deliveredClicks).toEqual([]);
  });

  it('should swallow one click only', async () => {
    await holdGuard();
    syntheticClick();
    syntheticClick();
    expect(deliveredClicks).toHaveLength(1);
  });

  it('should expire in the task after that pointer pointerup', async () => {
    const pointerId = await holdGuard();

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId }));
    await wait(0);
    syntheticClick();
    expect(deliveredClicks).toHaveLength(1);
  });

  it('should still swallow a click in the task of that pointer pointerup', async () => {
    const pointerId = await holdGuard();

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId }));
    syntheticClick();
    expect(deliveredClicks).toEqual([]);
  });

  it('should not expire at another pointer pointerup', async () => {
    const pointerId = await holdGuard();

    window.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: pointerId + 7 }),
    );
    await wait(0);
    syntheticClick();
    expect(deliveredClicks).toEqual([]);
  });

  it('should expire at that pointer pointercancel', async () => {
    const pointerId = await holdGuard();

    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId }));
    syntheticClick();
    expect(deliveredClicks).toHaveLength(1);
  });

  it('should expire at the next primary pointerdown', async () => {
    await holdGuard();
    window.dispatchEvent(
      new PointerEvent('pointerdown', { isPrimary: true, button: 0 }),
    );
    syntheticClick();
    expect(deliveredClicks).toHaveLength(1);
  });

  it('should deliver a real click after the release', async () => {
    addOutside();
    managed(makeList(2), {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({}),
    });
    await dragAndDrop('#r0', 30);
    await wait(0);
    await clickOn('#out');
    expect(deliveredClicks).toEqual(['out']);
  });

  it('should prevent only the move that crosses the threshold', async () => {
    const seen: boolean[] = [];
    const list = makeList(3);
    const note = (event: Event): void => {
      seen.push(event.defaultPrevented);
    };

    // The window sees a bubbling event after the kernel's document listener.
    window.addEventListener('pointermove', note);
    list.addEventListener('pointerdown', note);
    managed(list, {
      threshold: 8,
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({}),
    });

    const { x, y } = centerOf('#r0');

    await commands.pointerMove(x, y);
    seen.length = 0;
    await commands.pointerDown();
    await commands.pointerMove(x, y + 2);
    await commands.pointerMove(x, y + 12);
    await commands.pointerMove(x, y + 20);
    await commands.pointerMove(x, y + 28);
    await commands.pointerUp();
    window.removeEventListener('pointermove', note);
    await frames();
    expect(seen).toEqual([false, false, true, false, false]);
  });

  it.runIf(isChromium)(
    'should complete a touch drag with no platform cancel, and keep the next click',
    async () => {
      addOutside();

      const list = makeList(4);
      const events: string[] = [];

      list.addEventListener('pointercancel', () => {
        events.push('pointercancel');
      });
      basicSortable(list, {
        onReorder: () => ReorderResolution.reject('no'),
      });

      const { x, y } = centerOf('#r0');

      await commands.touch('touchStart', [{ id: 1, x, y }]);
      await commands.touch('touchMove', [{ id: 1, x, y: y + 20 }]);
      await commands.touch('touchMove', [{ id: 1, x, y: y + 50 }]);
      await frames();
      await commands.touch('touchEnd', []);
      await frames();
      expect(log).toEqual(['start', 'end:rejected']);
      expect(deliveredClicks).toEqual([]);

      await wait(0);
      // A synthesized tap produces no click in this environment, so the next click
      // comes from the mouse. Touch's own trailing click needs a device.
      await clickOn('#out');
      expect(deliveredClicks).toEqual(['out']);
    },
  );

  it.runIf(isChromium)(
    'should cancel with origin interrupted when the platform cancels a touch',
    async () => {
      const list = makeList(4);
      const origins: string[] = [];

      managed(list, {
        admit: (event) => ({ item: targetOf(event) }),
        activate: () => ({
          end(outcome) {
            origins.push(
              outcome.type === 'canceled' ? outcome.origin : outcome.type,
            );
          },
        }),
      });

      const { x, y } = centerOf('#r0');

      await commands.touch('touchStart', [{ id: 1, x, y }]);
      await commands.touch('touchMove', [{ id: 1, x, y: y + 20 }]);
      await commands.touch('touchCancel', []);
      await frames();
      expect(origins).toEqual(['interrupted']);
    },
  );

  it.runIf(isChromium)(
    'should follow the primary touch and ignore a second finger',
    async () => {
      const list = makeList(4);

      basicSortable(list);

      const { x, y } = centerOf('#r0');
      const second = { id: 2, x: x + 40, y: y + 100 };

      await commands.touch('touchStart', [{ id: 1, x, y }]);
      await commands.touch('touchMove', [{ id: 1, x, y: y + 20 }]);
      await commands.touch('touchStart', [{ id: 1, x, y: y + 20 }, second]);
      await commands.touch('touchMove', [
        { id: 1, x, y: y + 30 },
        { ...second, y: second.y + 30 },
      ]);
      await frames();
      expect(log).toEqual(['start']);
      expect(centerOf('#r0').y).toBeCloseTo(y + 30, 0);
      await commands.touch('touchEnd', []);
      await frames();
      expect(log.at(-1)).toMatch(/^end:/u);
    },
  );

  it('should prevent nothing on a press', async () => {
    const list = makeList(2);
    let prevented: boolean | null = null;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({}),
    });
    window.addEventListener(
      'pointerdown',
      (event) => {
        prevented = event.defaultPrevented;
      },
      { once: true },
    );

    const { x, y } = centerOf('#r0');

    await commands.pointerMove(x, y);
    await commands.pointerDown();
    await commands.pointerUp();
    expect(prevented).toBe(false);
    expect(engine).toMatch(/chromium|firefox|webkit/u);
  });
});
