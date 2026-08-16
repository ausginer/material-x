/**
 * The shared free-drag fixture harness.
 *
 * Phase 19's suite carried its own `compose()`; Phase 20 adds three more suites
 * that need the same stage, the same pointer drivers and the same recorders, so
 * the builder moved here rather than being copied four times. **The drivers are
 * the part that matters**: every free-drag row in the matrix is driven through
 * real `pointerdown`/`pointermove`/`pointerup` events on the public entry, so a
 * fixture cannot accidentally assert against a seam the platform would never
 * reach in that order.
 *
 * Layout: one 100×40 item at the viewport origin, inside a 200×200 fixed stage.
 * Both are overridable — the geometry suite warps the stage and the lift suite
 * gives the item its own transform.
 */
import { afterEach, beforeEach } from 'vitest';
import {
  FreeDragResolution,
  freeDrag,
  type DragGeometry,
  type FreeDragConfig,
  type FreeDragController,
  type FreeDragRequest,
  type FreeDragTransactionResult,
} from '../../src/free-drag.ts';

export const POINTER_ID = 12;

export type Composed = Readonly<{
  item: HTMLElement;
  stage: HTMLElement;
  controller: FreeDragController;
  requests: FreeDragRequest[];
  ends: FreeDragTransactionResult[];
  errors: unknown[];
  starts: DragGeometry[];
  moves: DragGeometry[];
  /** The translate the visual currently carries, as `[x, y]`. */
  rendered(): readonly [number, number];
}>;

export type Options = Readonly<{
  fragments?: ReadonlyArray<Partial<FreeDragConfig>>;
  onDrop?: FreeDragConfig['onDrop'];
  config?: Partial<FreeDragConfig>;
  /** Extra styles on the 200×200 stage — a transform, a zoom, a scroll box. */
  stageStyle?: Readonly<Record<string, string>>;
  /** Extra styles on the item — its own authored transform, typically. */
  itemStyle?: Readonly<Record<string, string>>;
}>;

export type Harness = Readonly<{
  compose(options?: Options): Composed;
  /** Everything `globalThis.reportError` received during the current test. */
  reported(): readonly unknown[];
  /** Register a disposer to run in `afterEach`, in reverse order. */
  own(dispose: () => void): void;
}>;

type Reporting = { reportError?(error: unknown): void };

/**
 * Registers the per-test hooks on the calling suite file and returns the
 * builder. Called at the top level of a test module, which is what keeps the
 * hook registration explicit rather than an import side effect.
 */
export function freeDragHarness(): Harness {
  const cleanup: Array<() => void> = [];
  let reported: unknown[] = [];

  beforeEach(() => {
    reported = [];
    (globalThis as Reporting).reportError = (error): void => {
      reported.push(error);
    };
  });

  afterEach(() => {
    delete (globalThis as Reporting).reportError;

    for (const dispose of cleanup.splice(0).reverse()) {
      dispose();
    }
  });

  const own = (dispose: () => void): void => {
    cleanup.push(dispose);
  };

  return {
    own,
    reported: () => reported,

    compose(options: Options = {}): Composed {
      const stage = document.createElement('div');

      Object.assign(
        stage.style,
        {
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '200px',
          height: '200px',
        },
        options.stageStyle,
      );

      const item = document.createElement('div');

      Object.assign(
        item.style,
        {
          display: 'block',
          width: '100px',
          height: '40px',
        },
        options.itemStyle,
      );
      stage.append(item);
      document.body.append(stage);

      const requests: FreeDragRequest[] = [];
      const ends: FreeDragTransactionResult[] = [];
      const errors: unknown[] = [];
      const starts: DragGeometry[] = [];
      const moves: DragGeometry[] = [];

      const controller = freeDrag(
        item,
        {
          onDrop:
            options.onDrop ??
            ((request) => {
              requests.push(request);
              return FreeDragResolution.accept();
            }),
          onStart: (geometry): void => {
            starts.push(geometry);
          },
          onMove: (geometry): void => {
            moves.push(geometry);
          },
          onEnd: (result): void => {
            ends.push(result);
          },
          onError: (error): void => {
            errors.push(error);
          },
          ...options.config,
        },
        ...(options.fragments ?? []),
      );

      item.setPointerCapture = (): void => {};
      item.releasePointerCapture = (): void => {};

      own(() => {
        void controller.destroy();
        stage.remove();
      });

      return {
        item,
        stage,
        controller,
        requests,
        ends,
        errors,
        starts,
        moves,
        rendered: () => {
          const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/u.exec(
            item.style.transform,
          );

          return match === null
            ? ([0, 0] as const)
            : ([Number(match[1]), Number(match[2])] as const);
        },
      };
    },
  };
}

export const press = (target: HTMLElement, x = 10, y = 10): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
    }),
  );
};

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

export const move = (x: number, y: number): void => {
  pointerEvent('pointermove', x, y);
};

export const release = (x: number, y: number): void => {
  pointerEvent('pointerup', x, y);
};

export const cancelPointer = (x: number, y: number): void => {
  pointerEvent('pointercancel', x, y);
};

export const escape = (): void => {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
};

/** Press at (10, 10) and cross the 8px activation threshold. */
export const activate = (composed: Composed): void => {
  press(composed.item);
  move(30, 10);
};

/** Drain the microtask queue the settlement round-trip runs on. */
export const settled = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** One paint, for a landing that has to start and finish. */
export const frame = async (): Promise<void> => {
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve(null);
    });
  });
};
