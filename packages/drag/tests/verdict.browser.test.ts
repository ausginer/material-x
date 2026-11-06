/** `drag:DRI-5`: the verdict. */
import { describe, expect, it } from 'vitest';
import type { Outcome } from '../src/draggable.ts';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  commands,
  dragAndDrop,
  faults,
  faultMessages,
  frames,
  grab,
  isClean,
  log,
  makeList,
  managed,
  rejections,
  release,
  targetOf,
  wait,
} from './support/harness.ts';

type Pending = Readonly<{
  resolve(value: ReorderResolution): void;
  reject(reason: unknown): void;
}>;

function holdingVerdicts(extra: Record<string, unknown> = {}) {
  const list = makeList(5);
  const pending: Pending[] = [];
  const signals: AbortSignal[] = [];
  const controller = basicSortable(list, {
    onReorder: (_, { signal }) => {
      signals.push(signal);
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
      });
    },
    ...extra,
  });

  return { list, pending, signals, controller };
}

const settleLate = (entry: Pending, how: 'resolve' | 'reject'): void => {
  if (how === 'resolve') {
    entry.resolve(ReorderResolution.accept());
  } else {
    entry.reject(new Error('late'));
  }
};

describe('drag:DRI-5 verdict', () => {
  it.each(['resolve', 'reject'] as const)(
    'should keep a late %s after a cancel from reaching the next drag',
    async (how) => {
      const { pending, signals } = holdingVerdicts();

      await dragAndDrop('#r0', 90);
      await commands.keyPress('Escape');
      await frames();
      expect(log).toEqual(['start', 'end:canceled']);
      expect(signals[0]!.aborted).toBe(true);

      await grab('#r1');
      settleLate(pending[0]!, how);
      await wait(100);
      expect(log).toEqual(['start', 'end:canceled', 'start']);
      expect(faults).toEqual([]);
      expect(rejections).toEqual([]);
      await commands.keyPress('Escape');
    },
  );

  it.each(['resolve', 'reject'] as const)(
    'should let a late %s after destruction reach nothing',
    async (how) => {
      const { list, pending, signals, controller } = holdingVerdicts();

      await dragAndDrop('#r0', 90);
      await controller.requestDestroy();
      expect(signals[0]!.aborted).toBe(true);
      settleLate(pending[0]!, how);
      await wait(100);
      expect(log).toEqual(['start']);
      expect(faults).toEqual([]);
      expect(rejections).toEqual([]);
      expect(isClean(list)).toBe(true);
    },
  );

  it('should not abort the signal on acceptance', async () => {
    const list = makeList(4);
    const signals: AbortSignal[] = [];

    basicSortable(list, {
      onReorder({ item, next }, { signal }) {
        signals.push(signal);
        list.insertBefore(item, next);
        return Promise.resolve(ReorderResolution.accept());
      },
    });
    await dragAndDrop('#r0', 90);
    await frames();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(signals[0]!.aborted).toBe(false);
  });

  it('should abort drag.signal at release while the verdict signal stays live', async () => {
    const list = makeList(3);
    let dragSignal: AbortSignal | null = null;
    let verdictSignal: AbortSignal | null = null;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      start(drag) {
        dragSignal = drag.signal;
      },
      drop: () => (signal) => {
        verdictSignal = signal;
        return 'yes';
      },
    });
    await dragAndDrop('#r0', 30);
    expect(dragSignal!.aborted).toBe(true);
    expect(verdictSignal!.aborted).toBe(false);
    expect(dragSignal).not.toBe(verdictSignal);
  });

  it('should read then once, and take the first completion', async () => {
    const list = makeList(2);
    let reads = 0;
    const outcomes: Array<Outcome<string>> = [];

    managed<undefined, string>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      drop: () => () =>
        ({
          get then() {
            reads += 1;
            return (resolve: (value: string) => void) => {
              resolve('settled');
              resolve('again');
            };
          },
        }) as unknown as PromiseLike<string>,
      end(_, outcome) {
        outcomes.push(outcome);
      },
    });
    await dragAndDrop('#r0', 30);
    expect(outcomes).toEqual([{ type: 'verdict', value: 'settled' }]);
    expect(reads).toBe(1);
  });

  it.each([
    [
      'accessor',
      {
        get then() {
          throw new Error('accessor');
        },
      },
    ],
    [
      'call',
      {
        then() {
          throw new Error('call');
        },
      },
    ],
  ] as const)(
    'should treat a throwing then %s as a fault',
    async (name, value) => {
      const list = makeList(2);

      managed<undefined, string>(list, {
        admit: (event) => ({ item: targetOf(event) }),
        drop: () => () => value as unknown as PromiseLike<string>,
        end(_, outcome) {
          log.push(`end:${outcome.type}`);
        },
      });
      await dragAndDrop('#r0', 30);
      expect(faultMessages()).toEqual([name]);
      expect(log).toEqual(['end:canceled']);
    },
  );

  it('should deliver a thrown and a rejected verdict as the reported fault', async () => {
    const list = makeList(4);
    let round = 0;
    const results: string[] = [];

    basicSortable(list, {
      onReorder() {
        round += 1;

        if (round === 1) {
          throw new Error('thrown');
        }

        return Promise.reject(new Error('rejected'));
      },
      onEnd(result) {
        const { reason, origin } = result as {
          reason: { cause: Error };
          origin: string;
        };

        results.push(
          `${result.type}:${origin}:${reason.cause.message}:${(reason as unknown) === faults.at(-1)}`,
        );
      },
    });
    await dragAndDrop('#r0', 90);
    await dragAndDrop('#r0', 90);
    await frames();
    expect(results).toEqual([
      'canceled:fault:thrown:true',
      'canceled:fault:rejected:true',
    ]);
    expect(faults).toHaveLength(2);
    expect(rejections).toEqual([]);
  });

  it('should hold a verdict through a pending drop, then finish', async () => {
    const { list, pending } = holdingVerdicts({
      onEnd: undefined,
    });

    await dragAndDrop('#r0', 90);
    expect(list.querySelector('[data-drag-placeholder]')).not.toBeNull();
    pending[0]!.resolve(ReorderResolution.accept());
    await release();
    expect(list.querySelector('[data-drag-placeholder]')).toBeNull();
  });
});
