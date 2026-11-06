/** `drag:DRI-14`, `drag:DRI-15`, and the sortable options `sortable` adds. */
import { describe, expect, it } from 'vitest';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { xy } from '../src/sortable/xy.ts';
import { ReorderResolution, type SortableResult } from '../src/sortable.ts';
import {
  basicSortable,
  centerOf,
  commands,
  dragAndDrop,
  faults,
  faultMessages,
  frames,
  grab,
  isClean,
  log,
  makeList,
  moveHeld,
  onCleanup,
  press,
  ReactionProbe,
  release,
  rowsOf,
  order,
} from './support/harness.ts';

describe('drag:DRI-14 collection', () => {
  it('should pull at admission, so a row added with no invalidate can be dragged', async () => {
    const list = makeList(3);

    basicSortable(list);

    const late = document.createElement('div');

    late.id = 'late';
    late.className = 'row';
    late.style.height = '40px';
    list.prepend(late);
    await dragAndDrop('#late', 60);
    expect(log).toEqual(['start', 'end:accepted']);
    expect(order(list)).toBe('r0,late,r1,r2');
  });

  it('should pull again at activation, so a change during the press is seen', async () => {
    const list = makeList(4);

    basicSortable(list);

    const { x, y } = await press('#r1');

    // During the press: the row before the pressed one goes, with no call.
    document.querySelector('#r0')!.remove();
    await commands.pointerMove(x, y + 20, 2);
    await frames();
    await moveHeld(x, y + 40);
    await release();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(order(list)).toBe('r2,r3,r1');
  });

  it('should decline quietly when the item left the collection during the press', async () => {
    const list = makeList(4);
    const excluded = new Set<Element>();

    basicSortable(list, {
      items: () => rowsOf(list).filter((row) => !excluded.has(row)),
    });

    const { x, y } = await press('#r1');

    excluded.add(document.querySelector('#r1')!);
    await commands.pointerMove(x, y + 40, 3);
    await release();
    expect(log).toEqual([]);
    expect(faults).toEqual([]);
    expect(isClean(list)).toBe(true);
  });

  it('should decline quietly when the item left the document during the press', async () => {
    const list = makeList(4);

    basicSortable(list);

    const { x, y } = await press('#r1');

    document.querySelector('#r1')!.remove();
    await commands.pointerMove(x, y + 40, 3);
    await release();
    expect(log).toEqual([]);
    expect(faults).toEqual([]);
    await dragAndDrop('#r2', 45);
    expect(log).toEqual(['start', 'end:accepted']);
  });

  it('should rebase a surviving gap on invalidate during a drag', async () => {
    const list = makeList(5);
    const controller = basicSortable(list);

    await grab('#r0', 0, 20);
    document.querySelector('#r4')!.remove();
    controller.invalidate();
    await frames();
    expect(log).toEqual(['start']);
    await release();
    expect(log).toEqual(['start', 'end:noop']);
  });

  it('should cancel when the dragged item was removed', async () => {
    const results: SortableResult[] = [];
    const list = makeList(5);
    const controller = basicSortable(list, {
      onEnd(result) {
        results.push(result);
      },
    });

    await grab('#r0', 0, 20);
    document.querySelector('#r0')!.remove();
    controller.invalidate();
    expect((results[0] as { reason: unknown }).reason).toBe(
      'sortable:item-removed',
    );
  });

  it('should cancel when the gap loses its adjacency', async () => {
    const results: SortableResult[] = [];
    const list = makeList(4);
    const controller = basicSortable(list, {
      onEnd(result) {
        results.push(result);
      },
    });

    await grab('#r0', 0, 20);
    document.querySelector('#r1')!.remove();
    controller.invalidate();
    expect((results[0] as { reason: unknown }).reason).toBe(
      'sortable:collection-invalidated',
    );
  });

  it('should carry item, from, to, previous and next, so insertBefore applies', async () => {
    const list = makeList(4);
    const seen: unknown[] = [];

    basicSortable(list, {
      onReorder(request) {
        seen.push([
          request.item.id,
          request.from,
          request.to,
          request.previous?.id,
          request.next?.id,
        ]);
        list.insertBefore(request.item, request.next);
        return ReorderResolution.accept();
      },
    });
    await dragAndDrop('#r0', 90);
    expect(seen).toEqual([[`r0`, 0, 2, 'r2', 'r3']]);
    expect(order(list)).toBe('r1,r2,r0,r3');
  });

  it('should reach the end gap with a null next', async () => {
    const list = makeList(3);
    const nexts: unknown[] = [];

    basicSortable(list, {
      onReorder({ item, next }) {
        nexts.push(next);
        list.insertBefore(item, next);
        return ReorderResolution.accept();
      },
    });
    await dragAndDrop('#r0', 130);
    expect(nexts).toEqual([null]);
    expect(order(list)).toBe('r1,r2,r0');
  });

  it('should move one slot on a keyboard command, inert at the edge', async () => {
    const list = makeList(3);

    for (const row of rowsOf(list)) {
      row.tabIndex = 0;
    }

    basicSortable(list);
    document.querySelector<HTMLElement>('#r0')!.focus();
    await commands.keyPress('ArrowUp');
    expect(log).toEqual([]);
    await commands.keyPress('ArrowDown');
    await frames();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(order(list)).toBe('r1,r0,r2');
    expect(isClean(list)).toBe(true);
  });

  it('should decline on altKey', async () => {
    const list = makeList(3);

    basicSortable(list);
    list.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        altKey: true,
      }),
    );
    await dragAndDrop('#r0', 45);
    expect(log).toEqual(['start', 'end:accepted']);
  });
});

