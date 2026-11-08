/**
 * `drag:DRI-8`: requests through a `Drag` act only while its operation is the
 * controller's current one, and a late disposer receives `null` only when
 * destruction released its operation.
 */
import { describe, expect, it } from 'vitest';
import type { BehaviorOperation, Drag, Outcome } from '../src/draggable.ts';
import {
  dragAndDrop,
  grab,
  log,
  makeList,
  managed,
  release,
  targetOf,
} from './support/harness.ts';

/** An operation that names its item, so a step can say which one it received. */
interface Named extends BehaviorOperation {
  readonly item: HTMLElement;
}

describe('drag:DRI-8 scoped requests', () => {
  it('should not run a step requested through a retained drag while a later operation is active', async () => {
    const list = makeList(3);
    const kept: Array<Drag<Named>> = [];
    const seen: Array<string | null> = [];

    managed<undefined, unknown, Named>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        kept.push(drag);
        return { item: drag.item };
      },
    });
    await dragAndDrop('#r0', 40);
    await grab('#r2');
    kept[0]!.requestStep((operation) => {
      seen.push(operation ? operation.item.id : null);
    });
    kept[0]!.requestCancel('stale');
    expect(seen).toEqual([]);

    // The current operation's own drag still reaches it.
    kept[1]!.requestStep((operation) => {
      seen.push(operation ? operation.item.id : null);
    });
    expect(seen).toEqual(['r2']);
    await release();
  });

  it('should not run a step requested through a retained drag while idle', async () => {
    const list = makeList(2);
    let kept: Drag | null = null;
    let ran = false;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        start() {
          kept = drag;
        },
      }),
    });
    await dragAndDrop('#r0', 40);
    kept!.requestStep(() => {
      ran = true;
    });
    expect(ran).toBe(false);
  });

  it('should give a late disposer the outcome after destruction of a concluded operation', async () => {
    const list = makeList(2);
    let kept: Drag | null = null;
    const seen: Array<Outcome | null> = [];
    const controller = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        start() {
          kept = drag;
        },
        end(outcome) {
          log.push(outcome.type);
        },
      }),
    });

    await dragAndDrop('#r0', 40);
    await controller.requestDestroy();
    kept!.use((outcome) => {
      seen.push(outcome);
    });
    expect(log).toEqual(['skipped']);
    expect(seen).toEqual([{ type: 'skipped' }]);
  });

  it('should give a late disposer null when destruction released its operation', async () => {
    const list = makeList(2);
    let kept: Drag | null = null;
    const seen: Array<Outcome | null> = [];
    const controller = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        start() {
          kept = drag;
        },
      }),
    });

    await grab('#r0');
    await controller.requestDestroy();
    kept!.use((outcome) => {
      seen.push(outcome);
    });
    await release();
    expect(seen).toEqual([null]);
  });
});
