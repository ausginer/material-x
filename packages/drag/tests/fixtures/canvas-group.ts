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
  type BehaviorOperation,
  type DraggableController,
} from '../../src/draggable.ts';

type Origin = Readonly<{ element: HTMLElement; left: number; top: number }>;
type State = Readonly<{
  origins: readonly Origin[];
  /** The other nodes' edges, which the group's edge snaps to. */
  guidesX: readonly number[];
  guidesY: readonly number[];
  /** What a node inherits, so that a viewport delta converts to `translate`. */
  basis: Float64Array;
}>;

/** One activated move of the group. */
type GroupMove = BehaviorOperation<undefined> &
  Readonly<{
    /** Renders the pointer's travel and the nudge, snapped. */
    render(): void;
    /** Adds to the nudge and renders. */
    nudge(amount: number): void;
  }>;

export type CanvasGroup = Readonly<{
  panel: DraggableController<GroupMove>;
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

/** Step: renders the current move, if any. */
const render = (move: GroupMove | null): void => {
  move?.render();
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

  const panel = draggable<State, undefined, GroupMove>(canvas, {
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
        },
      };
    },

    activate(drag, state) {
      if (!ancestry(drag.item, state.basis)) {
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

      /** What `nudge` asked for, on top of the pointer's travel. */
      let nudgeX = 0;
      /** The offset last rendered, snapped. */
      let dx = 0;
      let dy = 0;

      const move: GroupMove = {
        render() {
          const [first] = state.origins;

          localDelta(
            state.basis,
            drag.x - drag.originX,
            drag.y - drag.originY,
            local,
          );

          const rawX = local[0]! + nudgeX;
          const rawY = local[1]!;
          const snappedX =
            snap(first!.left + rawX, state.guidesX) - first!.left;
          const snappedY = snap(first!.top + rawY, state.guidesY) - first!.top;

          for (const { element } of state.origins) {
            element.style.translate = `${snappedX}px ${snappedY}px`;
          }

          dx = snappedX;
          dy = snappedY;
          guide(
            snappedX === rawX ? null : first!.left + snappedX,
            snappedY === rawY ? null : first!.top + snappedY,
          );
        },

        nudge(amount) {
          nudgeX += amount;
          move.render();
        },

        move() {
          handle ||= requestAnimationFrame(() => {
            handle = 0;
            drag.requestStep(render);
          });
        },

        drop() {
          cancelAnimationFrame(handle);
          handle = 0;
          move.render();

          const moves = state.origins.map(
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
      };

      return move;
    },
  });

  return {
    panel,
    nudge(amount) {
      panel.requestStep((move) => {
        move?.nudge(amount);
      });
    },
  };
}
