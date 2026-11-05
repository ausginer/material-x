/**
 * The basic sortable driven by arrow keys. Each key press is one complete
 * operation with no lift, placeholder or motion.
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
    // Moving a node drops its focus, and the next arrow key has to land on it.
    item.focus();
    items = items.toSpliced(from, 1).toSpliced(to, 0, item);
    controller.invalidate();
    return ReorderResolution.accept();
  },
});
