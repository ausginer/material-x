/**
 * `drag:DRD-20`: controller methods work when detached, and destruction leaves
 * nothing that references a built-in's behavior instance.
 */
import { describe, expect, it } from 'vitest';
import { draggable } from '../src/draggable.ts';
import { freeDrag, FreeDragResolution } from '../src/free-drag.ts';
import { Lifter, type Lift } from '../src/lift.ts';
import { y } from '../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../src/sortable.ts';
import {
  commands,
  dragAndDrop,
  grab,
  isChromium,
  log,
  makeList,
  order,
  release,
  rowsOf,
  targetOf,
  wait,
} from './support/harness.ts';

describe('drag:DRD-20 detached controller methods', () => {
  it('should run draggable controller methods detached', async () => {
    const list = makeList(2);
    const lifter = new Lifter(window);
    const { requestStep, requestCancel, requestDestroy, use } = draggable<{
      lift: Lift | null;
    }>(list, {
      admit: (event) => ({ item: targetOf(event), state: { lift: null } }),
      activate(drag) {
        drag.state.lift = lifter.acquire(drag);
        return undefined;
      },
      end(_, outcome) {
        log.push(`end:${outcome.type}`);
      },
    });

    use(lifter.cancelLanding);

    use(() => {
      log.push('disposed');
    });
    await grab('#r0');

    let seen: string | null = null;

    requestStep((drag) => {
      seen = drag ? drag.item.id : null;
    });
    requestCancel('detached');
    await release();
    await requestDestroy();
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
      },
    });

    await grab('#r0');
    invalidate();
    requestCancel('detached');
    await release();
    await dragAndDrop('#r0', 50);
    expect(order(list)).toBe('r1,r0,r2');
    await requestDestroy();
    expect(log).toEqual(['end:canceled', 'end:accepted']);
  });

  it('should run freeDrag controller methods detached', async () => {
    const box = makeList(1).firstElementChild as HTMLElement;
    const { invalidate, moveTo, requestCancel, requestDestroy } = freeDrag(
      box,
      {
        onDrop: () => FreeDragResolution.accept(),
        onEnd(result) {
          log.push(`end:${result.type}`);
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
    expect(log).toEqual(['end:canceled']);
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
