/**
 * The typing of `requestStep(step, key = step)` on `drag/step-key-model`. Not
 * adopted. Checked by `tsc`, with no run.
 */
import { describe, it } from 'vitest';
import {
  draggable,
  type BehaviorOperation,
  type Drag,
} from '../src/draggable.ts';

const root = document.createElement('div');

/** An operation that names itself. */
interface Named extends BehaviorOperation {
  readonly name: string;
}

/** One task on an object, requested in the two ways a key allows. */
class Holder {
  count = 0;

  bump(operation: Named | null): void {
    this.count += operation ? 1 : 0;
  }

  request(drag: Drag<Named>): void {
    const step = (operation: Named | null): void => {
      this.bump(operation);
    };

    // A closure keyed by its object: no lint disable and no `this` typing.
    drag.requestStep(step, this);
    // The method as the key is never called, yet `unbound-method` reports it.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- a key, never called
    drag.requestStep(step, this.bump);
  }
}

describe('step-key model: requestStep key typing', () => {
  it('should accept an object or a function as the key, and no primitive', () => {
    const holder = new Holder();
    const panel = draggable<undefined, unknown, Named>(root, {
      admit: () => null,
      activate(drag) {
        const step = (operation: Named | null): void => {
          void operation?.name;
        };

        holder.request(drag);
        drag.requestStep(step);
        drag.requestStep(step, undefined);
        drag.requestStep(step, step);
        drag.requestStep(step, holder);
        drag.requestStep(step, root);
        // @ts-expect-error A string key could collide across capabilities.
        drag.requestStep(step, 'invalidate');
        // @ts-expect-error A symbol is not an object.
        drag.requestStep(step, Symbol('invalidate'));
        // @ts-expect-error `null` is not a key, and does not select the default.
        drag.requestStep(step, null);
        return null;
      },
    });
    const key = {};

    panel.requestStep((operation) => {
      void operation?.name;
    }, key);
    // @ts-expect-error The controller's key has the same type.
    panel.requestStep(() => {}, 1);
  });

  it('should not tell a shared key or a value-capturing closure from a correct one', () => {
    const panel = draggable<undefined, unknown, Named>(root, {
      admit: () => null,
      activate: () => null,
    });
    const shared = {};

    // Two tasks under one key typecheck, and the second is dropped while the
    // first waits.
    panel.requestStep(() => {}, shared);
    panel.requestStep(() => {}, shared);

    // A keyed closure that captures a value typechecks, and only the first
    // request's value runs. An unkeyed one runs every request, in order.
    for (const x of [1, 2]) {
      panel.requestStep((operation) => {
        void [operation, x];
      }, shared);
    }
  });
});
