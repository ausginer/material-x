/**
 * `drag:DRI-9` and `drag:DRI-20`: the lift owns what it writes until release, a
 * lifted position is committed in `onEnd`, and free drag measures its offset from
 * home at the drop.
 */
import { describe, expect, it } from 'vitest';
import { bounds } from '../src/free-drag/bounds.ts';
import { landing } from '../src/free-drag/landing.ts';
import {
  freeDrag,
  type FreeDragConfig,
  FreeDragResolution,
} from '../src/free-drag.ts';
import { lift } from '../src/lift.ts';
import { y } from '../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../src/sortable.ts';
import {
  commands,
  frames,
  grab,
  log,
  makeList,
  managed,
  onCleanup,
  order,
  release,
  targetOf,
  wait,
} from './support/harness.ts';

function makeBox(parent: HTMLElement = document.body): HTMLElement {
  const box = document.createElement('div');

  box.id = 'free';
  box.style.cssText =
    'position:absolute;left:40px;top:40px;width:50px;height:50px;background:#ccd;touch-action:none;user-select:none';
  parent.append(box);
  return box;
}

function mount(
  box: HTMLElement,
  config: Partial<FreeDragConfig>,
): ReturnType<typeof freeDrag> {
  const controller = freeDrag(box, {
    onDrop: () => FreeDragResolution.accept(),
    ...config,
  });

  onCleanup(() => controller.requestDestroy());
  return controller;
}

const topLeft = (element: Element): readonly [number, number] => {
  const { left, top } = element.getBoundingClientRect();

  return [Math.round(left), Math.round(top)];
};

describe('drag:DRI-9 commit ownership', () => {
  it('should keep a translate committed in onEnd', async () => {
    const box = makeBox();

    mount(box, {
      onEnd(result) {
        if (result.type === 'accepted') {
          const { localDeltaX, localDeltaY } = result.request;

          box.style.translate = `${localDeltaX}px ${localDeltaY}px`;
        }
      },
    });
    await grab(box, 60, 40);
    await release();
    expect(topLeft(box)).toEqual([100, 80]);
  });

  it('should keep left and top committed in onEnd', async () => {
    const box = makeBox();

    mount(box, {
      onEnd(result) {
        if (result.type === 'accepted') {
          box.style.left = `${40 + result.request.localDeltaX}px`;
          box.style.top = `${40 + result.request.localDeltaY}px`;
        }
      },
    });
    await grab(box, 60, 40);
    await release();
    expect(topLeft(box)).toEqual([100, 80]);
    expect(box.style.translate).toBe('');
  });

  it('should revert at release a write to a lifted property made during the lift', async () => {
    const list = makeList(3);
    const row = list.querySelector<HTMLElement>('#r0')!;

    row.style.marginLeft = '3px';
    managed(list, {
      lift,
      admit: (event) => ({ item: targetOf(event) }),
      move(drag) {
        drag.visual.style.marginLeft = '30px';
        drag.visual.style.translate = '5px 5px';
        drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      },
    });
    await grab('#r0');
    await release();
    expect(row.style.marginLeft).toBe('3px');
    expect(row.style.translate).toBe('');
  });
});

describe('drag:DRI-9 README examples', () => {
  it('should reorder with the quick start', async () => {
    const list = makeList(4);

    for (const row of list.children) {
      row.classList.add('row');
    }

    // The README's quick start, as written there.
    const controller = sortable(list, {
      items: () => [...list.querySelectorAll<HTMLElement>('.row')],
      axis: y(),
      onReorder({ item, next }) {
        list.insertBefore(item, next);
        return ReorderResolution.accept();
      },
    });

    await grab('#r0', 0, 90);
    await release();
    expect(order(list)).toBe('r1,r2,r0,r3');
    await controller.requestDestroy();
  });

  it('should keep the free-drag example where it was dropped, across two drags', async () => {
    const arena = document.createElement('div');

    arena.style.cssText =
      'position:absolute;left:0;top:0;width:600px;height:400px';
    document.body.append(arena);

    const box = makeBox(arena);
    // The README's free-drag example, as written there.
    let x = 0;
    let y_ = 0;
    const controller = freeDrag(box, {
      bounds: bounds(arena),
      onDrop: () => FreeDragResolution.accept(),
      onEnd(result) {
        if (result.type === 'accepted') {
          x += result.request.localDeltaX;
          y_ += result.request.localDeltaY;
          box.style.translate = `${x}px ${y_}px`;
        }
      },
    });

    onCleanup(() => controller.requestDestroy());
    await grab(box, 60, 40);
    await release();
    expect(topLeft(box)).toEqual([100, 80]);
    await grab(box, 20, 30);
    await release();
    expect(topLeft(box)).toEqual([120, 110]);
  });

  it('should keep the scrolling-container example where it was dropped, and land it home', async () => {
    const scroller = document.createElement('div');
    const spacer = document.createElement('div');

    scroller.style.cssText =
      'position:relative;overflow:auto;width:300px;height:200px;margin:0';
    spacer.style.cssText = 'height:2000px';
    scroller.append(spacer);
    document.body.append(scroller);

    const box = makeBox(scroller);
    // The README's example of `home` in a scrolling container.
    let x = 0;
    let y_ = 0;
    const reject = { next: false };
    const controller = freeDrag(box, {
      home() {
        const frame = scroller.getBoundingClientRect();

        return {
          x: frame.left + 40 - scroller.scrollLeft + x,
          y: frame.top + 40 - scroller.scrollTop + y_,
        };
      },
      landing: landing({ duration: 2000, easing: 'linear' }),
      onDrop: () =>
        reject.next ? FreeDragResolution.reject() : FreeDragResolution.accept(),
      onEnd(result) {
        log.push(`end:${result.type}`);

        if (result.type === 'accepted') {
          x += result.request.localDeltaX;
          y_ += result.request.localDeltaY;
          box.style.translate = `${x}px ${y_}px`;
        }
      },
    });

    onCleanup(() => controller.requestDestroy());

    await grab(box, 0, 40);
    scroller.scrollTop = 100;
    await frames();

    const dropped = topLeft(box);

    await release();
    expect(log).toEqual(['end:accepted']);
    expect(topLeft(box)).toEqual(dropped);

    // A rejected drop after a scroll lands home from the drop, with no jump.
    reject.next = true;
    await grab(box, 0, 40);
    scroller.scrollTop = 50;
    await frames();

    const droppedAgain = topLeft(box);

    await commands.pointerUp();
    expect(topLeft(box)).toEqual(droppedAgain);
    await wait(2100);
    await frames();
    expect(topLeft(box)).toEqual([
      Math.round(scroller.getBoundingClientRect().left + 40 + x),
      Math.round(scroller.getBoundingClientRect().top + 40 - 50 + y_),
    ]);
  });
});

describe('drag:DRI-20 free drag offset', () => {
  it('should commit where dropped without home in an unscrolled page', async () => {
    const box = makeBox();
    let committed: readonly [number, number] | null = null;

    mount(box, {
      onEnd(result) {
        if (result.type === 'accepted') {
          committed = [result.request.localDeltaX, result.request.localDeltaY];
          box.style.translate = `${committed[0]}px ${committed[1]}px`;
        }
      },
    });
    await grab(box, 33, 21);
    await release();
    expect(committed).toEqual([33, 21]);
    expect(topLeft(box)).toEqual([73, 61]);
  });
});
