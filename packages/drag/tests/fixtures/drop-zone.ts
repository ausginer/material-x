/**
 * Lift, hit-testing under the pointer, an async verdict that can reject, and a
 * landing: into the zone when accepted and back home when not.
 */
import {
  draggable,
  type Drag,
  type DraggableController,
} from '../../src/draggable.ts';
import { Lifter, type Lift } from '../../src/lift.ts';

type State = { lift: Lift | null; zone: HTMLElement | null };
type Save = (
  card: HTMLElement,
  zone: HTMLElement,
  signal: AbortSignal,
) => Promise<boolean>;

const zoneAt = (drag: Drag<State>): HTMLElement | null => {
  // The lifted card is under the pointer, so the zone is further down the list.
  for (const element of document.elementsFromPoint(drag.x, drag.y)) {
    if (element !== drag.state.lift!.visual && element.matches('.zone')) {
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
): DraggableController<Drag<State>> {
  const lifter = new Lifter(board.ownerDocument.defaultView!);
  const controller = draggable<State, boolean>(board, {
    admit(event) {
      const item = (event.target as Element).closest<HTMLElement>('.card');

      return item && { item, state: { lift: null, zone: null } };
    },

    activate(drag) {
      drag.state.lift = lifter.acquire(drag);
      return undefined;
    },

    move(drag) {
      drag.state.lift!.translate(drag.x - drag.originX, drag.y - drag.originY);
      highlight(drag.state, zoneAt(drag));
    },

    drop(drag) {
      const { zone } = drag.state;

      return zone && ((signal) => save(drag.item, zone, signal));
    },

    settle(drag, outcome) {
      const { item, state } = drag;
      const lift = state.lift!;

      if (outcome.type !== 'verdict' || !outcome.value) {
        highlight(state, null);
        lift.land(lift.rect.left, lift.rect.top);
        return;
      }

      // A lifted card has no flow position to measure, so a stand-in finds it.
      const standIn = document.createElement('div');

      standIn.style.height = `${lift.boxHeight}px`;
      state.zone!.append(standIn);

      const { left: x, top: y } = standIn.getBoundingClientRect();

      standIn.replaceWith(item);
      highlight(state, null);
      lift.land(x, y);
    },
  });

  controller.use(lifter.cancelLanding);
  return controller;
}
