/** `drag:DRI-18`: custom behaviors, written only on the public API. */
import { describe, expect, it } from 'vitest';
import { createLifter, type Lift } from '../src/lift.ts';
import { canvasGroup, type CanvasGroup } from './fixtures/canvas-group.ts';
import { dropZone } from './fixtures/drop-zone.ts';
import { resizeHandle } from './fixtures/resize-handle.ts';
import {
  centerOf,
  commands,
  faultMessages,
  frames,
  grab,
  log,
  makeList,
  managed,
  moveHeld,
  onCleanup,
  press,
  release,
  targetOf,
  wait,
} from './support/harness.ts';

const nodeAt = (id: string) => {
  const node = document.querySelector<HTMLElement>(`#${id}`)!;

  return {
    left: node.offsetLeft,
    top: node.offsetTop,
    translate: node.style.translate,
  };
};

function mountCanvas(canvasCss: string, fails = false): CanvasGroup {
  const canvas = document.createElement('div');

  canvas.style.cssText = `position:absolute;left:100px;top:100px;width:500px;height:300px;transform-origin:0 0;touch-action:none;user-select:none;${canvasCss}`;
  canvas.innerHTML = `
    <div class="node" id="a" style="position:absolute;left:20px;top:20px;width:60px;height:60px;background:#ccd"></div>
    <div class="node" id="b" style="position:absolute;left:200px;top:20px;width:60px;height:60px;background:#dcc"></div>
    <div class="node" id="c" style="position:absolute;left:300px;top:200px;width:60px;height:60px;background:#cdc"></div>`;
  document.body.append(canvas);

  const group = canvasGroup(
    canvas,
    () => {
      log.push('save');
      return fails
        ? Promise.reject(new Error('save failed'))
        : Promise.resolve();
    },
    () => {},
  );

  onCleanup(() => group.panel.requestDestroy());
  return group;
}

describe('drag:DRI-18 resize handle', () => {
  it('should resize with no lift, and Escape should restore', async () => {
    const box = document.createElement('div');

    box.id = 'box';
    box.style.cssText =
      'position:relative;width:200px;height:100px;background:#ccd';
    box.innerHTML =
      '<div id="grip" style="position:absolute;right:0;bottom:0;width:20px;height:20px;background:#88a;touch-action:none"></div>';
    document.body.append(box);

    const panel = resizeHandle(
      box.firstElementChild as HTMLElement,
      box,
      (size) => {
        log.push(typeof size === 'string' ? size : 'resized');
      },
    );

    onCleanup(() => panel.requestDestroy());
    await grab('#grip', 50, 30);
    await commands.pointerMove(600, 400);
    await frames();
    expect(box.offsetWidth).toBeGreaterThan(250);
    expect(document.querySelector('#grip')!.hasAttribute('popover')).toBe(
      false,
    );
    await commands.keyPress('Escape');
    expect(box.offsetWidth).toBe(200);
    await release();
    expect(log).toEqual(['restored']);
  });

  it('should resize in viewport distance inside a scaled parent', async () => {
    const parent = document.createElement('div');

    parent.style.cssText =
      'transform:scale(.5);transform-origin:0 0;width:600px';
    parent.innerHTML =
      '<div id="box" style="position:relative;width:200px;height:100px"><div id="grip" style="position:absolute;right:0;bottom:0;width:20px;height:20px;touch-action:none"></div></div>';
    document.body.append(parent);

    const box = parent.querySelector<HTMLElement>('#box')!;
    const panel = resizeHandle(box.querySelector('#grip')!, box, () => {});

    onCleanup(() => panel.requestDestroy());

    const before = box.getBoundingClientRect().width;

    await grab('#grip', 30, 0);
    expect(box.getBoundingClientRect().width - before).toBeCloseTo(30, 0);
    await release();
  });
});

