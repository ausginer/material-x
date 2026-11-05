/**
 * The smallest sortable: `sortable` and `y()` with a synchronous verdict.
 *
 * Two pages run this one module, and they differ only in the input recorded:
 * `sortable-basic.html` drops the item, `sortable-cancel-escape.html` presses
 * Escape before the drop.
 */
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const list = document.querySelector<HTMLElement>('#list')!;
let items: readonly HTMLElement[] = [...list.children] as HTMLElement[];

const controller = sortable(list, {
  items: () => items,
  axis: y(),
  onReorder({ item, from, to, after }) {
    list.insertBefore(item, after);
    items = items.toSpliced(from, 1).toSpliced(to, 0, item);
    // The behavior keeps the collection it last pulled until it is told to
    // pull again, so the next operation would otherwise use the old order.
    controller.invalidate();
    return ReorderResolution.accept();
  },
});
