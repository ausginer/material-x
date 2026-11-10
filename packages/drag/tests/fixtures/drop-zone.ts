/**
 * Lift, hit-testing under the pointer, an async verdict that can reject, and a
 * landing: into the zone when accepted and back home when not.
 */
import {
  draggable,
  type BehaviorOperation,
  type Drag,
  type DraggableController,
} from '../../src/draggable.ts';
import { landing } from '../../src/lift/landing.ts';
import { Lifter, type Lift } from '../../src/lift.ts';

type Over = { zone: HTMLElement | null };

const cardLanding = landing();
type Save = (
  card: HTMLElement,
  zone: HTMLElement,
  signal: AbortSignal,
) => Promise<boolean>;

const zoneAt = (drag: Drag, lift: Lift): HTMLElement | null => {
  // The lifted card is under the pointer, so the zone is further down the list.
  for (const element of document.elementsFromPoint(drag.x, drag.y)) {
    if (element !== lift.visual && element.matches('.zone')) {
      return element as HTMLElement;
    }
  }

  return null;
};

const highlight = (over: Over, zone: HTMLElement | null): void => {
  over.zone?.classList.remove('over');
  zone?.classList.add('over');
  over.zone = zone;
};

export function dropZone(
  board: HTMLElement,
  save: Save,
): DraggableController<BehaviorOperation<boolean>> {
  const lifter = new Lifter(board.ownerDocument.defaultView!);
  const controller = draggable<undefined, boolean>(board, {
    admit(event) {
      const item = (event.target as Element).closest<HTMLElement>('.card');

      return item && { item };
    },

    activate(drag) {
      const lift = lifter.acquire(drag);
      const over: Over = { zone: null };

      return {
        move() {
          lift.translate(drag.x - drag.originX, drag.y - drag.originY);
          highlight(over, zoneAt(drag, lift));
        },

        drop() {
          const { zone } = over;

          return zone && ((signal) => save(drag.item, zone, signal));
        },

        settle(outcome) {
          if (outcome.type !== 'verdict' || !outcome.value) {
            highlight(over, null);
            lift.land(lift.rect.left, lift.rect.top, cardLanding);
            return;
          }

          // A lifted card has no flow position to measure, so a stand-in finds it.
          const standIn = document.createElement('div');

          standIn.style.height = `${lift.boxHeight}px`;
          over.zone!.append(standIn);

          const { left: x, top: y } = standIn.getBoundingClientRect();

          standIn.replaceWith(drag.item);
          highlight(over, null);
          lift.land(x, y, cardLanding);
        },
      };
    },
  });

  controller.use(lifter.cancelLanding);
  return controller;
}
