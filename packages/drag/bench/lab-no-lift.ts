/** `draggable` with no lift: a behavior that moves an element by `translate`. */
import { ancestry, delta, localDelta, space } from '@ydinjs/box-quad';
import { draggable } from '../src/draggable.ts';
import { makeRows } from './lab.ts';

const lab = {
  log: [] as string[],

  noLift(): void {
    const box = makeRows(1).firstElementChild as HTMLElement;
    const basis = space();
    const local = delta();

    draggable(box, {
      admit: () => ({ item: box }),
      activate(drag) {
        ancestry(box, basis);

        return {
          move() {
            const { x, y, originX, originY } = drag;

            if (localDelta(basis, x - originX, y - originY, local)) {
              box.style.translate = `${local[0]!}px ${local[1]!}px`;
            }
          },
          end(outcome) {
            lab.log.push(outcome.type);
          },
        };
      },
    });
  },
};

Object.assign(globalThis, { lab });
