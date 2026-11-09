/**
 * `drag:DRD-20` and `drag:DRD-34`: `draggable`'s controller methods are called
 * on the controller, while the `sortable` and `freeDrag` controllers' members
 * and `cancelLanding` work when detached. A step runs with no receiver, and
 * destruction leaves nothing that references a built-in's behavior instance.
 */
import { describe, expect, it } from 'vitest';
import { draggable, type BehaviorOperation } from '../src/draggable.ts';
import { bounds } from '../src/free-drag/bounds.ts';
import { freeDrag, FreeDragResolution } from '../src/free-drag.ts';
import { Lifter } from '../src/lift.ts';
import { y } from '../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../src/sortable.ts';
import {
  commands,
  dragAndDrop,
  faultMessages,
  grab,
  isChromium,
  log,
  makeList,
  moveHeld,
  onCleanup,
  order,
  release,
  rowsOf,
  targetOf,
  wait,
} from './support/harness.ts';

/** An operation that names its item, for a step to read. */
interface Lifted extends BehaviorOperation {
  readonly item: HTMLElement;
}

describe('drag:DRD-20 detached controller methods', () => {
  it('should run draggable controller methods called on the controller, with cancelLanding passed detached', async () => {
    const list = makeList(2);
    const lifter = new Lifter(window);
    const controller = draggable<undefined, unknown, Lifted>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        lifter.acquire(drag);
        return {
          item: drag.item,
          end(outcome) {
            log.push(`end:${outcome.type}`);
          },
        };
      },
    });

    controller.use(lifter.cancelLanding);

    controller.use(() => {
      log.push('disposed');
    });
    await grab('#r0');

    let seen: string | null = null;

    controller.requestStep((operation) => {
      seen = operation ? operation.item.id : null;
    });
    controller.requestCancel('detached');
    await release();
    await controller.requestDestroy();
    expect(seen).toBe('r0');
    expect(log).toEqual(['end:canceled', 'disposed']);
  });

  it('should run sortable controller methods detached', async () => {
    const list = makeList(3);
    const { invalidate, requestCancel, requestDestroy } = sortable(list, {
      items: () => rowsOf(list),
      axis: y(),
      onReorder({ item, next }) {
        list.insertBefore(item, next);
        return ReorderResolution.accept();
      },
      onEnd(result) {
        log.push(`end:${result.type}`);

        if (result.type === 'canceled') {
          log.push(String(result.reason));
        }
      },
    });

    await grab('#r0');
    invalidate();
    requestCancel('detached');
    await release();
    await dragAndDrop('#r0', 50);
    expect(order(list)).toBe('r1,r0,r2');
    await requestDestroy();
    expect(log).toEqual(['end:canceled', 'detached', 'end:accepted']);
  });

  it('should run freeDrag controller methods detached', async () => {
    const box = makeList(1).firstElementChild as HTMLElement;
    const { invalidate, moveTo, requestCancel, requestDestroy } = freeDrag(
      box,
      {
        onDrop: () => FreeDragResolution.accept(),
        onEnd(result) {
          log.push(`end:${result.type}`);

          if (result.type === 'canceled') {
            log.push(String(result.reason));
          }
        },
      },
    );

    await grab(box);
    invalidate();
    moveTo({ x: 100, y: 100 });
    expect(Math.round(box.getBoundingClientRect().left)).toBe(100);
    requestCancel('detached');
    await release();
    await requestDestroy();
    expect(log).toEqual(['end:canceled', 'detached']);
  });
});

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
      let controller: ReturnType<typeof freeDrag> | null = freeDrag(box, {
        onDrop: () => FreeDragResolution.accept(),
      });

      await dragAndDrop(box, 30);
      // The instrument sees the instance while the controller is alive.
      expect(await commands.countHeapObjects('FreeDragBehavior')).toBe(
        before + 1,
      );
      await controller.requestDestroy();
      controller = null;
      box.remove();
      await wait(50);
      expect(await commands.countHeapObjects('FreeDragBehavior')).toBe(before);
    },
  );
});
