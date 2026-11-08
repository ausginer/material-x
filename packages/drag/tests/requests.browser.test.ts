/** `drag:DRI-1`, `drag:DRI-2` and `drag:DRI-8`: requests, the reader and deferred writes. */
import { describe, expect, it } from 'vitest';
import type { BehaviorOperation, Drag } from '../src/draggable.ts';
import { freeDrag, FreeDragResolution } from '../src/free-drag.ts';
import { Lifter } from '../src/lift.ts';
import { landing } from '../src/sortable/landing.ts';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  centerOf,
  commands,
  dragAndDrop,
  faultMessages,
  frames,
  grab,
  isClean,
  log,
  makeList,
  managed,
  onCleanup,
  order,
  ReactionProbe,
  refusals,
  release,
  rowsOf,
  targetOf,
} from './support/harness.ts';

type Asked = 'cancel' | 'destroy' | 'press';

describe('drag:DRI-1 a request does not change the running step', () => {
  it('should let a sortable placeholder reaction cancel during activation', async () => {
    let controller: ReturnType<typeof basicSortable> | null = null;

    ReactionProbe.react = () => {
      controller!.requestCancel('reaction');
    };

    const list = makeList(4);

    controller = basicSortable(list, {
      placeholder: () => document.createElement('reaction-probe'),
    });
    await grab('#r0');
    expect(log).toEqual(['start', 'end:canceled']);
    await release();
    expect(isClean(list)).toBe(true);

    ReactionProbe.react = null;
    await dragAndDrop('#r0', 90);
    expect(log).toEqual(['start', 'end:canceled', 'start', 'end:accepted']);
  });

  it('should let a sortable placeholder reaction destroy during activation', async () => {
    let controller: ReturnType<typeof basicSortable> | null = null;

    ReactionProbe.react = () => {
      void controller!.requestDestroy().then(() => log.push('destroyed'));
    };

    const list = makeList(4);

    controller = basicSortable(list, {
      placeholder: () => document.createElement('reaction-probe'),
    });
    await grab('#r0');
    await release();
    expect(log).toEqual(['start', 'destroyed']);
    expect(isClean(list)).toBe(true);
  });

  it.each<Asked>(['cancel', 'destroy', 'press'])(
    'should finish the step when a custom element reaction asks to %s during activate',
    async (asked) => {
      const list = makeList(4);
      const probe = document.createElement('reaction-probe');

      document.body.append(probe);

      const lifter = new Lifter(window);
      const panel = managed(list, {
        admit: (event) => ({ item: targetOf(event) }),
        activate(drag) {
          const lift = lifter.acquire(drag);

          log.push('activate:before');
          probe.setAttribute('data-poke', '1');
          log.push('activate:after');

          return {
            start: () => {
              log.push('start');
            },
            move() {
              lift.translate(drag.x - drag.originX, drag.y - drag.originY);
            },
            end: (outcome) => {
              log.push(`end:${outcome.type}`);
            },
          };
        },
      });

      panel.use(lifter.cancelLanding);
      ReactionProbe.react = () => {
        ReactionProbe.react = null;
        log.push(`request:${asked}`);

        if (asked === 'cancel') {
          panel.requestCancel('reaction');
        } else if (asked === 'destroy') {
          void panel.requestDestroy();
        } else {
          list.firstElementChild!.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
          );
        }
      };

      await grab('#r1');

      const running = [
        'activate:before',
        `request:${asked}`,
        'activate:after',
        'start',
      ];

      if (asked === 'cancel') {
        expect(log).toEqual([...running, 'end:canceled']);
      } else if (asked === 'destroy') {
        expect(log).toEqual(running);
      } else {
        expect(log).toEqual(running);
        expect(refusals().untrusted).toBe(1);
      }

      await release();

      if (asked === 'press') {
        expect(log.at(-1)).toBe('end:skipped');
      }

      expect(isClean(list)).toBe(true);
    },
  );

  it('should leave a hook alone when it requests a cancel', async () => {
    const list = makeList(4);
    let cancelInSettle = false;
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        move() {
          log.push('move:before');
          panel.requestCancel('from move');
          log.push('move:after');
        },
        settle(outcome) {
          cancelInSettle = true;
          panel.requestCancel('too late');
          log.push(
            `settle:${String((outcome as { reason?: unknown }).reason)}`,
          );
        },
        end(outcome) {
          log.push(
            `end:${String((outcome as { reason?: unknown }).reason)}:${cancelInSettle}`,
          );
        },
      }),
    });

    await grab('#r0');
    await release();
    expect(log).toEqual([
      'move:before',
      'move:after',
      'settle:from move',
      'end:from move:true',
    ]);
  });

  it('should apply an idle request before the call returns', async () => {
    const list = makeList(3);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        end: () => {
          log.push('end');
        },
      }),
    });

    await grab('#r0');
    panel.requestCancel('idle of a pass');
    expect(log).toEqual(['end']);
    await release();
  });
});