describe('drag:DRI-18 drop zone', () => {
  it.each([true, false])(
    'should land an async verdict of %s where it says',
    async (accepts) => {
      const board = document.createElement('div');

      board.style.cssText = 'display:flex;gap:40px';
      board.innerHTML = `
      <div class="zone" id="z1" style="width:150px;height:200px;background:#eee"><div class="card" id="card" style="height:40px;background:#ccd;touch-action:none;user-select:none"></div></div>
      <div class="zone" id="z2" style="width:150px;height:200px;background:#eee"></div>`;
      document.body.append(board);

      const panel = dropZone(board, async (_, zone) => {
        log.push(`save:${zone.id}`);
        await wait(20);
        return accepts;
      });

      onCleanup(() => panel.requestDestroy());

      const home = centerOf('#card');
      const zone = centerOf('#z2');

      await grab('#card', zone.x - home.x, zone.y - home.y);
      await release();
      await wait(300);
      expect(log).toEqual(['save:z2']);
      expect(document.querySelector('#card')!.parentElement!.id).toBe(
        accepts ? 'z2' : 'z1',
      );
      expect(document.querySelector('#z2')!.className).toBe('zone');
    },
  );
});

describe('drag:DRI-18 canvas group', () => {
  it('should move in canvas units under scale, and save', async () => {
    mountCanvas('transform:scale(.5)');
    await grab('#a', 40, 40);
    await release();
    expect(log).toEqual(['save']);
    expect(Math.abs(nodeAt('a').left - 100)).toBeLessThan(7);
    expect(Math.abs(nodeAt('a').top - 100)).toBeLessThan(7);
    expect(nodeAt('a').translate).toBe('');
  });

  it('should follow the pointer under rotation, through box-quad', async () => {
    mountCanvas('rotate:30deg');

    const before = centerOf('#c');

    await grab('#c', 60, 20);
    await frames();

    const after = centerOf('#c');

    expect(
      Math.hypot(after.x - before.x - 60, after.y - before.y - 20),
    ).toBeLessThan(1);
    await release();
  });

  it('should roll back on Escape', async () => {
    mountCanvas('transform:scale(.5)');
    await grab('#a', 40, 40);
    await commands.keyPress('Escape');
    await frames();
    expect(nodeAt('a')).toEqual({ left: 20, top: 20, translate: '' });
    await release();
  });

  it('should roll back on destruction, with no end and no flag', async () => {
    const group = mountCanvas('transform:scale(.5)');

    await grab('#a', 40, 40);
    await group.panel.requestDestroy();
    expect(nodeAt('a')).toEqual({ left: 20, top: 20, translate: '' });
    await release();
    expect(log).toEqual([]);
  });

  it('should roll back and report a failed save', async () => {
    mountCanvas('transform:scale(.5)', true);
    await grab('#a', 40, 40);
    await release();
    expect(nodeAt('a')).toEqual({ left: 20, top: 20, translate: '' });
    expect(faultMessages()).toEqual(['save failed']);
  });

  it('should render a nudge from foreign code through requestStep', async () => {
    const group = mountCanvas('transform:scale(.5)');
    const start = await press('#a');

    await moveHeld(start.x + 20, start.y + 60);
    await moveHeld(start.x + 21, start.y + 61);
    group.nudge(10);
    expect(document.querySelector<HTMLElement>('#a')!.style.translate).not.toBe(
      '',
    );
    await commands.keyPress('Escape');
  });
});

describe('drag:DRD-27 the lift in the behavior state', () => {
  /** A behavior that composes the lift, and the keys its hooks see at `start`. */
  async function liftedKeys(): Promise<{ drag: string[]; lift: string[] }> {
    const list = makeList(2);
    const lifter = createLifter(window);
    const keys = { drag: [] as string[], lift: [] as string[] };

    managed<{ lift: Lift | null }>(list, {
      admit: (event) => ({ item: targetOf(event), state: { lift: null } }),
      activate(drag) {
        drag.state.lift = lifter.acquire(drag);
        return undefined;
      },
      start(drag) {
        keys.drag = Object.keys(drag).toSorted();
        keys.lift = Object.keys(drag.state.lift!).toSorted();
      },
    }).use(lifter.cancelLanding);
    await grab('#r0');
    await release();
    return keys;
  }

  it('should give a lifted behavior a drag with only the kernel keys', async () => {
    expect((await liftedKeys()).drag).toEqual([
      'item',
      'originX',
      'originY',
      'pointerId',
      'requestCancel',
      'requestStep',
      'signal',
      'state',
      'use',
      'x',
      'y',
    ]);
  });

  it('should give the lift exactly its eleven keys', async () => {
    expect((await liftedKeys()).lift).toEqual([
      'box',
      'boxHeight',
      'boxWidth',
      'itemSpace',
      'land',
      'rect',
      'translate',
      'translatedX',
      'translatedY',
      'visual',
      'visualSpace',
    ]);
  });
});