describe('drag:DRI-14 collection failures', () => {
  it('should cancel with a fault when a pull during a drag throws', async () => {
    const list = makeList(4);
    const results: string[] = [];
    let broken = false;
    const controller = basicSortable(list, {
      items() {
        if (broken) {
          throw new Error('items');
        }

        return rowsOf(list);
      },
      onEnd(result) {
        results.push(
          `${result.type}:${(result as { origin?: string }).origin}`,
        );
      },
    });

    await grab('#r0');
    broken = true;
    controller.invalidate();
    await release();
    expect(results).toEqual(['canceled:fault']);
    expect(faultMessages()).toEqual(['items']);
    expect(isClean(list)).toBe(true);
  });

  it('should end activation with a fault and no start when the second pull throws', async () => {
    const list = makeList(4);
    let pulls = 0;

    basicSortable(list, {
      items() {
        pulls += 1;

        if (pulls === 2) {
          throw new Error('items');
        }

        return rowsOf(list);
      },
    });
    await dragAndDrop('#r0', 40);
    expect(log).toEqual([]);
    expect(faultMessages()).toEqual(['items']);
    expect(isClean(list)).toBe(true);
  });

  it('should report a throwing visual, with no operation', async () => {
    const list = makeList(3);

    basicSortable(list, {
      visual() {
        throw new Error('visual');
      },
    });
    await dragAndDrop('#r0', 40);
    expect(log).toEqual([]);
    expect(faultMessages()).toEqual(['visual']);
    expect(isClean(list)).toBe(true);
  });

  it('should apply an invalidate from inside onStart', async () => {
    const list = makeList(4);
    let pulls = 0;
    const controller = basicSortable(list, {
      items() {
        pulls += 1;
        return rowsOf(list);
      },
      onStart() {
        const before = pulls;

        controller.invalidate();
        log.push(`pulled:${pulls - before}`);
      },
    });

    await dragAndDrop('#r0', 45);
    expect(log[0]).toBe('pulled:0');
    expect(log.at(-1)).toBe('end:accepted');
    expect(faults).toEqual([]);
  });

  it('should pull nothing and report nothing for an invalidate after destruction', async () => {
    const list = makeList(3);
    let pulls = 0;
    const controller = basicSortable(list, {
      items() {
        pulls += 1;
        return rowsOf(list);
      },
    });

    await controller.requestDestroy();
    controller.invalidate();
    expect(pulls).toBe(0);
    expect(faults).toEqual([]);
  });

  it('should reach the first gap, moving a row to the start', async () => {
    const list = makeList(4);

    basicSortable(list);
    await dragAndDrop('#r3', -125);
    expect(order(list)).toBe('r3,r0,r1,r2');
  });

  it('should resolve the release from the final sample, with no frame after it', async () => {
    const list = makeList(5);

    basicSortable(list);

    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 10, 2);
    await frames();
    await commands.pointerMove(start.x, start.y + 85, 1);
    await release();
    expect(order(list)).toBe('r1,r2,r0,r3,r4');
  });
});

