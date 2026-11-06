/**
 * Lift, hit-testing under the pointer, an async verdict that can reject, and a
 * landing: into the zone when accepted and back home when not.
 */
import {
  draggable,
  type DraggableController,
  type LiftedDrag,
} from '../../src/draggable.ts';
import { lift } from '../../src/lift.ts';

type State = { zone: HTMLElement | null };
type Save = (
  card: HTMLElement,
  zone: HTMLElement,
  signal: AbortSignal,
) => Promise<boolean>;

const zoneAt = (drag: LiftedDrag<State>): HTMLElement | null => {
  // The lifted card is under the pointer, so the zone is further down the list.
  for (const element of document.elementsFromPoint(drag.x, drag.y)) {
    if (element !== drag.visual && element.matches('.zone')) {
      return element as HTMLElement;
    }
  }

  return null;
};

const highlight = (state: State, zone: HTMLElement | null): void => {
  state.zone?.classList.remove('over');
  zone?.classList.add('over');
  state.zone = zone;
};

export function dropZone(
  board: HTMLElement,
  save: Save,
): DraggableController<LiftedDrag<State>> {
  return draggable<State, boolean>(board, {
    lift,

    admit(event) {
      const item = (event.target as Element).closest<HTMLElement>('.card');

      return item && { item, state: { zone: null } };
    },

    move(drag) {
      drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      highlight(drag.state, zoneAt(drag));
    },

    drop(drag) {
      const { zone } = drag.state;

      return zone && ((signal) => save(drag.item, zone, signal));
    },

    settle(drag, outcome) {
      const { item, rect, state } = drag;

      if (outcome.type !== 'verdict' || !outcome.value) {
        highlight(state, null);
        return { x: rect.left, y: rect.top };
      }

      // A lifted card has no flow position to measure, so a stand-in finds it.
      const standIn = document.createElement('div');

      standIn.style.height = `${drag.boxHeight}px`;
      state.zone!.append(standIn);

      const { left: x, top: y } = standIn.getBoundingClientRect();

      standIn.replaceWith(item);
      highlight(state, null);
      return { x, y };
    },
  });
}
