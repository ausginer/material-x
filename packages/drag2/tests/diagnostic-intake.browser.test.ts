/**
 * **Diagnostic intake across application**, in both behaviors (R33).
 *
 * Every diagnostic a behavior produces — its own unwind steps and settlement
 * failure, and a composition installer's `context.report` — leaves through a
 * channel the kernel minted. The channel delivers until destruction is
 * **applied** and drops from then on, so the outcome depends on application
 * and on nothing a running unit can change:
 *
 * - teardown is silent: a retire hook that throws while destruction is applied
 *   reports nothing;
 * - a panic reports exactly once, by its own route;
 * - a captured `report` called after application is dropped;
 * - before application — at depth 0 on a live controller, in the interval
 *   between a request and its application, and while `draggable()` is still
 *   constructing — every report is delivered;
 * - a fault a slot raises in a unit that also requests destruction is delivered
 *   once, as a warning, before application: destruction discards its claim on
 *   the operation, so it decides no terminal and no `onEnd` follows.
 *
 * Each row drives the running controller, with no harness flag. The fixture is
 * one landing installer per behavior that keeps `context.report` and whose
 * `retire` throws.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { DraggableError, DraggableWarning } from '../src/drag.ts';
import {
  freeDrag,
  type FreeDragConfig,
  FreeDragResolution,
} from '../src/free-drag.ts';
import { FAILURE_ACTIVATION } from '../src/kernel/failures.ts';
import type { FeatureContext } from '../src/shared/composition.ts';
import { y } from '../src/sortable/y.ts';
import {
  ReorderResolution,
  type SortableConfig,
  sortable,
} from '../src/sortable.ts';

const POINTER_ID = 31;
const HOOK = new Error('retire-hook');

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0).reverse()) {
    dispose();
  }
});

/** One `onError` delivery, as `message<cause message>`. */
const describeError = (error: unknown): string => {
  const { message, cause } = error as Error;

  return cause instanceof Error ? `${message}<${cause.message}` : message;
};

type Fixture = Readonly<{
  /** The element a press lands on. */
  target: HTMLElement;
  controller: Readonly<{ requestDestroy(): Promise<void> }>;
  errors: unknown[];
  /** `onError` and `onEnd`, in delivery order. */
  log: string[];
  /** The `report` the installer kept. */
  report(error: unknown): void;
  /** How many times the throwing retire hook ran. */
  hooks(): number;
}>;

type Slots = Readonly<{
  onStart?(fixture: Fixture): void;
  onMove?(fixture: Fixture): void;
  /** Runs inside `onReorder` or `onDrop`, the round-trip's slot. */
  onResolve?(fixture: Fixture): void;
  onEnd?(fixture: Fixture): void;
  /** Runs inside `onError`, after the delivery is recorded. */
  onErrorDelivered?(fixture: Fixture): void;
  /** No landing installer, so nothing reports but the slot under test. */
  plain?: boolean;
  /** A second installer, which throws when installed. */
  throwing?: boolean;
  /** The `onError` collector, for a row whose construction never returns. */
  errors?: unknown[];
}>;

type Build = (slots?: Slots) => Fixture;

/** A landing installer that keeps `report` and whose `retire` throws. */
function hostileLanding(state: {
  report: ((error: unknown) => void) | null;
  hooks: number;
}) {
  return (context: FeatureContext) => {
    state.report = context.report;

    return {
      landingTiming: () => null,
      retire: (): void => {
        state.hooks += 1;
        throw HOOK;
      },
    };
  };
}

const buildSortable: Build = (slots = {}) => {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < 3; i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: '40px',
    });
    root.append(item);
    items.push(item);
  }

  const state = { report: null as ((error: unknown) => void) | null, hooks: 0 };
  const errors = slots.errors ?? [];
  const log: string[] = [];
  let fixture!: Fixture;
  const config: SortableConfig = {
    items: () => items,
    axis: y(),
    onReorder: () => {
      slots.onResolve?.(fixture);
      return ReorderResolution.accept();
    },
    onStart: (): void => {
      slots.onStart?.(fixture);
    },
    onEnd: ({ type }): void => {
      log.push(`onEnd ${type}`);
      slots.onEnd?.(fixture);
    },
    onError: (error): void => {
      errors.push(error);
      log.push('onError');
      slots.onErrorDelivered?.(fixture);
    },
    ...(slots.plain ? {} : { landing: hostileLanding(state) }),
    ...(slots.throwing
      ? {
          displacement: () => {
            throw new Error('installer');
          },
        }
      : {}),
  };

  cleanup.push(() => {
    root.remove();
  });

  const controller = sortable(root, config);

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};
  cleanup.push(() => {
    void controller.requestDestroy();
  });

  fixture = {
    target: items[0]!,
    controller,
    errors,
    log,
    report: (error) => {
      state.report!(error);
    },
    hooks: () => state.hooks,
  };

  return fixture;
};

