/**
 * Your behavior. Save this file and the page swaps it in with hot reload.
 *
 * Every hook but `admit` is optional. A throw from any hook is a fault: it reaches
 * `reportError` as a `DragFault`, with no `try` here. `end` runs only if `start`
 * was reached. `drag.use` is the cleanup that survives destruction.
 *
 * The rule to feel out: a method foreign code can call must not write behavior
 * state directly. It records the wish and calls `panel.requestApply()`, and the
 * write happens in `apply`, between steps.
 */
import { draggable } from '@ydinjs/drag/draggable.js';

export function scratch(root: HTMLElement, log: (text: string) => void) {
  return draggable(root, {
    admit(event) {
      const item = (event.target as Element).closest<HTMLElement>('.card');

      return item && { item };
    },
    start() {
      log('start');
    },
    move(drag) {
      drag.translate(drag.x - drag.originX, drag.y - drag.originY);
    },
    settle: ({ rect }) => ({ x: rect.left, y: rect.top }),
    end(_drag, outcome) {
      log(`end: ${outcome.type}`);
    },
  });
}
