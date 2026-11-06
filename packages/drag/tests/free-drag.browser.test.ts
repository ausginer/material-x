/** `freeDrag` on the public `draggable`. */
import { describe, expect, it } from 'vitest';
import { bounds } from '../src/free-drag/bounds.ts';
import { landing } from '../src/free-drag/landing.ts';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
  type FreeDragRequest,
} from '../src/free-drag.ts';
import {
  centerOf,
  commands,
  faultMessages,
  frames,
  grab,
  log,
  moveHeld,
  onCleanup,
  release,
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
  config: Partial<FreeDragConfig> = {},
): ReturnType<typeof freeDrag> {
  const controller = freeDrag(box, {
    onDrop: () => FreeDragResolution.accept(),
    onEnd(result) {
      log.push(`end:${result.type}`);
    },
    ...config,
  });

  onCleanup(() => controller.requestDestroy());
  return controller;
}

describe('freeDrag', () => {
  it('should follow the pointer and ask at the drop', async () => {
    const box = makeBox();
    const requests: FreeDragRequest[] = [];

    mount(box, {
      onDrop(request) {
        requests.push(request);
        return FreeDragResolution.accept();
      },
    });
    await grab(box, 60, 40);
    expect(centerOf(box).x).toBeCloseTo(65 + 60, 0);
    expect(centerOf(box).y).toBeCloseTo(65 + 40, 0);
    await release();
    expect(requests[0]!.viewportDeltaX).toBe(60);
    expect(requests[0]!.positionX).toBeCloseTo(100, 0);
    expect(requests[0]!.item).toBe(box);
    expect(log).toEqual(['end:accepted']);
  });

  it('should project onto one axis', async () => {
    const box = makeBox();

    mount(box, { axis: 'x' });
    await grab(box, 60, 40);
    expect(centerOf(box).x).toBeCloseTo(125, 0);
    expect(centerOf(box).y).toBeCloseTo(65, 0);
    await commands.keyPress('Escape');
  });

  it('should clamp to bounds and place by moveTo', async () => {
    const arena = document.createElement('div');

    arena.style.cssText = 'position:relative;width:300px;height:200px';
    document.body.append(arena);

    const box = makeBox(arena);
    const controller = mount(box, {
      bounds: bounds(arena),
      onDrop: () => FreeDragResolution.reject('no'),
    });

    await grab(box, 800, 600);
    expect(box.getBoundingClientRect().right).toBeCloseTo(300, 0);
    expect(box.getBoundingClientRect().bottom).toBeCloseTo(200, 0);
    controller.moveTo({ x: 90, y: 100 });
    expect(box.getBoundingClientRect().left).toBeCloseTo(90, 0);
    expect(box.getBoundingClientRect().top).toBeCloseTo(100, 0);
    await release();
    expect(log).toEqual(['end:rejected']);
  });

  it('should re-read bounds on invalidate', async () => {
    const arena = document.createElement('div');

    arena.style.cssText = 'position:relative;width:300px;height:200px';
    document.body.append(arena);

    const box = makeBox(arena);
    const controller = mount(box, { bounds: bounds(arena) });
    const at = await grab(box, 800, 0);

    arena.style.width = '200px';
    controller.invalidate();
    await moveHeld(at.x + 1, at.y);
    expect(box.getBoundingClientRect().right).toBeCloseTo(200, 0);
    await commands.keyPress('Escape');
  });

  it('should land home on a rejection, only with a landing', async () => {
    const box = makeBox();

    mount(box, {
      landing: landing({ duration: 100 }),
      onDrop: () => FreeDragResolution.reject('no'),
    });
    await grab(box, 60, 40);
    await commands.pointerUp();
    expect(box.getAnimations().length).toBeGreaterThan(0);
    await Promise.all(box.getAnimations().map((each) => each.finished));
    expect(centerOf(box).x).toBeCloseTo(65, 0);
  });

  it('should land at a custom home', async () => {
    const box = makeBox();
    let target = 0;

    mount(box, {
      home: () => ({ x: 200, y: 200 }),
      landing: landing({
        duration: 100,
      }),
      onDrop: () => FreeDragResolution.reject('no'),
      onEnd() {
        target = box.getAnimations().length;
      },
    });
    await grab(box, 60, 40);
    await release();
    expect(target).toBeGreaterThan(0);
  });

  it('should honor handle and visual', async () => {
    const box = makeBox();

    box.innerHTML =
      '<div id="handle" style="height:20px"></div><div id="inner" style="height:30px"></div>';

    const inner = box.querySelector<HTMLElement>('#inner')!;

    mount(box, {
      handle: (root) => root.querySelector('#handle'),
      visual: () => inner,
    });
    await grab('#inner', 0, 30);
    expect(inner.matches(':popover-open')).toBe(false);
    await release();
    await grab('#handle', 0, 30);
    expect(faultMessages()).toEqual([]);
    expect(inner.matches(':popover-open')).toBe(true);
    await commands.keyPress('Escape');
    await frames();
  });

  it('should report geometry to onStart and onMove with the local delta', async () => {
    const scaled = document.createElement('div');

    scaled.style.cssText =
      'position:absolute;left:0;top:0;transform:scale(0.5);transform-origin:0 0';
    document.body.append(scaled);

    const box = makeBox(scaled);
    const deltas: number[] = [];

    mount(box, {
      onMove(geometry) {
        deltas.push(geometry.localDeltaX / geometry.viewportDeltaX);
      },
    });
    await grab(box, 40, 0);
    expect(deltas.at(-1)).toBeCloseTo(2, 5);
    await commands.keyPress('Escape');
  });
});
