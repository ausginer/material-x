/** `drag:DRI-16`: one coordinate model. */
import { ancestry, box, coordinates, delta, localDelta, space } from '@ydinjs/box-quad';
import { describe, expect, it } from 'vitest';
import { lift } from '../src/lift.ts';
import { basicSortable, centerOf, commands, grab, isClean, isChromium, makeList, managed, moveHeld, order, release, frames } from './support/harness.ts';
import { resizeHandle } from './fixtures/resize-handle.ts';
import { y } from '../src/sortable/y.ts';

const ENVIRONMENTS: ReadonlyArray<readonly [string, string]> = [
  ['rotate', 'rotate:30deg'],
  ['scale', 'transform:scale(.5)'],
  ['skew', 'transform:skewX(20deg)'],
  ['zoom', 'zoom:1.5'],
  ['rotate, scale and zoom', 'zoom:1.25;rotate:-15deg;transform:scale(1.5)'],
];

function host(css: string): HTMLElement {
  const parent = document.createElement('div');

  parent.style.cssText = `position:absolute;left:300px;top:200px;width:200px;height:200px;transform-origin:0 0;${css}`;
  document.body.append(parent);
  return parent;
}

function makeNode(parent: HTMLElement, css = ''): HTMLElement {
  const node = document.createElement('div');

  node.id = 'node';
  node.style.cssText = `position:absolute;left:10px;top:10px;width:50px;height:30px;background:#ccd;touch-action:none;user-select:none;${css}`;
  parent.append(node);
  return node;
}

/** A behavior with no lift that moves an element by `left`/`top`, from its `Space`. */
function mountMove(node: HTMLElement, ownZoom = 1) {
  const basis = space();
  const local = delta();
  const left = node.offsetLeft;
  const top = node.offsetTop;

  return managed(node, {
    threshold: 1,
    admit: () => ({ item: node }),
    activate() {
      if (!ancestry(node, basis)) {
        throw new Error('no basis');
      }
    },
    move({ x, y: pointerY, originX, originY }) {
      if (localDelta(basis, x - originX, pointerY - originY, local)) {
        node.style.left = `${left + local[0]! / ownZoom}px`;
        node.style.top = `${top + local[1]! / ownZoom}px`;
      }
    },
  });
}

const distance = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(ax - bx, ay - by);

describe('drag:DRI-16 no-lift move and resize', () => {
  it.each(ENVIRONMENTS)('should follow the pointer under %s', async (_name, css) => {
    const node = makeNode(host(css));

    mountMove(node);

    const start = centerOf(node);

    await grab(node, 40, 25);
    await frames();

    const after = centerOf(node);

    expect(distance(after.x - start.x, after.y - start.y, 40, 25)).toBeLessThan(1);
    await commands.keyPress('Escape');
  });

  it('should follow the pointer with own rotate', async () => {
    const node = makeNode(host('transform:scale(.5)'), 'rotate:25deg');

    mountMove(node);

    const start = centerOf(node);

    await grab(node, 30, 20);
    await frames();

    const after = centerOf(node);

    expect(distance(after.x - start.x, after.y - start.y, 30, 20)).toBeLessThan(1);
    await commands.keyPress('Escape');
  });

  it('should need a division by the element own zoom, which a behavior states', async () => {
    const node = makeNode(host(''), 'zoom:2');

    mountMove(node, 2);

    const start = centerOf(node);

    await grab(node, 30, 20);
    await frames();

    const after = centerOf(node);

    expect(distance(after.x - start.x, after.y - start.y, 30, 20)).toBeLessThan(1.5);
    await commands.keyPress('Escape');
  });

  it.each(ENVIRONMENTS)('should resize along the pointer under %s, through the element Box', async (_name, css) => {
    const target = makeNode(host(css), 'width:120px;height:100px');
    const handle = document.createElement('div');

    handle.id = 'grip';
    handle.style.cssText = 'position:absolute;right:0;bottom:0;width:20px;height:20px;background:#88a;touch-action:none';
    target.append(handle);

    const controller = resizeHandle(handle, target, () => {});
    const measured = box();

    coordinates(target, measured);

    const local = delta();

    localDelta(measured, 15, 10, local);

    const expectedWidth = 120 + local[0]!;
    const expectedHeight = 100 + local[1]!;

    await grab(handle, 15, 10);
    expect(target.offsetWidth).toBeGreaterThan(0);
    expect(Math.abs(parseFloat(target.style.width) - Math.max(80, expectedWidth))).toBeLessThan(1);
    expect(Math.abs(parseFloat(target.style.height) - Math.max(60, expectedHeight))).toBeLessThan(1);
    await commands.pointerUp();
    await controller.requestDestroy();
  });
});

