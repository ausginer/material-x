/**
 * `drag:DRI-21`: `freeDrag` with `dropTargets`, and one config, with every
 * capability, shared by several controllers.
 */
import { describe, expect, it } from 'vitest';
import { bounds } from '../src/free-drag/bounds.ts';
import { dropTargets } from '../src/free-drag/drop-targets.ts';
import { landing } from '../src/free-drag/landing.ts';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
  type FreeDragResult,
} from '../src/free-drag.ts';
import {
  centerOf,
  commands,
  faults,
  frames,
  grab,
  moveHeld,
  onCleanup,
  release,
} from './support/harness.ts';

function makeBox(id: string, left: number): HTMLElement {
  const box = document.createElement('div');

  box.id = id;
  box.style.cssText = `position:absolute;left:${left}px;top:20px;width:40px;height:40px;background:#ccd;touch-action:none;user-select:none`;
  document.body.append(box);
  return box;
}

function makeZone(id: string, left: number): HTMLElement {
  const zone = document.createElement('div');

  zone.id = id;
  zone.className = 'zone';
  zone.style.cssText = `position:absolute;left:${left}px;top:200px;width:120px;height:120px;outline:1px solid`;
  document.body.append(zone);
  return zone;
}

const zones = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('.zone'),
];

describe('drag:DRI-21 freeDrag + dropTargets', () => {
  it('should mark the target under the pointer, name it at the drop and clear the mark at release', async () => {
    const box = makeBox('a', 20);
    const zone = makeZone('z1', 20);
    const results: FreeDragResult[] = [];
    const controller = freeDrag(box, {
      targets: dropTargets({ targets: zones }),
      onDrop: (request) =>
        request.target
          ? FreeDragResolution.accept()
          : FreeDragResolution.reject(),
      onEnd(result) {
        results.push(result);
      },
    });

    onCleanup(() => controller.requestDestroy());

    const start = await grab(box, 0, 30);

    expect(zone.hasAttribute('data-drop-over')).toBe(false);

    const over = centerOf(zone);

    await moveHeld(over.x, over.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(true);
    await moveHeld(start.x, start.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    await moveHeld(over.x, over.y);
    await release();
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    expect(results.map((result) => result.type)).toEqual(['accepted']);
    const [result] = results;

    expect(result!.type === 'accepted' && result!.request.target).toBe(zone);
    expect(faults).toEqual([]);
  });

  it('should resolve the target at the release, with no frame before it', async () => {
    const box = makeBox('a', 20);
    const zone = makeZone('z1', 20);
    const targets: unknown[] = [];
    const controller = freeDrag(box, {
      targets: dropTargets({ targets: zones }),
      onDrop(request) {
        targets.push(request.target);
        return FreeDragResolution.accept();
      },
    });

    onCleanup(() => controller.requestDestroy());

    const over = centerOf(zone);

    await grab(box, 0, 30);

    // No frame runs from here, so only the drop can resolve the target.
    const requestFrame = window.requestAnimationFrame.bind(window);

    window.requestAnimationFrame = () => 1;
    onCleanup(() => {
      window.requestAnimationFrame = requestFrame;
    });
    await commands.pointerMove(over.x, over.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    await commands.pointerUp();
    expect(targets).toEqual([zone]);
  });

  it('should clear the mark when the controller is destroyed mid-drag', async () => {
    const box = makeBox('a', 20);
    const zone = makeZone('z1', 20);
    const controller = freeDrag(box, {
      targets: dropTargets({ targets: zones }),
      onDrop: () => FreeDragResolution.accept(),
    });

    await grab(box, 0, 30);

    const over = centerOf(zone);

    await moveHeld(over.x, over.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(true);
    await controller.requestDestroy();
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    await commands.pointerUp();
  });

  it('should re-read the targets on invalidate', async () => {
    const box = makeBox('a', 20);
    const zone = makeZone('z1', 300);
    const controller = freeDrag(box, {
      targets: dropTargets({ targets: zones }),
      onDrop: () => FreeDragResolution.reject(),
    });

    onCleanup(() => controller.requestDestroy());

    const at = await grab(box, 0, 200);

    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    zone.style.left = '0px';
    controller.invalidate();
    await moveHeld(at.x + 1, at.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(true);
    await commands.keyPress('Escape');
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
  });

  it('should re-read the targets after a scroll', async () => {
    const box = makeBox('a', 20);
    const zone = makeZone('z1', 300);
    const spacer = document.createElement('div');

    spacer.style.cssText = 'position:absolute;top:0;width:1px;height:3000px';
    document.body.append(spacer);
    onCleanup(() => {
      window.scrollTo(0, 0);
    });

    const controller = freeDrag(box, {
      targets: dropTargets({ targets: zones }),
      onDrop: () => FreeDragResolution.reject(),
    });

    onCleanup(() => controller.requestDestroy());

    // The grab's frame measures the zone, and the scroll then moves it up.
    await grab(box, 0, 30);
    window.scrollTo(0, 150);
    await frames();

    const over = centerOf(zone);

    await moveHeld(over.x, over.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(true);
    await commands.keyPress('Escape');
  });

  it('drag:DRD-48 should name the target under the release position after a scroll whose event has not arrived', async () => {
    const box = makeBox('a', 20);
    const scroller = document.createElement('div');
    const content = document.createElement('div');

    scroller.style.cssText =
      'position:fixed;left:160px;top:0;width:200px;height:400px;overflow:auto';
    content.style.cssText = 'position:relative;height:1200px';

    for (const [id, top] of [
      ['z1', 100],
      ['z2', 260],
    ] as const) {
      const zone = document.createElement('div');

      zone.id = id;
      zone.className = 'zone';
      zone.style.cssText = `position:absolute;left:20px;top:${top}px;width:120px;height:120px;outline:1px solid`;
      content.append(zone);
    }

    scroller.append(content);
    document.body.append(scroller);

    const targets: unknown[] = [];
    const controller = freeDrag(box, {
      targets: dropTargets({ targets: zones }),
      onDrop(request) {
        targets.push(request.target);
        return FreeDragResolution.reject();
      },
    });

    onCleanup(() => controller.requestDestroy());
    // Capture phase on the window, added before the press: it runs before the
    // library sees the release, and the browser dispatches `scroll` only in its
    // next rendering update.
    addEventListener(
      'pointerup',
      () => {
        scroller.scrollTop += 160;
      },
      { capture: true, once: true },
    );
    onCleanup(() => {
      scroller.remove();
    });

    const z1 = document.querySelector('#z1')!;
    const over = centerOf(z1);

    await grab(box, 0, 30);
    await moveHeld(over.x, over.y);
    expect(z1.hasAttribute('data-drop-over')).toBe(true);
    await release();
    // The release is 160 px into the scroller, which after the scroll is 320 px
    // into the content: inside z2, which spans 260 to 380.
    expect(targets).toEqual([document.querySelector('#z2')]);
  });

  it('should release the operation and keep the controller when targets() throws', async () => {
    const box = makeBox('a', 20);
    const zone = makeZone('z1', 20);
    const style = box.style.cssText;
    const thrown = new Error('targets');
    let pulls = 0;
    const results: FreeDragResult[] = [];
    const controller = freeDrag(box, {
      targets: dropTargets({
        targets() {
          pulls += 1;

          if (pulls === 1) {
            throw thrown;
          }

          return zones();
        },
      }),
      onDrop: (request) =>
        request.target
          ? FreeDragResolution.accept()
          : FreeDragResolution.reject(),
      onEnd(result) {
        results.push(result);
      },
    });

    onCleanup(() => controller.requestDestroy());

    const over = centerOf(zone);

    // The first activation faults inside the pull: its release runs, so the lift
    // is released and nothing is marked or scheduled.
    await grab(box, 0, 30);
    await moveHeld(over.x, over.y);
    expect(faults.map((fault) => fault.cause)).toEqual([thrown]);
    expect(box.style.cssText).toBe(style);
    expect(box.matches(':popover-open')).toBe(false);
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    await release();
    expect(results).toEqual([]);

    // The controller holds nothing of that operation, so the next one works.
    await grab(box, 0, 30);
    await moveHeld(over.x, over.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(true);
    await release();
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    expect(
      results.map(
        (result) => result.type === 'accepted' && result.request.target,
      ),
    ).toEqual([zone]);
    expect(pulls).toBe(2);
    expect(faults).toHaveLength(1);
  });

  it('should name no target without the capability', async () => {
    const box = makeBox('a', 20);
    const zone = makeZone('z1', 20);
    const targets: unknown[] = [];
    const controller = freeDrag(box, {
      onDrop(request) {
        targets.push(request.target);
        return FreeDragResolution.accept();
      },
    });

    onCleanup(() => controller.requestDestroy());

    const over = centerOf(zone);

    await grab(box, 0, 30);
    await moveHeld(over.x, over.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    await release();
    expect(targets).toEqual([null]);
  });
});

describe('drag:DRD-33 C2 one config across controllers', () => {
  it('should give each controller its own runtime', async () => {
    const arena = document.createElement('div');

    arena.style.cssText =
      'position:absolute;left:0;top:0;width:400px;height:400px';
    document.body.append(arena);

    const a = makeBox('a', 20);
    const b = makeBox('b', 220);
    const zone = makeZone('z1', 20);
    const ends: string[] = [];
    // One object, passed as it is to both controllers.
    const config: FreeDragConfig = {
      bounds: bounds(arena),
      landing: landing({ duration: 100 }),
      targets: dropTargets({ targets: zones }),
      onDrop: (request) =>
        request.target
          ? FreeDragResolution.accept()
          : FreeDragResolution.reject(),
      onEnd(result) {
        ends.push(
          `${result.type === 'canceled' ? '' : result.request.item.id}:${result.type}`,
        );
      },
    };
    const first = freeDrag(a, config);
    const second = freeDrag(b, config);

    onCleanup(() => second.requestDestroy());

    // The first controller's operation marks the zone; the second's runtime is untouched.
    const over = centerOf(zone);

    await grab(a, 0, 30);
    await moveHeld(over.x, over.y);
    expect(zone.hasAttribute('data-drop-over')).toBe(true);
    await release();
    expect(zone.hasAttribute('data-drop-over')).toBe(false);

    // Destroying the first leaves the second's bounds, targets and landing working.
    await first.requestDestroy();

    const before = centerOf(b);

    // Within the viewport: an 800 px move left Firefox's, and the pointer went elsewhere.
    await grab(b, 300, 0);
    expect(b.getBoundingClientRect().right).toBeCloseTo(400, 0);
    expect(zone.hasAttribute('data-drop-over')).toBe(false);
    // No frame wait here, or the landing could finish before it is seen.
    await commands.pointerUp();
    expect(b.getAnimations().length).toBeGreaterThan(0);
    await Promise.all(b.getAnimations().map((each) => each.finished));
    expect(centerOf(b).x).toBeCloseTo(before.x, 0);
    expect(ends).toEqual(['a:accepted', 'b:rejected']);
    expect(faults).toEqual([]);
  });
});