const buildFreeDrag: Build = (slots = {}) => {
  const item = document.createElement('div');

  Object.assign(item.style, {
    position: 'fixed',
    top: '0px',
    left: '0px',
    width: '100px',
    height: '40px',
  });
  document.body.append(item);

  const state = { report: null as ((error: unknown) => void) | null, hooks: 0 };
  const errors = slots.errors ?? [];
  const log: string[] = [];
  let fixture!: Fixture;
  const config: FreeDragConfig = {
    onDrop: () => {
      slots.onResolve?.(fixture);
      return FreeDragResolution.accept();
    },
    onStart: (): void => {
      slots.onStart?.(fixture);
    },
    onMove: (): void => {
      slots.onMove?.(fixture);
    },
    onEnd: ({ type }): void => {
      log.push(`onEnd ${type}`);
      slots.onEnd?.(fixture);
    },
    onError: (error): void => {
      errors.push(error);
      log.push('onError');
      slots.onErrorDelivered?.(fixture);
    },
    ...(slots.plain ? {} : { landing: hostileLanding(state) }),
    plugins: slots.throwing
      ? [
          () => {
            throw new Error('installer');
          },
        ]
      : [],
  };

  cleanup.push(() => {
    item.remove();
  });

  const controller = freeDrag(item, config);

  item.setPointerCapture = (): void => {};
  item.releasePointerCapture = (): void => {};
  cleanup.push(() => {
    void controller.requestDestroy();
  });

  fixture = {
    target: item,
    controller,
    errors,
    log,
    report: (error) => {
      state.report!(error);
    },
    hooks: () => state.hooks,
  };

  return fixture;
};

const pointer = (target: EventTarget, type: string, y2: number): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: 10,
      clientY: y2,
    }),
  );
};

/** Press, then cross the activation threshold. */
const activate = (fixture: Fixture): void => {
  pointer(fixture.target, 'pointerdown', 10);
  pointer(document, 'pointermove', 40);
};

const settled = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });

/** Press, cross the threshold, move past a neighbour, and release there. */
const drop = (fixture: Fixture): void => {
  activate(fixture);
  pointer(document, 'pointermove', 70);
  pointer(document, 'pointerup', 70);
};

/** The one delivery a fault destruction discards owes. */
const expectOneDiscardedFault = (fixture: Fixture, fault: Error): void => {
  expect(fixture.errors).toHaveLength(1);
  expect(fixture.errors[0]).toBeInstanceOf(DraggableWarning);
  expect((fixture.errors[0] as DraggableWarning).message).toBe(
    'drag: failure/superseded-by-destruction',
  );
  expect((fixture.errors[0] as DraggableWarning).cause).toBe(fault);
};

