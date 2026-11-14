/**
 * `drag:DRD-35`, `drag:DRI-8`, `drag:DRI-9` and `drag:DRI-10`: the typing of
 * `requestStep` and `use` with a receiver. Checked by `tsc`, with no run.
 */
import { assertType, describe, it } from 'vitest';
import {
  draggable,
  type BehaviorOperation,
  type Drag,
  type DraggableController,
  type Outcome,
} from '../src/draggable.ts';
import type {
  DisplacementSink,
  InsertionGeometry,
} from '../src/sortable/axis.ts';

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
    // and reads `this` as `undefined` when it runs. Typecheck doesn't report it,
    // and lint doesn't check this package for it (drag:DRD-37).
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

/** A step that declares an `unknown` receiver, so it needs none. */
function unknownReceiverStep(this: unknown): void {
  assertType(this);
}

describe('drag:DRI-8 requestStep receiver typing', () => {
  it('should check a declared receiver at a Drag and at the controller', () => {
    const holder = new Holder();
    const panel = draggable(root, {
      admit: () => null,
      activate(drag) {
        holder.request(drag);
        return null;
      },
    });

    panel.requestStep(holder.bump, holder);
    // @ts-expect-error A step that declares its receiver needs one.
    panel.requestStep(holder.bump);
  });

  it('should keep a receiver-free step as it was', () => {
    const panel = draggable(root, { admit: () => null, activate: () => null });

    panel.requestStep((operation) => {
      assertType(operation);
    });
    panel.requestStep(unknownReceiverStep);
  });
});

/** Cleanup that declares its receiver. */
class Resource {
  released = false;

  request(drag: Drag): void {
    drag.use(this.#release, this);
    // @ts-expect-error Cleanup that declares its receiver needs one.
    drag.use(this.#release);
    // @ts-expect-error The receiver must be the cleanup's `this` type.
    drag.use(this.#release, { released: false } as object);
    // @ts-expect-error Operation cleanup receives an outcome, not an operation.
    drag.use(this.#step, this);
  }

  #release(this: Resource, outcome: Outcome | null): void {
    this.released = outcome !== null;
  }

  #step(this: Resource, operation: BehaviorOperation | null): void {
    this.released = operation === null;
  }
}

describe('drag:DRI-9 and drag:DRI-10 use receiver typing', () => {
  it('should check a declared receiver at a Drag and at the controller', () => {
    const resource = new Resource();
    const panel = draggable(root, {
      admit: () => null,
      activate(drag) {
        resource.request(drag);
        return null;
      },
    });
    const sink = {
      retired: false,
      retire(this: { retired: boolean }): void {
        this.retired = true;
      },
    };

    panel.use(sink.retire, sink);
    // @ts-expect-error Cleanup that declares its receiver needs one.
    panel.use(sink.retire);
    panel.use(() => {
      sink.retired = true;
    });
  });
});

/** A step and a disposer that declare a primitive receiver. */
function step(this: number, operation: BehaviorOperation | null): void {
  assertType(operation);
}

function dispose(this: string): void {
  assertType(this);
}

describe('drag:DRD-35 the receiver is an object', () => {
  it('should refuse a primitive receiver at a Drag', () => {
    draggable(root, {
      admit: () => null,
      activate(drag) {
        // @ts-expect-error A receiver is an object.
        drag.requestStep(step, 1);
        // @ts-expect-error A receiver is an object.
        drag.use(dispose, 'receiver');
        return null;
      },
    });
  });

  it('should refuse a primitive receiver at the controller', () => {
    const panel = draggable(root, { admit: () => null, activate: () => null });

    // @ts-expect-error A receiver is an object.
    panel.requestStep(step, 1);
    // @ts-expect-error A receiver is an object.
    panel.use(dispose, 'receiver');
  });
});

/** Passes each capability's `retire` alone, as `sortable` must not. */
function passAlone(
  drag: Drag,
  controller: DraggableController<BehaviorOperation>,
  geometry: InsertionGeometry,
  sink: DisplacementSink,
): void {
  // @ts-expect-error `retire` declares the axis as its receiver.
  drag.use(geometry.retire);
  // @ts-expect-error `retire` declares the sink as its receiver.
  controller.use(sink.retire);
}

describe('drag:DRD-35 capabilities declare their receiver', () => {
  it('should refuse the axis and the sink passed to use without their receiver', () => {
    assertType(passAlone);
  });
});