describe('drag:DRI-15 placeholder integrity', () => {
  it.each([
    ['removes itself', (probe: Element) => probe.remove()],
    ['moves itself', (probe: Element) => document.body.append(probe)],
    ['takes the list out', (probe: Element) => probe.parentElement!.remove()],
    [
      'moves within the container',
      (probe: Element) => probe.parentElement!.append(probe),
    ],
    [
      'takes the item away from it',
      () => document.body.append(document.querySelector('#r0')!),
    ],
  ] as const)(
    'should end activation clean with a fault when a placeholder %s',
    async (_name, act) => {
      const list = makeList(4);

      basicSortable(list, {
        placeholder() {
          const probe = document.createElement('reaction-probe');

          ReactionProbe.react = () => {
            ReactionProbe.react = null;
            act(probe);
          };
          return probe;
        },
      });
      await grab('#r0');
      await release();
      expect(log).toEqual([]);
      expect(faults).toHaveLength(1);
      expect(document.querySelector('[data-drag-placeholder]')).toBeNull();
    },
  );

  it('should cancel and report when an anchor leaves the container', async () => {
    const list = makeList(5);
    const results: string[] = [];

    basicSortable(list, {
      onEnd(result) {
        results.push(
          `${result.type}:${(result as { origin?: string }).origin}`,
        );
      },
    });
    await grab('#r0', 0, 20);
    document.body.append(document.querySelector('#r4')!);

    const anchor = centerOf('#r4');

    await commands.pointerMove(anchor.x, anchor.y + 15, 3);
    await frames(3);
    await release();
    expect(results).toEqual(['canceled:fault']);
    expect(faultMessages()).toHaveLength(1);
  });

  it('should cancel and report when an anchor leaves before the release', async () => {
    const list = makeList(5);
    const results: string[] = [];

    basicSortable(list, {
      onEnd(result) {
        results.push(result.type);
      },
    });
    await grab('#r0', 0, 45);
    document.body.append(document.querySelector('#r2')!);
    await release();
    expect(results).toEqual(['canceled']);
    expect(faultMessages()).toHaveLength(1);
    expect(isClean(list)).toBe(true);
  });

  it('should still cancel on Escape when the home anchor left', async () => {
    const list = makeList(5);
    const results: string[] = [];

    basicSortable(list, {
      onEnd(result) {
        results.push(
          `${result.type}:${(result as { origin?: string }).origin}`,
        );
      },
    });
    await grab('#r1', 0, 45);
    document.body.append(document.querySelector('#r2')!);
    await commands.keyPress('Escape');
    await release();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatch(/^canceled:/u);
    expect(isClean(list)).toBe(true);
  });

  it('should report a factory that returns the dragged item, whose disposer then removes it', async () => {
    const list = makeList(4);

    basicSortable(list, {
      placeholder: ({ item }) => item,
    });
    await grab('#r0');
    await release();
    expect(log).toEqual([]);
    expect(faults).toHaveLength(1);
    expect(order(list)).toBe('r1,r2,r3');
  });

  it('should move a factory result that is already in the document', async () => {
    const list = makeList(4);
    const existing = document.createElement('div');

    document.body.append(existing);
    onCleanup(() => {
      existing.remove();
    });
    basicSortable(list, { placeholder: () => existing });
    await grab('#r0');
    expect(existing.parentElement).toBe(list);
    await release();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(existing.parentElement).toBeNull();
  });

  it('should clear a stale slot when the item has none', async () => {
    const list = makeList(4);
    const stale = document.createElement('div');

    stale.slot = 'old';
    basicSortable(list, { placeholder: () => stale });
    await grab('#r0');
    expect(stale.hasAttribute('slot')).toBe(false);
    await release();
  });

  it('should hide the placeholder from assistive technology and mirror the slot', async () => {
    const list = makeList(3);

    list.attachShadow({ mode: 'open' }).innerHTML = '<slot name="rows"></slot>';

    for (const row of rowsOf(list)) {
      row.slot = 'rows';
    }

    basicSortable(list);
    await grab('#r0');

    const placeholder = list.querySelector('[data-drag-placeholder]')!;

    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
    expect(placeholder.getAttribute('slot')).toBe('rows');
    await commands.keyPress('Escape');
  });

  it('should keep a custom placeholder element and apply the mechanics', async () => {
    const list = makeList(3);
    const custom = document.createElement('section');

    custom.slot = 'stale';
    basicSortable(list, { placeholder: () => custom });
    await grab('#r0');
    expect(list.querySelector('[data-drag-placeholder]')).toBe(custom);
    expect(custom.hasAttribute('slot')).toBe(false);
    expect(custom.style.height).toBe('40px');
    await commands.keyPress('Escape');
    expect(custom.isConnected).toBe(false);
  });
});

