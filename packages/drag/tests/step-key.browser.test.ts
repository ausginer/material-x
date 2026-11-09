/**
 * The step-key model on `drag/step-key-model`: `requestStep(step, key = step)`.
 * Not adopted, and the contract does not describe it.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BehaviorOperation, Drag } from '../src/draggable.ts';
import { FreeDragResolution, freeDrag } from '../src/free-drag.ts';
import { y } from '../src/sortable/y.ts';
import {
  basicSortable,
  dragAndDrop,
  faultMessages,
  grab,
  log,
  makeList,
  managed,
  onCleanup,
  release,
  rowsOf,
  targetOf,
} from './support/harness.ts';

/** An operation that names its item. */
interface Named extends BehaviorOperation {
  readonly item: HTMLElement;
}

/** A controller whose `start` hook runs `start` with the operation's `Drag`. */
async function inStart(
  start: (drag: Drag<Named>) => void,
): Promise<Drag<Named>> {
  const list = makeList(2);
  let kept: Drag<Named> | null = null;

  managed<undefined, unknown, Named>(list, {
    admit: (event) => ({ item: targetOf(event) }),
    activate: (drag) => {
      kept = drag;
      return {
        item: drag.item,
        start() {
          start(drag);
          log.push('start finished');
        },
      };
    },
  });

  await grab('#r0');
  return kept!;
}

describe('step-key model: deduplication by key', () => {
  it('should run the first request for a key, with the values its step captured', async () => {
    const key = {};
    const created: number[] = [];

    await inStart((drag) => {
      for (const value of [1, 2, 3]) {
        created.push(value);
        drag.requestStep((operation) => {
          log.push(`${value}:${operation?.item.id ?? null}`);
        }, key);
      }
    });

    // Every closure was created, and only the first ran.
    expect(created).toEqual([1, 2, 3]);
    expect(log).toEqual(['start finished', '1:r0']);
    await release();
  });

  it('should keep the default key as the step, so one function coalesces', async () => {
    function step(): void {
      log.push('step');
    }

    await inStart((drag) => {
      drag.requestStep(step);
      drag.requestStep(step);
      // An explicit key equal to a waiting step is that step's key.
      drag.requestStep(() => {
        log.push('dropped');
      }, step);
    });

    expect(log).toEqual(['start finished', 'step']);
    await release();
  });

  it('should keep different keys apart, even for one function', async () => {
    const a = {};
    const b = {};

    function step(): void {
      log.push('step');
    }

    await inStart((drag) => {
      drag.requestStep(step, a);
      drag.requestStep(step, b);
      drag.requestStep(step);
      drag.requestStep(step, a);
    });

    expect(log).toEqual(['start finished', 'step', 'step', 'step']);
    await release();
  });

  it('should keep instances apart when each keys its closure by itself', async () => {
    class Counter {
      readonly name: string;

      constructor(name: string) {
        this.name = name;
      }

      request(drag: Drag<Named>): void {
        drag.requestStep(() => {
          log.push(this.name);
        }, this);
      }
    }

    const a = new Counter('a');
    const b = new Counter('b');

    await inStart((drag) => {
      a.request(drag);
      b.request(drag);
      a.request(drag);
      b.request(drag);
    });

    expect(log).toEqual(['start finished', 'a', 'b']);
    await release();
  });

  it('should run unkeyed closures in request order, each once', async () => {
    await inStart((drag) => {
      for (const value of [1, 2, 3]) {
        drag.requestStep(() => {
          log.push(`${value}`);
        });
      }
    });

    expect(log).toEqual(['start finished', '1', '2', '3']);
    await release();
  });
});

describe('step-key model: execution', () => {
  it('should call a step with no receiver, at once while idle and later in a pass', async () => {
    const contexts: unknown[] = [];
    const holder = {};

    function record(this: unknown): void {
      contexts.push(this);
    }

    const list = makeList(2);
    const panel = managed<undefined, unknown, Named>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        item: drag.item,
        start() {
          drag.requestStep(record, holder);
        },
      }),
    });

    panel.requestStep(record, holder);
    expect(contexts).toEqual([undefined]);
    await grab('#r0');
    expect(contexts).toEqual([undefined, undefined]);
    await release();
  });

  it('should not keep the key of a step requested while idle', () => {
    const key = {};
    const panel = managed(makeList(1), {
      admit: () => null,
      activate: () => null,
    });

    panel.requestStep((operation) => {
      log.push(operation === null ? 'idle:null' : 'idle:operation');
      // The idle step runs as its pass's first step, so its key is not waiting.
      panel.requestStep(() => {
        log.push('again');
      }, key);
    }, key);

    expect(log).toEqual(['idle:null', 'again']);
  });

  it('should run a key again when its running step requests it, and coalesce while it waits', async () => {
    const key = {};
    let left = 2;

    await inStart((drag) => {
      const step = (): void => {
        log.push(`loop:${left}`);
        left -= 1;

        if (left > 0) {
          // A new closure each time: the key decides, not the function.
          drag.requestStep(() => {
            step();
          }, key);
          drag.requestStep(() => {
            log.push('dropped');
          }, key);
        }
      };

      drag.requestStep(step, key);
    });

    expect(log).toEqual(['start finished', 'loop:2', 'loop:1']);
    await release();
  });

  it('should take a throwing step off with its key, so its key runs again later', async () => {
    const key = {};

    await inStart((drag) => {
      drag.requestStep(() => {
        throw new Error('first');
      }, key);
      drag.requestStep(() => {
        log.push('dropped');
      }, key);
      drag.requestStep(() => {
        drag.requestStep(() => {
          log.push('after the throw');
        }, key);
      });
    });

    expect(faultMessages()).toEqual(['first']);
    expect(log).toEqual(['start finished', 'after the throw']);
  });
});

