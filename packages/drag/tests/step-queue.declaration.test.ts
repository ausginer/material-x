/**
 * The typing of receiver-aware `requestStep` on `drag/step-queue-model`. Not
 * adopted. Checked by `tsc`, with no run.
 */
import { describe, it } from 'vitest';
import {
  draggable,
  type BehaviorOperation,
  type Drag,
} from '../src/draggable.ts';

const root = document.createElement('div');

/** A step that declares its receiver, and one that does not. */
class Holder {
  count = 0;

  /** A public method, to show what the lint reports at its call site. */
  bump(this: Holder, operation: BehaviorOperation | null): void {
    this.count += operation ? 1 : 0;
  }

  request(drag: Drag): void {
    drag.requestStep(this.#bumpDeclared, this);
    // @ts-expect-error A step that declares its receiver needs one.
    drag.requestStep(this.#bumpDeclared);
    // @ts-expect-error The receiver must be the step's `this` type.
    drag.requestStep(this.#bumpDeclared, { count: 0 } as object);

    // The gap: a method with no `this` parameter is accepted with no receiver,
    // and reads `this` as `undefined` when it runs. Neither `tsc` nor
    // `unbound-method` reports a private method passed this way.
    drag.requestStep(this.#bumpUndeclared);
    drag.requestStep(this.#bumpUndeclared, this);
  }

  #bumpDeclared(this: Holder): void {
    this.count += 1;
  }

  #bumpUndeclared(): void {
    this.count += 1;
  }
}

describe('step-queue model: receiver typing', () => {
  it('should check a declared receiver at a Drag and at the controller', () => {
    const holder = new Holder();
    const panel = draggable(root, {
      admit: () => null,
      activate(drag) {
        holder.request(drag);
        return null;
      },
    });

    // A public method needs a line-scoped disable even with its receiver:
    // `unbound-method` does not read the second argument.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called on `holder`, passed with it
    panel.requestStep(holder.bump, holder);
    // @ts-expect-error A step that declares its receiver needs one.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the type error is the point
    panel.requestStep(holder.bump);
  });

  it('should keep a receiver-free step as it was', () => {
    const panel = draggable(root, { admit: () => null, activate: () => null });

    panel.requestStep((operation) => {
      void operation;
    });
    panel.requestStep(function step(this: unknown) {
      void this;
    });
  });
});