describe('sortable options', () => {
  it('should honor handle: a press elsewhere does not admit', async () => {
    const list = makeList(3);

    for (const row of rowsOf(list)) {
      row.innerHTML =
        '<span class="grip" style="display:inline-block;width:40px;height:40px"></span>';
    }

    basicSortable(list, {
      handle: (item) => item.querySelector('.grip'),
    });

    const row = document.querySelector('#r0')!.getBoundingClientRect();

    await commands.pointerMove(row.left + 120, row.top + 20);
    await commands.pointerDown();
    await commands.pointerMove(row.left + 120, row.top + 60, 3);
    await release();
    expect(log).toEqual([]);
    await dragAndDrop('#r0 .grip', 45);
    expect(log).toEqual(['start', 'end:accepted']);
  });

  it('should refuse a press through data-drag-ignore', async () => {
    const list = makeList(3);

    document.querySelector('#r0')!.innerHTML =
      '<span id="owned" data-drag-ignore style="display:block;height:40px">owned</span>';
    basicSortable(list);
    await dragAndDrop('#owned', 60);
    expect(log).toEqual([]);
  });

  it('should honor visual: the named node is lifted and the item stays', async () => {
    const list = makeList(3);

    for (const row of rowsOf(list)) {
      row.innerHTML = '<div class="body" style="height:40px"></div>';
    }

    const body = document.querySelector<HTMLElement>('#r0 .body')!;

    basicSortable(list, {
      visual: (item) => item.querySelector<HTMLElement>('.body')!,
    });
    await grab('#r0', 0, 20);
    expect(body.matches(':popover-open')).toBe(true);
    expect(document.querySelector('#r0')!.matches(':popover-open')).toBe(false);
    await commands.keyPress('Escape');
  });

  it('should honor box: a box around the visual keeps the rest of its footprint', async () => {
    const list = makeList(3);
    const row = document.querySelector<HTMLElement>('#r0')!;

    row.style.height = 'auto';
    row.innerHTML =
      '<div class="head" style="height:30px"></div><div class="tail" style="height:10px"></div>';

    basicSortable(list, {
      visual: (item) =>
        item === row ? row.querySelector<HTMLElement>('.head')! : item,
      box: (item) => item,
    });
    await grab(row, 0, 15);
    expect(
      list.querySelector<HTMLElement>('[data-drag-placeholder]')!.style.height,
    ).toBe('30px');
    await commands.keyPress('Escape');
  });

  it('should honor box: a box inside the visual sizes the whole footprint', async () => {
    const list = makeList(3);
    const row = document.querySelector<HTMLElement>('#r0')!;

    row.style.height = 'auto';
    row.innerHTML = '<div class="head" style="height:30px"></div>';

    basicSortable(list, {
      box: (item) =>
        item === row ? row.querySelector<HTMLElement>('.head')! : item,
    });
    await grab(row, 0, 15);
    expect(
      list.querySelector<HTMLElement>('[data-drag-placeholder]')!.style.height,
    ).toBe('30px');
    await commands.keyPress('Escape');
  });

  it('should resolve a grid with xy()', async () => {
    const list = makeList(
      6,
      document.body,
      'display:flex;flex-wrap:wrap;width:300px',
    );

    for (const row of rowsOf(list)) {
      row.style.cssText = 'width:100px;height:60px;touch-action:none';
    }

    basicSortable(list, { axis: xy() });

    const target = centerOf('#r4');
    const start = centerOf('#r0');

    await grab('#r0', (target.x - start.x) / 2, (target.y - start.y) / 2);
    await moveHeld(target.x + 5, target.y + 5);
    await release();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(rowsOf(list).indexOf(document.querySelector('#r0')!)).toBe(4);
  });

  it('should animate displaced rows with layoutAnimation, in xy() too', async () => {
    const list = makeList(
      6,
      document.body,
      'display:flex;flex-wrap:wrap;width:300px',
    );

    for (const row of rowsOf(list)) {
      row.style.cssText = 'width:100px;height:60px;touch-action:none';
    }

    basicSortable(list, {
      axis: xy(),
      displacement: layoutAnimation({ duration: 3000 }),
    });

    const start = centerOf('#r0');

    await grab('#r0', 60, 0);
    await moveHeld(start.x + 120, start.y);
    await frames(2);

    const running = rowsOf(list).reduce(
      (sum, row) => sum + row.getAnimations().length,
      0,
    );

    expect(running).toBeGreaterThan(0);
    await commands.keyPress('Escape');
  });

  it('should keep a row animation past the terminal, until destruction', async () => {
    const list = makeList(4);
    const controller = basicSortable(list, {
      displacement: layoutAnimation({ duration: 3000 }),
    });
    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await commands.pointerMove(start.x, start.y + 62, 3);
    await frames(3);
    await commands.pointerMove(start.x, start.y + 65);
    await frames(3);
    await release();

    const count = (): number =>
      rowsOf(list).reduce((sum, row) => sum + row.getAnimations().length, 0);

    expect(count()).toBeGreaterThan(0);
    await controller.requestDestroy();
    expect(count()).toBe(0);
  });

  it('should re-measure on scroll during a drag, nested scrollers included', async () => {
    const outer = document.createElement('div');

    outer.style.cssText = 'height:300px;overflow:auto';

    const inner = document.createElement('div');

    inner.style.cssText = 'height:200px;overflow:auto;margin-bottom:400px';
    outer.append(inner);
    document.body.append(outer);

    const list = makeList(20, inner);

    basicSortable(list);

    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await frames();
    inner.scrollTop = 200;
    await frames();
    await moveHeld(start.x, start.y + 30);
    await release();
    // The pointer is over the row scrolled to that height: r5 is at 200 + 30 + 20.
    expect(
      rowsOf(list).indexOf(document.querySelector('#r0')!),
    ).toBeGreaterThan(4);

    log.length = 0;
    outer.scrollTop = 0;
    inner.scrollTop = 0;
    await frames();

    const second = await press('#r1');

    await commands.pointerMove(second.x, second.y + 20, 2);
    await frames();
    outer.scrollTop = 100;
    await frames();
    await moveHeld(second.x, second.y + 21);
    await release();
    expect(log).toEqual(['start', 'end:accepted']);
  });

  it('should ignore a second pointer during a drag', async () => {
    const list = makeList(4);

    basicSortable(list);

    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    list.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: false,
        pointerId: 77,
        clientX: 5,
        clientY: 5,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: false,
        pointerId: 77,
      }),
    );
    expect(log).toEqual(['start']);
    await release();
    expect(log).toEqual(['start', 'end:noop']);
  });
});