describe('drag:DRI-16 lifted', () => {
  it.each<readonly [string, string]>([
    ...ENVIRONMENTS,
    ['own rotate on the item', ''],
  ])('should follow the pointer exactly under %s', async (name, css) => {
    const parent = host(css);
    const node = makeNode(parent, name.startsWith('own') ? 'rotate:15deg' : '');

    managed(node, {
      lift,
      threshold: 1,
      admit: () => ({ item: node }),
      move(drag) {
        drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      },
    });

    const start = centerOf(node);

    await grab(node, 60, 40);

    const after = centerOf(node);

    expect(distance(after.x - start.x, after.y - start.y, 60, 40)).toBeLessThan(1);
    await commands.keyPress('Escape');
  });

  it('should follow the pointer for an item with its own zoom', async () => {
    const parent = host('transform:scale(.5)');
    const node = makeNode(parent, 'zoom:2');

    managed(node, {
      lift,
      threshold: 1,
      admit: () => ({ item: node }),
      move(drag) {
        drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      },
    });

    const start = centerOf(node);

    await grab(node, 60, 40);

    const after = centerOf(node);

    expect(distance(after.x - start.x, after.y - start.y, 60, 40)).toBeLessThan(1.5);
    await commands.keyPress('Escape');
  });

  it('should keep the rendered size across the lift under scale and zoom', async () => {
    const parent = host('zoom:1.5;transform:scale(.5)');
    const node = makeNode(parent);

    managed(node, {
      lift,
      threshold: 1,
      admit: () => ({ item: node }),
    });

    const before = node.getBoundingClientRect();

    await grab(node, 0, 10);

    const after = node.getBoundingClientRect();

    expect(after.width).toBeCloseTo(before.width, 0);
    expect(after.height).toBeCloseTo(before.height, 0);
    await commands.keyPress('Escape');
  });
});

describe('drag:DRI-16 required environments for a sortable', () => {
  it.each([
    ['ancestor scale(.5)', 'transform:scale(.5);transform-origin:0 0'],
    ['ancestor zoom:2', 'zoom:2'],
  ] as const)('should reorder under %s, following the pointer', async (_name, css) => {
    const parent = document.createElement('div');

    parent.style.cssText = css;
    document.body.append(parent);

    const list = makeList(5, parent);

    basicSortable(list);

    const before = centerOf('#r0');

    await grab('#r0', 60, 40);

    const during = centerOf('#r0');

    expect(Math.abs(during.x - before.x - 60)).toBeLessThan(1);
    expect(Math.abs(during.y - before.y - 40)).toBeLessThan(1);
    await release();
    expect(isClean(list)).toBe(true);
  });

  it('should reorder a list in a shadow root', async () => {
    const parent = document.createElement('div');

    document.body.append(parent);

    const list = makeList(4, parent.attachShadow({ mode: 'open' }));

    basicSortable(list);

    const start = parent.getBoundingClientRect();

    await commands.pointerMove(start.left + 50, start.top + 20);
    await commands.pointerDown();
    await moveHeld(start.left + 50, start.top + 60);
    await moveHeld(start.left + 50, start.top + 110);
    await release();
    expect(order(list)).toBe('r1,r2,r0,r3');
  });

  it('should reorder a list in a same-origin iframe the parent controls', async () => {
    const frame = document.createElement('iframe');

    frame.style.cssText = 'width:300px;height:300px;border:0;position:absolute;left:0;top:0';
    document.body.append(frame);

    const inner = frame.contentDocument!;

    inner.body.style.margin = '0';

    const list = makeList(4, inner.body);

    basicSortable(list, { axis: y() });

    await commands.pointerMove(50, 20);
    await commands.pointerDown();
    await moveHeld(50, 60);
    await moveHeld(50, 110);
    await release();
    expect(order(list)).toBe('r1,r2,r0,r3');
  });

  it('should stay visible when dragged out of an overflow:hidden list', async () => {
    const list = makeList(6, document.body, 'height:100px;overflow:hidden');

    basicSortable(list);

    const at = await grab('#r0', 300, 160);

    expect(document.elementFromPoint(at.x, at.y)?.id).toBe('r0');
    await commands.keyPress('Escape');
  });

  it('should stay above a later positioned panel', async () => {
    const list = makeList(4);
    const panel = document.createElement('div');

    panel.id = 'panel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:999;pointer-events:none';
    document.body.append(panel);
    basicSortable(list);

    const at = await grab('#r0', 40, 60);

    panel.style.pointerEvents = 'auto';

    const top = document.elementFromPoint(at.x, at.y)?.id;

    panel.style.pointerEvents = 'none';
    expect(top).toBe('r0');
    await commands.keyPress('Escape');
  });

  it.runIf(isChromium)('should read a Space for an ancestor it can represent', () => {
    expect(ancestry(makeList(1), space())).toBe(true);
  });
});
