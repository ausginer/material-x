/**
 * `drag:DRD-20` and `drag:DRD-34`: a step runs with no receiver, and destruction
 * leaves nothing that references a built-in's behavior instance.
 */
import { describe, expect, it } from 'vitest';
import { draggable } from '../src/draggable.ts';
import { bounds } from '../src/free-drag/bounds.ts';
import { freeDrag, FreeDragResolution } from '../src/free-drag.ts';
import {
  commands,
  dragAndDrop,
  faultMessages,
  grab,
  isChromium,
  makeList,
  moveHeld,
  onCleanup,
  release,
  targetOf,
  wait,
} from './support/harness.ts';

describe('drag:DRD-34 receivers', () => {
  it('should call a step with no receiver, requested while idle and during a pass', async () => {
    const list = makeList(2);
    const receivers: unknown[] = [];

    function recordReceiver(this: unknown): void {
      receivers.push(this);
    }

    const controller = draggable(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.requestStep(recordReceiver);
        return {};
      },
    });

    onCleanup(() => controller.requestDestroy());
    controller.requestStep(recordReceiver);
    await grab('#r0');
    await release();
    expect(receivers).toEqual([undefined, undefined]);
  });

  it('should re-read freeDrag bounds on invalidate called during a pass', async () => {
    const arena = document.createElement('div');

    arena.style.cssText = 'position:relative;width:300px;height:200px';
    document.body.append(arena);

    const box = document.createElement('div');

    box.style.cssText =
      'position:absolute;left:40px;top:40px;width:50px;height:50px;touch-action:none;user-select:none';
    arena.append(box);

    let shrink = false;
    const controller = freeDrag(box, {
      bounds: bounds(arena),
      onDrop: () => FreeDragResolution.accept(),
      onMove() {
        if (shrink) {
          shrink = false;
          controller.invalidate();
        }
      },
    });

    onCleanup(() => controller.requestDestroy());

    const at = await grab(box, 800, 0);

    arena.style.width = '200px';
    shrink = true;
    await moveHeld(at.x + 1, at.y);
    await moveHeld(at.x + 2, at.y);
    expect(box.getBoundingClientRect().right).toBeCloseTo(200, 0);
    expect(faultMessages()).toEqual([]);
  });
});

describe('drag:DRD-20 behavior instances', () => {
  it.runIf(isChromium)(
    'should retain no freeDrag behavior instance after destruction',
    async () => {
      const before = await commands.countHeapObjects('FreeDragBehavior');
      const box = makeList(1).firstElementChild as HTMLElement;
      // Only this function's frame holds the controller, so the controller is
      // unreachable once the function returns.
      const dragThenDestroy = async (): Promise<void> => {
        const controller = freeDrag(box, {
          onDrop: () => FreeDragResolution.accept(),
        });

        await dragAndDrop(box, 30);
        // The instrument sees the instance while the controller is alive.
        expect(await commands.countHeapObjects('FreeDragBehavior')).toBe(
          before + 1,
        );
        await controller.requestDestroy();
      };

      await dragThenDestroy();
      box.remove();
      await wait(50);
      expect(await commands.countHeapObjects('FreeDragBehavior')).toBe(before);
    },
  );
});