describe('step-key model: scope and destruction', () => {
  it('should keep precedence: a waiting keyed step behind destruction does not run', async () => {
    const key = {};
    const list = makeList(2);
    const panel = managed(list, { admit: () => null, activate: () => null });

    panel.requestStep(() => {
      panel.requestStep(() => {
        log.push('dropped');
      }, key);
      void panel.requestDestroy();
    });
    await panel.requestDestroy();

    panel.requestStep(() => {
      log.push('after');
    }, key);
    expect(log).toEqual([]);
  });

  it('should leave a keyed step requested from a disposer during teardown unrun', async () => {
    const key = {};
    const panel = managed(makeList(1), {
      admit: () => null,
      activate: () => null,
    });

    panel.use(() => {
      panel.requestStep(() => {
        log.push('dropped');
      }, key);
    });
    await panel.requestDestroy();
    expect(log).toEqual([]);
  });

  it('should scope a keyed step to its operation', async () => {
    const list = makeList(3);
    const kept: Array<Drag<Named>> = [];
    const key = {};
    const request = (drag: Drag<Named>, name: string): void => {
      drag.requestStep((operation) => {
        log.push(`${name}:${operation?.item.id ?? null}`);
      }, key);
    };

    managed<undefined, unknown, Named>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        kept.push(drag);
        return { item: drag.item };
      },
    });

    await dragAndDrop('#r0', 40);
    request(kept[0]!, 'ended');
    expect(log).toEqual([]);
    await grab('#r2');
    request(kept[0]!, 'ended');
    request(kept[1]!, 'current');
    expect(log).toEqual(['current:r2']);
    await release();
  });
});

describe('step-key model: the converted call sites', () => {
  it("should run freeDrag's invalidate step once for two calls, between moveTo calls kept in order", async () => {
    const element = document.createElement('div');
    let invalidations = 0;
    let counted = 0;

    element.style.cssText =
      'position:absolute;left:0;top:0;width:50px;height:50px;touch-action:none';
    document.body.append(element);

    const controller = freeDrag(element, {
      bounds: () => ({
        apply() {
          // Unconstrained.
        },
        invalidate() {
          invalidations += 1;
        },
      }),
      onStart() {
        invalidations = 0;
        controller.moveTo({ x: 100, y: 100 });
        controller.invalidate();
        controller.moveTo({ x: 200, y: 200 });
        controller.invalidate();
        // Read at the end of the pass, before any scroll or resize the lift causes.
        queueMicrotask(() => {
          counted = invalidations;
        });
      },
      onDrop: () => FreeDragResolution.accept(),
    });

    onCleanup(() => controller.requestDestroy());
    await grab(element);
    // One step, which invalidates the bounds itself and through the operation's
    // `handleEvent`. Two steps would make it 4.
    expect(counted).toBe(2);
    expect(element.getBoundingClientRect().left).toBeCloseTo(200, 0);
  });

  it("should keep sortable's collection and geometry keys apart, each coalesced", async () => {
    const list = makeList(4);
    const geometry = y()();
    const invalidate = vi.spyOn(geometry, 'invalidate');
    let pulls = 0;
    let counted = { pulls: 0, axis: 0 };
    const controller = basicSortable(list, {
      axis: () => geometry,
      items() {
        pulls += 1;
        return rowsOf(list);
      },
      onStart() {
        pulls = 0;
        invalidate.mockClear();
        controller.invalidate();
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
        controller.invalidate();
        queueMicrotask(() => {
          counted = { pulls, axis: invalidate.mock.calls.length };
        });
      },
    });

    await grab('#r0');
    // One pull, the rebase's own axis invalidation, and one geometry step.
    expect(counted).toEqual({ pulls: 1, axis: 2 });
    await release();
  });
});
