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
 *   constructing — every report is delivered.
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
  /** The `report` the installer kept. */
  report(error: unknown): void;
  /** How many times the throwing retire hook ran. */
  hooks(): number;
}>;

type Slots = Readonly<{
  onStart?(fixture: Fixture): void;
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
  let fixture!: Fixture;
  const config: SortableConfig = {
    items: () => items,
    axis: y(),
    onReorder: () => ReorderResolution.accept(),
    onStart: (): void => {
      slots.onStart?.(fixture);
    },
    onError: (error): void => {
      errors.push(error);
    },
    landing: hostileLanding(state),
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
  let fixture!: Fixture;
  const config: FreeDragConfig = {
    onDrop: () => FreeDragResolution.accept(),
    onStart: (): void => {
      slots.onStart?.(fixture);
    },
    onError: (error): void => {
      errors.push(error);
    },
    landing: hostileLanding(state),
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
});
