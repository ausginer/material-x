/**
 * Moves a multi-selection inside a scaled canvas, with no lift. An assumed shape,
 * not a known product flow. It stresses what a lift would have hidden:
 *
 * - coordinates: the canvas's scale is measured here, by hand;
 * - its own frame task, which enters a pass through `run`;
 * - `nudge`, callable from foreign code, which defers through `requestApply`;
 * - rollback through `use`, which also runs on destruction, where `end` does not;
 * - a save that can fail.
 */
import { draggable, type Drag } from '@ydinjs/drag/draggable.js';

type Origin = Readonly<{ element: HTMLElement; left: number; top: number }>;
type State = {
  readonly origins: readonly Origin[];
  /** The other nodes' edges, which the group's edge snaps to. */
  readonly guidesX: readonly number[];
  readonly guidesY: readonly number[];
  /** Canvas units per viewport pixel. */
  readonly unit: number;
  /** What `nudge` asked for, on top of the pointer's travel. */
  nudgeX: number;
  /** The offset last rendered, snapped. */
  dx: number;
  dy: number;
  /** Set by `settle` on an accepted save, so that rollback stands down. */
  committed: boolean;
};

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
) {
  const selection = new Set<HTMLElement>();
  let handle = 0;
  /** Written by `nudge`, which foreign code can call in the middle of a step. */
  let nudged = 0;

  const render = (drag: Drag<State> | null): void => {
    if (!drag) {
      return;
    }

    const { state } = drag;
    const [first] = state.origins;
    const rawX = (drag.x - drag.originX) * state.unit + state.nudgeX;
    const rawY = (drag.y - drag.originY) * state.unit;
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

  const panel = draggable<State, void>(canvas, {
    lift: false,
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
          unit: canvas.offsetWidth / canvas.getBoundingClientRect().width,
          nudgeX: 0,
          dx: 0,
          dy: 0,
          committed: false,
        },
      };
    },

    activate(drag) {
      const { state } = drag;

      for (const { element } of state.origins) {
        element.classList.add('moving');
      }

      drag.use(() => {
        cancelAnimationFrame(handle);
        handle = 0;
        guide(null, null);

        for (const { element, left, top } of state.origins) {
          element.classList.remove('moving');
          element.style.translate = '';

          if (!state.committed) {
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
          }
        }
      });
    },

    move() {
      handle ||= requestAnimationFrame(() => {
        handle = 0;
        panel.run(render);
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
        });
    },

    settle({ state }, outcome) {
      state.committed = outcome.type === 'verdict';
      return null;
    },

    apply(drag) {
      const amount = nudged;

      nudged = 0;

      if (drag) {
        drag.state.nudgeX += amount;
        render(drag);
      }
    },
  });

  return {
    panel,
    /** Shifts the group during a drag, from a key handler or anywhere else. */
    nudge(amount: number): void {
      nudged += amount;
      panel.requestApply();
    },
  };
}