describe('drag:DRI-2 one reader and fixed precedence', () => {
  it('should apply a destroy requested from settle before the terminal', async () => {
    const list = makeList(4);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        settle() {
          void panel.requestDestroy();
        },
        end: () => {
          log.push('end');
        },
      }),
    });

    await dragAndDrop('#r0', 30);
    expect(log).toEqual([]);
    expect(isClean(list)).toBe(true);
  });

  it('should run deferred steps before the decision, with no drag behind it', async () => {
    const list = makeList(3);
    const seen: Array<BehaviorOperation | null> = [];
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start() {
          panel.requestCancel('first');
          panel.requestStep((operation) => {
            seen.push(operation);
            log.push(`step:settled=${log.includes('settle')}`);
          });
        },
        settle() {
          log.push('settle');
        },
      }),
    });

    await grab('#r0');
    expect(seen).toEqual([null]);
    expect(log).toEqual(['step:settled=false', 'settle']);
    await release();
  });

  it('should see a request made by a deferred step on its next turn', async () => {
    const list = makeList(3);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start() {
          panel.requestStep(() => {
            log.push('first');
            panel.requestStep(() => {
              log.push('nested');
            });
          });
          panel.requestStep(() => {
            log.push('second');
          });
        },
      }),
    });

    await grab('#r0');
    expect(log).toEqual(['first', 'second', 'nested']);
    await release();
  });

  it('should not pull when a release queues collection work and then cancels', async () => {
    const list = makeList(5);
    const removed = document.querySelector('#r4')!;
    let pulls = 0;
    let round = 0;
    const controller = basicSortable(list, {
      items() {
        pulls += 1;
        return rowsOf(list);
      },
      onReorder({ item, next }) {
        round += 1;

        if (round > 1) {
          list.insertBefore(item, next);
          return ReorderResolution.accept();
        }

        pulls = 0;
        removed.remove();
        controller.invalidate();
        controller.requestCancel('after the work');
        return ReorderResolution.accept();
      },
      onEnd(result) {
        log.push(`${result.type}:pulls=${pulls}`);
      },
    });

    await dragAndDrop('#r0', 90);
    expect(log).toEqual(['start', 'canceled:pulls=0']);
    expect(isClean(list)).toBe(true);
  });

  it('should keep a cancel first when a callback also invalidates', async () => {
    const list = makeList(5);
    let pulls = 0;
    const controller = basicSortable(list, {
      items() {
        pulls += 1;
        return rowsOf(list);
      },
      onStart() {
        pulls = 0;
        controller.requestCancel('first');
        controller.invalidate();
      },
      onEnd(result) {
        log.push(
          `${String((result as { reason?: unknown }).reason)}:pulls=${pulls}`,
        );
      },
    });

    await grab('#r0');
    await release();
    expect(log).toEqual(['first:pulls=0']);
  });

  it('should report a fault raised after queued collection work once', async () => {
    const list = makeList(5);
    const controller = basicSortable(list, {
      onReorder() {
        controller.invalidate();
        throw new Error('after the work');
      },
      onEnd(result) {
        log.push(result.type);
      },
    });

    await dragAndDrop('#r0', 90);
    expect(log).toEqual(['start', 'canceled']);
    expect(faultMessages()).toEqual(['after the work']);
    expect(isClean(list)).toBe(true);
  });
});

