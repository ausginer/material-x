/** `drag:DRD-30`: the operation `activate` returns, through its lifecycle rows. */
import { describe, expect, it } from 'vitest';
import type { BehaviorOperation, Outcome } from '../src/draggable.ts';
import {
  dragAndDrop,
  faultMessages,
  grab,
  log,
  makeList,
  managed,
  release,
  targetOf,
} from './support/harness.ts';

/** An operation that logs every hook it is given. */
function logging(): BehaviorOperation {
  return {
    start() {
      log.push('start');
    },
    settle(outcome) {
      log.push(`settle:${outcome.type}`);
    },
    end(outcome) {
      log.push(`end:${outcome.type}`);
    },
  };
}

class Failing implements BehaviorOperation {
  constructor() {
    throw new Error('constructor');
  }

  // oxlint-disable-next-line class-methods-use-this -- a hook the kernel would call as a method
  start(): void {
    log.push('start');
  }
}

describe('drag:DRD-30 operation lifecycle', () => {
  it('should release a partial acquisition with the outcome when activate declines', async () => {
    const list = makeList(2);
    const outcomes: Array<Outcome | null> = [];

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use((outcome) => {
          outcomes.push(outcome);
        });

        const operation = logging();

        void operation;
        return null;
      },
    });
    await dragAndDrop('#r0', 30);
    expect(log).toEqual([]);
    expect(outcomes).toEqual([{ type: 'skipped' }]);
    expect(faultMessages()).toEqual([]);
  });

  it('should release with the fault when the operation constructor throws after a use', async () => {
    const list = makeList(2);
    const outcomes: Array<Outcome | null> = [];

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use((outcome) => {
          outcomes.push(outcome);
        });
        return new Failing();
      },
    });
    await dragAndDrop('#r0', 30);
    expect(log).toEqual([]);
    expect(outcomes.map((outcome) => outcome?.type)).toEqual(['canceled']);
    expect(faultMessages()).toEqual(['constructor']);
  });

  it.each(['declines', 'throws'] as const)(
    'should keep a cancel recorded in activate when activate then %s',
    async (ending) => {
      const list = makeList(2);
      const outcomes: Array<Outcome | null> = [];
      const panel = managed(list, {
        admit: (event) => ({ item: targetOf(event) }),
        activate(drag) {
          drag.use((outcome) => {
            outcomes.push(outcome);
          });
          panel.requestCancel('early');

          if (ending === 'throws') {
            throw new Error('after the cancel');
          }

          return null;
        },
      });

      await dragAndDrop('#r0', 30);
      expect(log).toEqual([]);
      expect(outcomes).toEqual([
        { type: 'canceled', reason: 'early', origin: 'request' },
      ]);
      expect(faultMessages()).toEqual(
        ending === 'throws' ? ['after the cancel'] : [],
      );
    },
  );

  it('should run a step requested in activate after it, with the returned operation', async () => {
    const list = makeList(2);
    const received: Array<BehaviorOperation | null> = [];
    let returned: BehaviorOperation | null = null;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.requestStep((operation) => {
          log.push('step');
          received.push(operation);
        });
        log.push('activate');
        returned = logging();
        return returned;
      },
    });
    await grab('#r0');
    expect(log).toEqual(['activate', 'start', 'step']);
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(returned);
    await release();
  });

  it('should give a step requested in activate null behind a cancel requested there', async () => {
    const list = makeList(2);
    const received: Array<BehaviorOperation | null> = [];

    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.requestStep((operation) => {
          received.push(operation);
        });
        panel.requestCancel('early');
        return logging();
      },
    });
    await grab('#r0');
    expect(received).toEqual([null]);
    await release();
  });

  it('should start, settle and end with a cancel requested in activate', async () => {
    const list = makeList(2);
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate() {
        panel.requestCancel('early');
        return logging();
      },
    });

    await grab('#r0');
    expect(log).toEqual(['start', 'settle:canceled', 'end:canceled']);
    await release();
  });
});