describe.each([
  ['sortable', buildSortable],
  ['free drag', buildFreeDrag],
] as const)('diagnostic intake in the %s', (_name, build) => {
  it('should deliver nothing when destruction requested at depth 0 is applied', async () => {
    // (a) Teardown runs the throwing hook while destruction is applied.
    const fixture = build();

    activate(fixture);
    await fixture.controller.requestDestroy();

    expect(fixture.hooks()).toBe(1);
    expect(fixture.errors).toEqual([]);
  });

  it('should deliver nothing when destruction requested from a slot is applied at its boundary', () => {
    // (b) The request is registered inside the activation unit and applied
    // after it; the hook throws during that application.
    const fixture = build({
      onStart: (self) => {
        void self.controller.requestDestroy();
      },
    });

    activate(fixture);

    expect(fixture.hooks()).toBe(1);
    expect(fixture.errors).toEqual([]);
  });

  it('should deliver only the panic when a panic tears the controller down', () => {
    // (c) The threshold crossing's selection clear is a platform call the
    // handler runs unguarded, so its throw escapes the unit into the panic.
    const fixture = build();
    const broken = new Error('platform');
    // Saved to be restored, never called detached.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const selection = window.getSelection;

    window.getSelection = (): never => {
      throw broken;
    };

    try {
      activate(fixture);
    } finally {
      window.getSelection = selection;
    }

    expect(fixture.hooks()).toBe(1);
    expect(fixture.errors).toHaveLength(1);
    expect(fixture.errors[0]).toBeInstanceOf(DraggableError);
    expect((fixture.errors[0] as DraggableError).stage).toBeNull();
    expect((fixture.errors[0] as DraggableError).cause).toBe(broken);
  });

  it('should drop a kept report once the promise has settled', async () => {
    // (d)
    const fixture = build();

    await fixture.controller.requestDestroy();
    fixture.report(new Error('late'));

    expect(fixture.errors).toEqual([]);
  });

  it('should deliver a report made between the request and its application', () => {
    // (e) The slot requests destruction and then reports, in one unit: the
    // controller is still live until the unit ends.
    const fixture = build({
      onStart: (self) => {
        void self.controller.requestDestroy();
        self.report(new Error('in interval'));
      },
    });

    activate(fixture);

    expect(fixture.errors.map(describeError)).toEqual([
      'drag: composition/unwind-failed<in interval',
    ]);
    expect(fixture.errors[0]).toBeInstanceOf(DraggableWarning);
  });

  it('should deliver a report and a failed hook on a live controller', async () => {
    // (f) At depth 0, then at the operation's retirement, where the behavior's
    // own unwind reports the hook through its channel.
    const fixture = build();

    fixture.report(new Error('live'));
    activate(fixture);
    pointer(document, 'pointerup', 40);
    await settled();

    expect(fixture.hooks()).toBe(1);
    expect(fixture.errors.map(describeError)).toEqual([
      'drag: composition/unwind-failed<live',
      'drag: unwind/step-failed<retire-hook',
    ]);
  });

  it('should deliver the construction unwind before draggable() rethrows', () => {
    // (g) A later installer throws, and the composition unwind runs the
    // earlier one's hook before any spec exists.
    let thrown: unknown = null;
    const errors: unknown[] = [];

    try {
      build({ throwing: true, errors });
    } catch (error) {
      thrown = error;
    }

    expect((thrown as Error).message).toBe('installer');
    expect(errors.map(describeError)).toEqual([
      'drag: composition/unwind-failed<retire-hook',
    ]);
  });

  it('should warn once and end nothing when onStart requests destruction and then throws', async () => {
    // (i) The throw registers a checkpoint in the interval. Destruction discards
    // the checkpoint's claim at the unit's boundary, and the fault still arrives.
    const boom = new Error('boom');
    let destroyed!: Promise<void>;
    const fixture = build({
      plain: true,
      onStart: (self) => {
        destroyed = self.controller.requestDestroy();
        throw boom;
      },
    });

    activate(fixture);

    await expect(destroyed).resolves.toBeUndefined();
    expectOneDiscardedFault(fixture, boom);
    expect(fixture.log).toEqual(['onError']);
  });

  it('should report and end the operation when onStart throws with no request', async () => {
    // (k) The control for (i): the same throw, applied.
    const boom = new Error('boom');
    const fixture = build({
      plain: true,
      onStart: () => {
        throw boom;
      },
    });

    activate(fixture);
    await settled();

    expect(fixture.log).toEqual(['onError', 'onEnd canceled']);
    expect(fixture.errors[0]).toBeInstanceOf(DraggableError);
    expect((fixture.errors[0] as DraggableError).stage).toBe(
      FAILURE_ACTIVATION,
    );
    expect((fixture.errors[0] as DraggableError).cause).toBe(boom);
  });

  it('should deliver one error and no warning when onError requests destruction for an applied failure', async () => {
    // (s), public half. The checkpoint applied, so its fault is the error: what
    // onError requests discards what follows it, and owes nothing for it.
    const fixture = build({
      plain: true,
      onStart: () => {
        throw new Error('boom');
      },
      onErrorDelivered: (self) => {
        void self.controller.requestDestroy();
      },
    });

    activate(fixture);
    await settled();

    expect(fixture.errors).toHaveLength(1);
    expect(fixture.errors[0]).toBeInstanceOf(DraggableError);
    expect(fixture.log).toEqual(['onError']);
  });

  it('should warn once and end nothing when the round-trip slot requests destruction and then throws', async () => {
    // (v) The throw is a rejected settlement, with no checkpoint until its entry
    // applies. The counter shows the slot ran.
    const boom = new Error('boom');
    let ran = 0;
    const fixture = build({
      plain: true,
      onResolve: (self) => {
        ran += 1;
        void self.controller.requestDestroy();
        throw boom;
      },
    });

    drop(fixture);
    await settled();

    expect(ran).toBe(1);
    expectOneDiscardedFault(fixture, boom);
    expect(fixture.log).toEqual(['onError']);
  });

  it('should report and end the operation when the round-trip slot throws with no request', async () => {
    // (v)'s control: the same throw, applied.
    const fixture = build({
      plain: true,
      onResolve: () => {
        throw new Error('boom');
      },
    });

    drop(fixture);
    await settled();

    expect(fixture.errors[0]).toBeInstanceOf(DraggableError);
    expect(fixture.log).toEqual(['onError', 'onEnd canceled']);
  });

  it('should warn after onEnd when onEnd requests destruction and then throws', async () => {
    // (z) The terminal was already delivered, so the fault follows it.
    const boom = new Error('boom');
    const fixture = build({
      plain: true,
      onEnd: (self) => {
        void self.controller.requestDestroy();
        throw boom;
      },
    });

    drop(fixture);
    await settled();

    expectOneDiscardedFault(fixture, boom);
    expect(fixture.log.map((entry) => entry.split(' ')[0])).toEqual([
      'onEnd',
      'onError',
    ]);
  });
});

describe('diagnostic intake in the free drag, past activation', () => {
  it('should warn once and end nothing when onMove requests destruction and then throws', async () => {
    // (j) As (i), from the unit that delivers a sample. Free drag only: sortable
    // has no `onMove` slot.
    const boom = new Error('boom');
    let destroyed!: Promise<void>;
    const fixture = buildFreeDrag({
      plain: true,
      onMove: (self) => {
        destroyed = self.controller.requestDestroy();
        throw boom;
      },
    });

    activate(fixture);
    pointer(document, 'pointermove', 60);

    await expect(destroyed).resolves.toBeUndefined();
    expectOneDiscardedFault(fixture, boom);
    expect(fixture.log).toEqual(['onError']);
  });
});
