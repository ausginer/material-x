/** `drag:DRI-10`: destruction. */
import { describe, expect, it } from 'vitest';
import type { DraggableController, LiftedDrag } from '../src/draggable.ts';
import { lift } from '../src/lift.ts';
import { landing } from '../src/sortable/landing.ts';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { y } from '../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../src/sortable.ts';
import {
  basicSortable,
  commands,
  dragAndDrop,
  faults,
  frames,
  grab,
  isChromium,
  isClean,
  log,
  makeList,
  moveHeld,
  ReactionProbe,
  release,
  rowsOf,
  targetOf,
  wait,
} from './support/harness.ts';
import { draggable } from '../src/draggable.ts';

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
  let panel: DraggableController<LiftedDrag> | null = null;
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
  panel = draggable(list, {
    lift,
    admit(event) {
      destroyHere('admit');
      return { item: targetOf(event) };
    },
    activate(drag) {
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
    },
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
      return null;
    },
    end() {
      destroyHere('end');
    },
  });

  if (where === 'listener') {
    list.addEventListener('pointerup', () => {
      destroyHere('listener');
    });
  }

  await grab('#r0');
  await release();
  return { list, panel, after, destroyed: () => destroyed };
}

describe('drag:DRI-10 destruction', () => {
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
      // The listener on the root runs before the kernel's on the document.
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
    const panel = draggable(makeList(1), { admit: () => null });
    const first = panel.requestDestroy();

    expect(panel.requestDestroy()).toBe(first);
    await first;
    expect(panel.requestDestroy()).toBe(first);
  });

  it('should settle the promise after teardown', async () => {
    const panel = draggable(makeList(1), { admit: () => null });

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
    const panel = draggable(list, {
      lift,
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use((outcome) => {
          seen.push(outcome);
        });
      },
      settle() {
        log.push('settle');
        return null;
      },
      end: () => {
        log.push('end');
      },
    });

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
      start: () => {
        log.push('start');
      },
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
    let retained: LiftedDrag | null = null;
    const seen: unknown[] = [];
    const panel = draggable(list, {
      lift,
      admit: (event) => ({ item: targetOf(event) }),
      start(drag) {
        retained = drag;
      },
    });

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
      const panel = draggable<object>(list, {
        lift,
        admit(event) {
          const state = {};

          refs.push(new WeakRef(state));
          return { item: targetOf(event), state };
        },
        start(drag) {
          refs.push(new WeakRef(drag));
        },
      });

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
    'should retain no item, behavior or view after 3 operations and destruction',
    async () => {
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
      let controller: ReturnType<typeof sortable> | null = sortable(list, {
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
          void behavior;
        },
      });

      await dragAndDrop('#r0', 90);
      await dragAndDrop('#r0', -90);
      await dragAndDrop('#r1', 90);
      await wait(50);
      await controller.requestDestroy();
      controller = null;
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
    },
  );
});
