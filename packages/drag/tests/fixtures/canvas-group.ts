/**
 * Moves a multi-selection inside a transformed canvas, with no lift. An assumed
 * shape, not a known product flow. It uses what a lift would have hidden:
 *
 * - coordinates: `box-quad` reads the canvas's space, under any transform;
 * - its own frame task, which enters a pass through `requestStep`;
 * - `nudge`, callable from foreign code, which defers through `requestStep`;
 * - rollback through `use`, which also runs on destruction, where `end` does not;
 * - a save that can fail.
 */
import { ancestry, delta, localDelta, space } from '@ydinjs/box-quad';
import {
  draggable,
  type DraggableController,
  type Drag,
} from '../../src/draggable.ts';

type Origin = Readonly<{ element: HTMLElement; left: number; top: number }>;
type State = {
  readonly origins: readonly Origin[];
  /** The other nodes' edges, which the group's edge snaps to. */
  readonly guidesX: readonly number[];
  readonly guidesY: readonly number[];
  /** What a node inherits, so that a viewport delta converts to `translate`. */
  readonly basis: Float64Array;
  /** What `nudge` asked for, on top of the pointer's travel. */
  nudgeX: number;
  /** The offset last rendered, snapped. */
  dx: number;
  dy: number;
};

export type CanvasGroup = Readonly<{
  panel: DraggableController<Drag<State>>;
  /** Shifts the group during a drag, from a key handler or anywhere else. */
  nudge(amount: number): void;
}>;

const SNAP = 6;

const snap = (value: number, guides: readonly number[]): number => {
  for (const guide of guides) {
    if (Math.abs(value - guide) < SNAP) {
      return guide;
    }
  }

  return value;
};

export function canvasGroup(
  canvas: HTMLElement,
  save: (
    moves: ReadonlyArray<[HTMLElement, number, number]>,
    signal: AbortSignal,
  ) => Promise<void>,
  guide: (x: number | null, y: number | null) => void,
): CanvasGroup {
  const selection = new Set<HTMLElement>();
  const local = delta();
  let handle = 0;

  const render = (drag: Drag<State> | null): void => {
    if (!drag) {
      return;
    }

    const { state } = drag;
    const [first] = state.origins;

    localDelta(
      state.basis,
      drag.x - drag.originX,
      drag.y - drag.originY,
      local,
    );

    const rawX = local[0]! + state.nudgeX;
    const rawY = local[1]!;
    const snappedX = snap(first!.left + rawX, state.guidesX) - first!.left;
    const snappedY = snap(first!.top + rawY, state.guidesY) - first!.top;

    for (const { element } of state.origins) {
      element.style.translate = `${snappedX}px ${snappedY}px`;
    }

    state.dx = snappedX;
    state.dy = snappedY;
    guide(
      snappedX === rawX ? null : first!.left + snappedX,
      snappedY === rawY ? null : first!.top + snappedY,
    );
  };

  const panel = draggable<State, undefined>(canvas, {
    threshold: 3,

    admit(event) {
      const item = (event.target as Element).closest<HTMLElement>('.node');

      if (!item) {
        selection.clear();
        return null;
      }

      if (!selection.has(item) && !event.shiftKey) {
        selection.clear();
      }

      selection.add(item);

      const others = [...canvas.querySelectorAll<HTMLElement>('.node')].filter(
        (node) => !selection.has(node),
      );

      return {
        item,
        state: {
          origins: [...selection].map((element) => ({
            element,
            left: element.offsetLeft,
            top: element.offsetTop,
          })),
          guidesX: others.map((node) => node.offsetLeft),
          guidesY: others.map((node) => node.offsetTop),
          basis: space(),
          nudgeX: 0,
          dx: 0,
          dy: 0,
        },
      };
    },

    activate(drag) {
      const { state, item } = drag;

      if (!ancestry(item, state.basis)) {
        throw new Error('canvas-group/no-basis');
      }

      for (const { element } of state.origins) {
        element.classList.add('moving');
      }

      drag.use((outcome) => {
        cancelAnimationFrame(handle);
        handle = 0;
        guide(null, null);

        for (const { element, left, top } of state.origins) {
          element.classList.remove('moving');
          element.style.translate = '';

          if (outcome?.type !== 'verdict') {
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
          }
        }
      });
    },

    move(drag) {
      handle ||= requestAnimationFrame(() => {
        handle = 0;
        drag.requestStep(render);
      });
    },

    drop(drag) {
      cancelAnimationFrame(handle);
      handle = 0;
      render(drag);

      const { origins, dx, dy } = drag.state;
      const moves = origins.map(
        ({ element, left, top }) =>
          [element, left + dx, top + dy] as [HTMLElement, number, number],
      );

      return (signal) =>
        save(moves, signal).then(() => {
          for (const [element, left, top] of moves) {
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
          }

          return undefined;
        });
    },
  });

  return {
    panel,
    nudge(amount) {
      panel.requestStep((drag) => {
        if (drag) {
          drag.state.nudgeX += amount;
          render(drag);
        }
      });
    },
  };
}