describe('drag:DRI-8 deferred writes', () => {
  it('should run a step at once when no pass is running', () => {
    const list = makeList(1);
    const panel = managed(list, {
      admit: () => null,
      activate: () => ({}),
    });
    const seen: unknown[] = [];

    panel.requestStep((operation) => {
      seen.push(operation);
    });
    expect(seen).toEqual([null]);
  });

  it('should run steps between steps in request order', async () => {
    const list = makeList(2);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start() {
          panel.requestStep(() => {
            log.push('a');
          });
          panel.requestStep(() => {
            log.push('b');
          });
          log.push('start finished');
        },
      }),
    });

    await grab('#r0');
    expect(log).toEqual(['start finished', 'a', 'b']);
    await release();
  });

  it('should coalesce one function requested twice before it runs', async () => {
    const list = makeList(2);
    const step = (): void => {
      log.push('step');
    };
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start() {
          panel.requestStep(step);
          panel.requestStep(step);
        },
      }),
    });

    await grab('#r0');
    expect(log).toEqual(['step']);
    await release();
  });

  it('should pull once for two invalidate calls in one callback', async () => {
    const list = makeList(4);
    let pulls = 0;
    const controller = basicSortable(list, {
      items() {
        pulls += 1;
        return rowsOf(list);
      },
      onStart() {
        pulls = 0;
        controller.invalidate();
        controller.invalidate();
      },
    });

    await grab('#r0');
    expect(pulls).toBe(1);
    await release();
  });

  it('should give a step null before activation', async () => {
    const list = makeList(2);
    const seen: unknown[] = [];
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({}),
    });
    const { x, y } = centerOf('#r0');

    await commands.pointerMove(x, y);
    await commands.pointerDown();
    panel.requestStep((operation) => {
      seen.push(operation);
    });
    expect(seen).toEqual([null]);
  });

  it('should give a step the operation activate returned while the operation is active', async () => {
    type Held = BehaviorOperation & Readonly<{ item: HTMLElement }>;

    const list = makeList(2);
    const seen: unknown[] = [];
    const received: Array<Held | null> = [];
    let returned: Held | null = null;
    let held: Drag<Held> | null = null;
    const panel = managed<undefined, unknown, Held>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        held = drag;
        returned = { item: drag.item };
        return returned;
      },
    });
    const receive = (operation: Held | null): void => {
      received.push(operation);
    };

    await grab('#r0');
    panel.requestStep((operation) => {
      seen.push(operation?.item);
    });
    expect(seen).toEqual([document.querySelector('#r0')]);
    panel.requestStep(receive);
    held!.requestStep(receive);
    expect(received).toHaveLength(2);
    expect(received[0]).toBe(returned);
    expect(received[1]).toBe(returned);
    await release();
    panel.requestStep(receive);
    expect(received).toHaveLength(3);
    expect(received[2]).toBeNull();
  });

  it('should give a step null while a verdict is pending', async () => {
    const list = makeList(2);
    const seen: unknown[] = [];
    let finish: (() => void) | null = null;
    const panel = managed<undefined, string>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        drop: () => () =>
          new Promise<string>((resolve) => {
            finish = () => {
              resolve('done');
            };
          }),
      }),
    });

    await grab('#r0');
    await release();
    panel.requestStep((operation) => {
      seen.push(operation);
    });
    expect(seen).toEqual([null]);
    finish!();
  });

  it('should give a step null behind a decision', async () => {
    const list = makeList(2);
    const seen: unknown[] = [];
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        move() {
          panel.requestCancel('decided');
          panel.requestStep((operation) => {
            seen.push(operation);
          });
        },
      }),
    });

    await grab('#r0');
    expect(seen).toEqual([null]);
  });

  it('should report a throw in a step as a fault that decides', async () => {
    const list = makeList(2);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        end: (outcome) => {
          log.push(`end:${outcome.type}`);
        },
      }),
    });

    await grab('#r0');
    panel.requestStep(() => {
      throw new Error('from a step');
    });
    expect(faultMessages()).toEqual(['from a step']);
    expect(log).toEqual(['end:canceled']);
  });

  it('should only report a throw in a step with no operation', () => {
    const panel = managed(makeList(1), {
      admit: () => null,
      activate: () => ({}),
    });

    panel.requestStep(() => {
      throw new Error('idle');
    });
    expect(faultMessages()).toEqual(['idle']);
  });

  it('should do nothing for a moveTo behind a cancel, and land from the prior position', async () => {
    const element = document.createElement('div');

    element.id = 'free';
    element.style.cssText =
      'position:absolute;left:100px;top:100px;width:50px;height:50px;touch-action:none';
    document.body.append(element);

    const fromX: number[] = [];
    const controller = freeDrag(element, {
      landing: landing({
        duration(context) {
          fromX.push(context.fromX);
          return 500;
        },
      }),
      onDrop: () => FreeDragResolution.reject('no'),
    });

    onCleanup(() => controller.requestDestroy());
    await grab(element, 40, 40);
    controller.requestCancel('decided');

    const after = element.getBoundingClientRect().left;

    controller.moveTo({ x: 500, y: 500 });
    expect(element.getBoundingClientRect().left).toBe(after);
    expect(fromX).toEqual([40]);
  });

  it('should keep the order of moveTo closures in one pass', async () => {
    const element = document.createElement('div');

    element.style.cssText =
      'position:absolute;left:0;top:0;width:50px;height:50px;touch-action:none';
    document.body.append(element);

    const controller = freeDrag(element, {
      onStart() {
        controller.moveTo({ x: 100, y: 100 });
        controller.moveTo({ x: 200, y: 200 });
      },
      onDrop: () => FreeDragResolution.accept(),
    });

    onCleanup(() => controller.requestDestroy());
    await grab(element);
    expect(element.getBoundingClientRect().left).toBeCloseTo(200, 0);
  });

  it('should move nothing with a collection change after the drop', async () => {
    const list = makeList(4);
    let finish: ((value: ReorderResolution) => void) | null = null;
    const controller = basicSortable(list, {
      onReorder: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });

    await dragAndDrop('#r0', 90);
    document.querySelector('#r3')!.remove();
    controller.invalidate();
    await frames();
    expect(log).toEqual(['start']);
    finish!(ReorderResolution.accept());
    await frames();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(order(list)).toBe('r0,r1,r2');
  });

  // drag:DRI-8: the session ends when its terminal step detaches, so a step
  // requested in `settle` still runs, and one requested in `end` does not.
  it('should run a step requested in settle before end with null, and none requested in end', async () => {
    const list = makeList(2);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        settle() {
          log.push('settle');
          drag.requestStep((target) => {
            log.push(target ? 'settle step:drag' : 'settle step:null');
          });
        },
        end() {
          log.push('end');
          drag.requestStep(() => {
            log.push('end step');
          });
        },
      }),
    });

    await grab('#r0');
    await release();
    await frames();
    expect(log).toEqual(['settle', 'settle step:null', 'end']);
  });
});
