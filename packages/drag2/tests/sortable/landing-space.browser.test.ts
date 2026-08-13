/**
 * The landing coordinate space, pinned to exact values.
 *
 * `LandingContext.from`, `LandingContext.target` and `retarget()`'s argument are
 * **origin-relative viewport deltas**: CSS pixels to translate the visual by,
 * measured from where its border box sat at admission. That is the space
 * `compose()` and the kernel's own `lift.write()` consume, so a runner converts
 * nothing.
 *
 * The fixture is absolutely positioned at a non-zero offset on both axes, which
 * is what makes the tests discriminating: a viewport point and a delta from the
 * grab rect agree at the origin and nowhere else.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  draggable,
  FAILURE_PRESENTATION_READY,
  type Point,
} from '../../src/drag.ts';
import { callbacks } from '../../src/sortable/callbacks.ts';
import {
  landing,
  type LandingContext,
  type LandingHandle,
} from '../../src/sortable/landing.ts';
import { y } from '../../src/sortable/y.ts';
import {
  type ReorderRequest,
  ReorderResolution,
  type SortableController,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 21;
const ITEM_HEIGHT = 40;
/** Both non-zero, so a delta can never be mistaken for a viewport point. */
const ROOT_TOP = 120;
const ROOT_LEFT = 40;
/** The press, relative to the grabbed row's top-left corner. */
const GRAB_X = 10;
const GRAB_Y = 10;

type Fixture = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  placeholder(): HTMLElement;
  /** The grabbed row's rect, measured before anything is lifted. */
  origin: DOMRect;
  contexts: LandingContext[];
  retargets: Point[];
  errors: Array<Readonly<{ stage: number }>>;
  controller: SortableController;
  /** The request the last `onReorder` was handed, for `controller.ready`. */
  request(): ReorderRequest;
}>;

const cleanup: Array<() => void> = [];

type Reporting = { reportError?(error: unknown): void };

let reported: unknown[] = [];

beforeEach(() => {
  reported = [];
  (globalThis as Reporting).reportError = (error): void => {
    reported.push(error);
  };
});

afterEach(() => {
  delete (globalThis as Reporting).reportError;

  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

function build(presentation = false, readinessTimeout?: number): Fixture {
  const root = document.createElement('div');

  Object.assign(root.style, {
    position: 'absolute',
    top: `${ROOT_TOP}px`,
    left: `${ROOT_LEFT}px`,
    width: '200px',
  });
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < 3; i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const contexts: LandingContext[] = [];
  let pending: ReorderRequest | null = null;
  const retargets: Point[] = [];
  const errors: Array<Readonly<{ stage: number }>> = [];

  const controller = draggable(
    root,
    sortable(
      items,
      y(),
      callbacks({
        onReorder: (request) => {
          pending = request;
          return ReorderResolution.accept({ presentation });
        },
        ...(readinessTimeout === undefined ? {} : { readinessTimeout }),
        onError: (_error, context): void => {
          errors.push({ stage: context.stage });
        },
      }),
      landing({
        // A runner that records and never completes, so the gate stays open and
        // the numbers can be read while presentation is still owned.
        run(context): LandingHandle {
          contexts.push(context);
          return {
            destroy: (): void => {},
            retarget(target): void {
              retargets.push(target);
            },
          };
        },
      }),
    ),
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return {
    root,
    items,
    placeholder: () =>
      root.querySelector<HTMLElement>('[data-drag-placeholder]')!,
    origin: items[0]!.getBoundingClientRect(),
    contexts,
    retargets,
    errors,
    controller,
    request: () => pending!,
  };
}

const pointerEvent = (type: string, x: number, y: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: x,
      clientY: y,
    }),
  );
};

/** Press the first row `GRAB_X`/`GRAB_Y` in from its own corner. */
const press = (fixture: Fixture): void => {
  fixture.items[0]!.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: ROOT_LEFT + GRAB_X,
      clientY: ROOT_TOP + GRAB_Y,
    }),
  );
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

describe('the landing coordinate space', () => {
  it('should give from as the pointer delta since the grab', async () => {
    const fixture = build();

    press(fixture);
    // 30px down activates; 45px down is where the drop happens.
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    expect(fixture.contexts).toHaveLength(1);
    // Exact, and on both axes: the pointer never moved horizontally.
    expect(fixture.contexts[0]!.from).toEqual({ x: 0, y: 45 });
  });

  it('should give a from that compose turns back into the live transform', async () => {
    // The tightest statement of "one space": the value the runner is handed,
    // fed to the composer the runner is handed, reproduces the transform the
    // drag itself last wrote. Nothing here can be off by an origin.
    const fixture = build();

    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    const context = fixture.contexts[0]!;

    expect(fixture.items[0]!.style.transform).toBe(
      context.compose(context.from.x, context.from.y),
    );
  });

  it('should give target as the landing rect offset from the grab rect', async () => {
    const fixture = build();

    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    const context = fixture.contexts[0]!;
    // `anchorTarget` has already run, so the placeholder is where the visual
    // has to land. Presentation is still owned — the gate is open — so it is
    // still in the tree to measure.
    const anchor = fixture.placeholder().getBoundingClientRect();

    expect(context.target).toEqual({
      x: anchor.left - fixture.origin.left,
      y: anchor.top - fixture.origin.top,
    });
  });

  it('should not give target as a viewport point', async () => {
    // The discriminating case the offset fixture exists for: at a root pinned
    // 120px down and 40px in, a delta and a point cannot coincide.
    const fixture = build();

    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    const context = fixture.contexts[0]!;
    const anchor = fixture.placeholder().getBoundingClientRect();

    expect(context.target.x).not.toBe(anchor.left);
    expect(context.target.y).not.toBe(anchor.top);
    expect(fixture.origin.top).toBe(ROOT_TOP);
    expect(fixture.origin.left).toBe(ROOT_LEFT);
  });

  it('should give retarget the same space as target', async () => {
    // The readiness gate is what makes the kernel re-measure and retarget, and
    // it is the one place the value is produced by a different call path.
    const fixture = build(true);

    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    expect(fixture.retargets).toEqual([]);

    fixture.controller.ready(fixture.request());
    await Promise.resolve();
    await Promise.resolve();

    const anchor = fixture.placeholder().getBoundingClientRect();

    expect(fixture.retargets).toHaveLength(1);
    expect(fixture.retargets[0]).toEqual({
      x: anchor.left - fixture.origin.left,
      y: anchor.top - fixture.origin.top,
    });
    expect(reported).toEqual([]);
  });
});

describe('the readiness timeout', () => {
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const drop = async (fixture: Fixture): Promise<void> => {
    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);
  };

  it('should apply the configured bound rather than the default', async () => {
    // The option has to reach `config.readinessTimeout`, and the only way to
    // see that it did is to out-wait a bound the default would not have hit.
    const fixture = build(true, 20);

    await drop(fixture);
    await sleep(120);

    expect(fixture.errors.map((each) => each.stage)).toEqual([
      FAILURE_PRESENTATION_READY,
    ]);
  });

  it('should still be holding the gate at the same moment under the default', async () => {
    // The control: the identical script with the default 500ms bound has not
    // failed yet, which is what makes the assertion above about the *option*.
    const fixture = build(true);

    await drop(fixture);
    await sleep(120);

    expect(fixture.errors).toEqual([]);
  });
});
