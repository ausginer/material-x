/** `drag:DRI-7`: faults. */
import { describe, expect, it } from 'vitest';
import type { Outcome } from '../src/draggable.ts';
import { DragFault } from '../src/fault.ts';
import {
  dragAndDrop,
  faults,
  faultMessages,
  frames,
  grab,
  isClean,
  log,
  makeList,
  managed,
  onCleanup,
  release,
  targetOf,
} from './support/harness.ts';

describe('drag:DRI-7 faults', () => {
  it('should cancel once with a fault when move throws, and let the terminal run', async () => {
    const list = makeList(2);
    const ended: string[] = [];

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      move() {
        throw new Error('move');
      },
      end(_drag, outcome) {
        ended.push(
          `${outcome.type}:${(outcome as { origin?: string }).origin}`,
        );
      },
    });
    await dragAndDrop('#r0', 30);
    expect(ended).toEqual(['canceled:fault']);
    expect(faultMessages()).toEqual(['move']);
  });

  it('should report two faults in one pass once each, and let the first decide', async () => {
    const list = makeList(4);
    const first = new Error('first');
    const second = new Error('second');

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use(() => {
          throw second;
        });
      },
      start() {
        throw first;
      },
      end(_, outcome) {
        const canceled = outcome as Extract<Outcome, { type: 'canceled' }>;

        log.push(
          `${canceled.origin}:${(canceled.reason as DragFault).cause === first}:${canceled.reason === faults[0]}`,
        );
      },
    });
    await grab('#r0');
    await release();
    expect(log).toEqual(['fault:true:true']);
    expect(faultMessages()).toEqual(['first', 'second']);
  });

  it('should report disposer throws during destruction once each', async () => {
    const list = makeList(4);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use(() => {
          throw new Error('disposer 1');
        });
        drag.use(() => {
          throw new Error('disposer 2');
        });
      },
      end: () => {
        log.push('end');
      },
    });

    panel.use(() => {
      throw new Error('controller use');
    });
    await grab('#r0');
    await panel.requestDestroy();
    log.push('destroyed');
    expect(log).toEqual(['destroyed']);
    expect(faultMessages()).toEqual([
      'disposer 2',
      'disposer 1',
      'controller use',
    ]);
  });

  it('should deliver every hostile value once, typed, with cause identity', () => {
    const hostile = {
      get message(): string {
        throw new Error('getter');
      },
    };
    const proxy = new Proxy(
      {},
      {
        get() {
          throw new Error('proxy');
        },
      },
    );
    const values: unknown[] = [
      new Error('plain'),
      null,
      undefined,
      'text',
      Symbol('symbol'),
      Object.freeze(new Error('frozen')),
      hostile,
      proxy,
    ];
    const results = values.map((value) => {
      faults.length = 0;

      const root = document.createElement('div');

      document.body.append(root);

      const panel = managed(root, {
        admit() {
          throw value;
        },
      });

      root.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
      );
      void panel.requestDestroy();

      return (
        faults.length === 1 &&
        faults[0] instanceof DragFault &&
        faults[0].cause === value &&
        typeof faults[0].message === 'string'
      );
    });

    expect(results).toEqual(values.map(() => true));
  });

  it('should include the original message when it can be read', () => {
    expect(new DragFault(new Error('readable')).message).toContain('readable');
  });

  it('should leave origin fault when a global listener requests cancel', async () => {
    const list = makeList(4);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      start() {
        throw new Error('boom');
      },
      end(_, outcome) {
        const canceled = outcome as Extract<Outcome, { type: 'canceled' }>;

        log.push(`${canceled.origin}:${canceled.reason === faults[0]}`);
      },
    });
    const listener = (): void => {
      panel.requestCancel('from the listener');
    };

    addEventListener('error', listener);
    onCleanup(() => {
      removeEventListener('error', listener);
    });
    await grab('#r0');
    await release();
    expect(log).toEqual(['fault:true']);
  });

  it('should deliver no terminal when a global listener requests destruction', async () => {
    const list = makeList(4);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      start() {
        log.push('start');
        throw new Error('boom');
      },
      end: () => {
        log.push('end');
      },
    });
    const listener = (): void => {
      void panel.requestDestroy().then(() => log.push('destroyed'));
    };

    addEventListener('error', listener);
    onCleanup(() => {
      removeEventListener('error', listener);
    });
    await grab('#r0');
    await release();
    expect(log).toEqual(['start', 'destroyed']);
    expect(isClean(list)).toBe(true);
  });

  it('should keep the outcome when a later fault is reported', async () => {
    const list = makeList(2);
    const outcomes: Outcome[] = [];

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      settle() {
        throw new Error('settle');
      },
      end(_, outcome) {
        outcomes.push(outcome);
      },
    });
    await dragAndDrop('#r0', 30);
    expect(outcomes).toEqual([{ type: 'skipped' }]);
    expect(faultMessages()).toEqual(['settle']);
  });

  it('should report a platform throw and keep the controller: a hidden visual has no box', async () => {
    const list = makeList(3);
    const { lift } = await import('../src/lift.ts');

    managed(list, {
      lift,
      admit: (event) => ({ item: targetOf(event) }),
      start: () => {
        log.push('start');
      },
    });

    const row = document.querySelector<HTMLElement>('#r0')!;
    const { x, y } = row.getBoundingClientRect();
    const { commands } = await import('./support/harness.ts');

    await commands.pointerMove(x + 10, y + 10);
    await commands.pointerDown();
    row.style.display = 'none';
    await commands.pointerMove(x + 10, y + 40, 3);
    await release();
    expect(log).toEqual([]);
    expect(faults).toHaveLength(1);
    row.style.display = '';
    await dragAndDrop('#r1', 30);
    expect(log).toEqual(['start']);
    await frames();
  });
});
