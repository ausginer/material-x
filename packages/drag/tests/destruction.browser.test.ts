/** `drag:DRI-10`: destruction. */
import { assertType, describe, expect, it } from 'vitest';
import {
  draggable,
  type BehaviorOperation,
  type Drag,
  type DraggableController,
} from '../src/draggable.ts';
import { Lifter, type Lift } from '../src/lift.ts';
import { landing } from '../src/sortable/landing.ts';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { y } from '../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../src/sortable.ts';
import {
  basicSortable,
  commands,
  dragAndDrop,
  faultMessages,
  faults,
  frames,
  grab,
  isChromium,
  isClean,
  log,
  makeList,
  onCleanup,
  managed,
  moveHeld,
  ReactionProbe,
  release,
  rowsOf,
  targetOf,
  wait,
} from './support/harness.ts';

type Hook =
  | 'admit'
  | 'activate'
  | 'start'
  | 'move'
  | 'drop'
  | 'verdict'
  | 'settle'
  | 'dispose'
  | 'end'
  | 'reaction'
  | 'listener';

/** One drag whose `where` hook requests destruction, recording what ran after. */
async function destroyFrom(where: Hook) {
  const list = makeList(3);
  const probe = document.createElement('reaction-probe');
  let panel: DraggableController<BehaviorOperation> | null = null;
  let destroyed: Promise<void> | null = null;
  const after: string[] = [];
  let requested = false;
  const destroyHere = (hook: Hook): void => {
    after.push(hook);

    if (hook === where && !requested) {
      requested = true;
      destroyed = panel!.requestDestroy();
    }
  };

  document.body.append(probe);

  const lifter = new Lifter(window);

  panel = draggable(list, {
    admit(event) {
      destroyHere('admit');
      return { item: targetOf(event) };
    },
    activate(drag) {
      lifter.acquire(drag);
      destroyHere('activate');

      if (where === 'reaction') {
        ReactionProbe.react = () => {
          ReactionProbe.react = null;
          destroyHere('reaction');
        };
        probe.setAttribute('data-poke', '1');
      }

      drag.use((outcome) => {
        after.push(`dispose:${outcome === null ? 'null' : outcome.type}`);

        if (where === 'dispose') {
          destroyHere('dispose');
        }
      });

      return {
        start() {
          destroyHere('start');
        },
        move() {
          destroyHere('move');
        },
        drop() {
          destroyHere('drop');
          return () => {
            destroyHere('verdict');
            return 'done';
          };
        },
        settle() {
          destroyHere('settle');
        },
        end() {
          destroyHere('end');
        },
      };
    },
  });
  panel.use(lifter.cancelLanding);

  if (where === 'listener') {
    const listening = new AbortController();

    onCleanup(() => {
      listening.abort();
    });
    // Registered before the press, so it runs before the kernel's own
    // window-capture listener.
    window.addEventListener(
      'pointerup',
      () => {
        destroyHere('listener');
      },
      { capture: true, signal: listening.signal },
    );
  }

  await grab('#r0');
  await release();
  return { list, panel, after, destroyed: () => destroyed };
}

