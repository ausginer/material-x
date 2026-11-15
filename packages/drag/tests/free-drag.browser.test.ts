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
  dragAndDrop,
  faultMessages,
  faults,
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

  it('drag:DRD-48 should clamp the drop against the bounds after a scroll whose event has not arrived', async () => {
    const container = document.createElement('div');
    const content = document.createElement('div');
    const arena = document.createElement('div');

    container.style.cssText =
      'position:fixed;left:0;top:0;width:400px;height:400px;overflow:auto';
    content.style.cssText = 'position:relative;height:1200px';
    arena.style.cssText =
      'position:absolute;left:0;top:50px;width:300px;height:200px';
    content.append(arena);
    container.append(content);
    document.body.append(container);

    const box = makeBox(arena);
    const requests: FreeDragRequest[] = [];

    mount(box, {
      bounds: bounds(arena),
      onDrop(request) {
        requests.push(request);
        return FreeDragResolution.reject();
      },
    });
    // Capture phase on the window, added before the press: it runs before the
    // library sees the release, and the browser dispatches `scroll` only in its
    // next rendering update.
    addEventListener(
      'pointerup',
      () => {
        container.scrollTop += 40;
      },
      { capture: true, once: true },
    );
    onCleanup(() => {
      container.remove();
    });

    const originTop = box.getBoundingClientRect().top;

    // Past the arena's bottom edge: the visual is held clamped at 250 and a frame
    // has passed.
    await grab(box, 0, 200);
    expect(box.getBoundingClientRect().bottom).toBeCloseTo(250, 0);
    await release();

    // The scroll moved the arena's bottom edge up by 40 px.
    const arenaBottom = arena.getBoundingClientRect().bottom;

    expect({ arenaBottom, localDeltaY: requests[0]!.localDeltaY }).toEqual({
      arenaBottom: 210,
      localDeltaY: arenaBottom - 50 - originTop,
    });
  });

  it('should clamp against bounds measured again after a scroll between operations (drag:DRF-5)', async () => {
    // The container scrolls, not the document: in Firefox the test frame's
    // document does not scroll.
    const container = document.createElement('div');
    const content = document.createElement('div');
    const arena = document.createElement('div');

    container.style.cssText =
      'position:fixed;left:0;top:0;width:400px;height:400px;overflow:auto';
    content.style.cssText = 'position:relative;height:1200px';
    arena.style.cssText =
      'position:absolute;left:0;top:200px;width:300px;height:300px';
    content.append(arena);
    container.append(content);
    document.body.append(container);

    const box = makeBox(arena);

    mount(box, { bounds: bounds(arena) });

    const arenaBefore = arena.getBoundingClientRect().top;

    await dragAndDrop(box, 40);
    container.scrollTop = 150;
    await frames();

    const arenaAfter = arena.getBoundingClientRect().top;

    // Past the arena's top edge, which is now above the box.
    await grab(box, 0, -80);

    const boxTop = box.getBoundingClientRect().top;

    await release();
    expect({ arenaBefore, arenaAfter, boxTop }).toEqual({
      arenaBefore: 200,
      arenaAfter: 50,
      boxTop: 50,
    });
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

describe('drag:DRD-63 a fresh bounds constraint', () => {
  // The visual's rect: 10 px square at (10, 10).
  const origin = new DOMRectReadOnly(10, 10, 10, 10);

  it('should clamp to an element source at its first apply, before any invalidate', () => {
    const arena = document.createElement('div');

    arena.style.cssText = 'position:fixed;left:0;top:0;width:50px;height:50px';
    document.body.append(arena);
    onCleanup(() => arena.remove());

    const motion = { x: 200, y: 200 };

    bounds(arena)(window).apply(motion, origin);
    // The arena's right and bottom, 50, less the visual's, 20.
    expect(motion).toEqual({ x: 30, y: 30 });
  });

  it('should clamp to the viewport at its first apply, before any invalidate', () => {
    const motion = { x: 100_000, y: 100_000 };

    bounds()(window).apply(motion, origin);
    expect(motion).toEqual({
      x: window.innerWidth - 20,
      y: window.innerHeight - 20,
    });
  });
});

describe('FreeDragController.moveTo', () => {
  it('should keep following the pointer from the point it placed the visual at', async () => {
    const box = makeBox();
    const controller = mount(box);
    const at = await grab(box, 60, 40);

    controller.moveTo({ x: 200, y: 150 });
    await moveHeld(at.x + 10, at.y + 20);

    const { left, top } = box.getBoundingClientRect();

    expect([left, top]).toEqual([210, 170]);
    await commands.keyPress('Escape');
  });
});

describe('bounds with a function source', () => {
  it('should clamp to the rect the function returns', async () => {
    const box = makeBox();

    mount(box, { bounds: bounds(() => new DOMRectReadOnly(0, 0, 300, 200)) });
    await grab(box, 800, 600);

    const { right, bottom } = box.getBoundingClientRect();

    expect([right, bottom]).toEqual([300, 200]);
    await commands.keyPress('Escape');
  });

  it('should leave the drag unconstrained when the function returns null', async () => {
    const box = makeBox();

    mount(box, { bounds: bounds(() => null) });
    await grab(box, 300, 200);

    const { left, top } = box.getBoundingClientRect();

    expect([left, top]).toEqual([340, 240]);
    await commands.keyPress('Escape');
  });

  it('should report a throw at activation as one fault carrying the thrown value', async () => {
    const box = makeBox();
    const thrown = new Error('bounds');

    mount(box, {
      bounds: bounds(() => {
        throw thrown;
      }),
    });
    await grab(box, 60, 40);
    await moveHeld(200, 200);
    await release();
    expect(faults.map((fault) => fault.cause)).toEqual([thrown]);
  });

  it('should report a throw during the drag as one fault carrying the thrown value', async () => {
    const box = makeBox();
    const thrown = new Error('bounds');
    let armed = false;
    const controller = mount(box, {
      bounds: bounds(() => {
        if (armed) {
          throw thrown;
        }

        return null;
      }),
    });
    const at = await grab(box, 60, 40);

    armed = true;
    controller.invalidate();
    await moveHeld(at.x + 10, at.y);
    await moveHeld(at.x + 20, at.y);
    await release();
    expect(faults.map((fault) => fault.cause)).toEqual([thrown]);
  });
});