describe('drag:DRI-10 destruction', () => {
  it('should admit no press after destruction', async () => {
    const list = makeList(2);
    let admissions = 0;
    const controller = managed(list, {
      admit(event) {
        admissions += 1;
        return { item: targetOf(event) };
      },
      activate: () => ({}),
    });

    await controller.requestDestroy();
    await dragAndDrop('#r0', 30);
    expect(admissions).toBe(0);
    expect(faultMessages()).toEqual([]);
  });

  it.each<Hook>([
    'admit',
    'activate',
    'start',
    'move',
    'drop',
    'verdict',
    'settle',
    'dispose',
    'end',
    'reaction',
    'listener',
  ])('should tear down totally when requested from %s', async (where) => {
    const { list, panel, after, destroyed } = await destroyFrom(where);

    if (where === 'listener') {
      // The page's listener runs before the kernel's.
      expect(after).not.toContain('settle');
    }

    expect(destroyed()).toBe(panel.requestDestroy());
    await destroyed();
    expect(isClean(list)).toBe(true);
    expect(faults).toEqual([]);

    const index = after.indexOf(where);
    const later = after.slice(index + 1);

    expect(later.filter((hook) => !hook.startsWith('dispose'))).toEqual(
      where === 'admit' || where === 'activate' || where === 'reaction'
        ? later.filter(
            (hook) =>
              !hook.startsWith('dispose') &&
              (hook === 'activate' || hook === 'start'),
          )
        : [],
    );
  });

  it('should return one promise by identity on every call', async () => {
    const panel = draggable(makeList(1), {
      admit: () => null,
      activate: () => ({}),
    });
    const first = panel.requestDestroy();

    expect(panel.requestDestroy()).toBe(first);
    await first;
    expect(panel.requestDestroy()).toBe(first);
  });

  it('should settle the promise after teardown', async () => {
    const panel = draggable(makeList(1), {
      admit: () => null,
      activate: () => ({}),
    });

    panel.use(() => {
      log.push('teardown');
    });
    await panel.requestDestroy();
    log.push('settled');
    expect(log).toEqual(['teardown', 'settled']);
  });

  it('should give disposers null and deliver no settle or end', async () => {
    const list = makeList(2);
    const seen: unknown[] = [];
    const lifter = new Lifter(window);
    const panel = draggable(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        lifter.acquire(drag);
        drag.use((outcome) => {
          seen.push(outcome);
        });
        return {
          settle() {
            log.push('settle');
          },
          end: () => {
            log.push('end');
          },
        };
      },
    });

    panel.use(lifter.cancelLanding);

    await grab('#r0');
    await panel.requestDestroy();
    expect(seen).toEqual([null]);
    expect(log).toEqual([]);
    expect(isClean(list)).toBe(true);
  });

  it('should do nothing for a later request', async () => {
    const list = makeList(2);
    const panel = draggable(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start: () => {
          log.push('start');
        },
      }),
    });

    await panel.requestDestroy();
    panel.requestCancel('late');
    panel.requestStep(() => {
      log.push('step');
    });
    await dragAndDrop('#r0', 30);
    expect(log).toEqual([]);
  });

  it('should run a later use at once on the operation scope, with null', async () => {
    const list = makeList(2);
    let retained: Drag | null = null;
    const seen: unknown[] = [];
    const lifter = new Lifter(window);
    const panel = draggable(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        lifter.acquire(drag);
        return {
          start() {
            retained = drag;
          },
        };
      },
    });

    panel.use(lifter.cancelLanding);

    await grab('#r0');
    await panel.requestDestroy();
    retained!.use((outcome) => {
      seen.push(outcome);
    });
    expect(seen).toEqual([null]);
  });

  it('should not restore focus on destruction', async () => {
    const list = makeList(3);

    for (const row of rowsOf(list)) {
      row.tabIndex = 0;
    }

    const controller = basicSortable(list, {
      onReorder: () => new Promise<ReorderResolution>(() => {}),
    });
    const row = document.querySelector<HTMLElement>('#r0')!;

    row.focus();
    await dragAndDrop(row, 45);
    row.remove();
    list.prepend(row);
    expect(document.activeElement).toBe(document.body);
    await controller.requestDestroy();
    expect(document.activeElement).toBe(document.body);
  });

  it('should cancel a running landing and the row animations', async () => {
    const list = makeList(4);
    const controller = basicSortable(list, {
      landing: landing({ duration: 5000 }),
      displacement: layoutAnimation({ duration: 5000 }),
      onReorder: () => ReorderResolution.reject('no'),
    });
    const count = (): number =>
      rowsOf(list).reduce((sum, row) => sum + row.getAnimations().length, 0);
    const start = document.querySelector('#r0')!.getBoundingClientRect();

    await grab('#r0');
    await moveHeld(start.x + 20, start.y + 60);
    await moveHeld(start.x + 20, start.y + 100);
    await commands.pointerUp();
    expect(count()).toBeGreaterThan(0);
    await controller.requestDestroy();
    expect(count()).toBe(0);
  });

  it.runIf(isChromium)(
    'should retain no drag view or state after a custom behavior is destroyed',
    async () => {
      const list = makeList(3);
      const refs: Array<WeakRef<object>> = [];
      const lifter = new Lifter(window);
      const panel = draggable<{ lift: Lift | null }>(list, {
        admit(event) {
          const state = { lift: null };

          refs.push(new WeakRef(state));
          return { item: targetOf(event), state };
        },
        activate(drag, state) {
          state.lift = lifter.acquire(drag);
          return {
            start() {
              refs.push(new WeakRef(drag));
            },
          };
        },
      });

      panel.use(lifter.cancelLanding);

      await dragAndDrop('#r0', 30);
      await panel.requestDestroy();
      await wait(50);
      await commands.forceGarbageCollection();
      await wait(0);
      await commands.forceGarbageCollection();
      expect(refs).toHaveLength(2);
      expect(refs.map((ref) => ref.deref())).toEqual([undefined, undefined]);
    },
  );

  it.runIf(isChromium)(
    'should retain no item, behavior, view or behavior instance after 3 operations and destruction',
    async () => {
      const instancesBefore =
        await commands.countHeapObjects('SortableBehavior');
      const holder = document.createElement('div');

      document.body.append(holder);

      const list = makeList(4, holder);
      let behavior: object | null = {};
      const refs: Array<WeakRef<object>> = [
        new WeakRef(behavior),
        new WeakRef(list.firstElementChild!),
        new WeakRef(list),
      ];
      const items = (): HTMLElement[] => rowsOf(list);
      // Only this function's frame holds the controller, so the controller is
      // unreachable once the function returns.
      const operateThenDestroy = async (): Promise<void> => {
        const controller = sortable(list, {
          items,
          axis: y(),
          landing: landing({ duration: 1 }),
          displacement: layoutAnimation({ duration: 1 }),
          onReorder({ item, next }) {
            list.insertBefore(item, next);
            return ReorderResolution.accept();
          },
          onStart(item) {
            refs.push(new WeakRef(item));
            // The callback captures the variable, not its object, so clearing
            // `behavior` below releases the object whether or not the controller is.
            assertType(behavior);
          },
        });

        await dragAndDrop('#r0', 90);
        await dragAndDrop('#r0', -90);
        await dragAndDrop('#r1', 90);
        await wait(50);
        // The instrument sees the instance while the controller is alive.
        expect(await commands.countHeapObjects('SortableBehavior')).toBe(
          instancesBefore + 1,
        );
        await controller.requestDestroy();
      };

      await operateThenDestroy();
      behavior = null;
      holder.remove();
      list.replaceChildren();
      await frames(3);
      await commands.pointerMove(600, 600);
      await wait(50);
      refs.push(new WeakRef(list));
      await commands.forceGarbageCollection();
      await wait(0);
      await commands.forceGarbageCollection();
      expect(refs.slice(0, 2).map((ref) => ref.deref())).toEqual([
        undefined,
        undefined,
      ]);
      expect(await commands.countHeapObjects('SortableBehavior')).toBe(
        instancesBefore,
      );
    },
  );

  // drag:DRI-10: destruction requested inside a pass ends the session before
  // the verdict's abort runs foreign code, so that code reaches nothing.
  it('should not apply an Escape dispatched by the verdict abort during destruction', async () => {
    const list = makeList(2);
    const prevented: boolean[] = [];
    const panel = managed<undefined, string>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start() {
          log.push('start');
        },
        drop: () => (signal) => {
          signal.addEventListener('abort', () => {
            const escape = new KeyboardEvent('keydown', {
              key: 'Escape',
              bubbles: true,
              cancelable: true,
            });

            document.dispatchEvent(escape);
            prevented.push(escape.defaultPrevented);
          });
          return new Promise<string>(() => {});
        },
        settle() {
          log.push('settle');
        },
        end() {
          log.push('end');
        },
      }),
    });

    await grab('#r0');
    await release();
    log.length = 0;
    panel.requestStep(() => {
      void panel.requestDestroy();
    });
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
  });

  it('should not report a thenable rejected by the verdict abort during destruction', async () => {
    const list = makeList(2);
    let rejected = false;
    const panel = managed<undefined, string>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        drop: () => (signal) => {
          let reject: ((error: unknown) => unknown) | null = null;

          signal.addEventListener('abort', () => {
            reject!(new Error('late rejection'));
            rejected = true;
          });
          const verdict: PromiseLike<string> = {
            then(_, onRejected) {
              reject = onRejected ?? null;
              return verdict as never;
            },
          };

          return verdict;
        },
      }),
    });

    await grab('#r0');
    await release();
    panel.requestStep(() => {
      void panel.requestDestroy();
    });
    expect(rejected).toBe(true);
    expect(faults).toEqual([]);
  });
});
