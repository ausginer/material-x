/**
 * The basic sortable with a verdict that arrives 300 ms after the drop, as a
 * save to a server would.
 */
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const list = document.querySelector<HTMLElement>('#list')!;
let items: readonly HTMLElement[] = [...list.children] as HTMLElement[];

const controller = sortable(list, {
  items: () => items,
  axis: y(),
  async onReorder({ item, from, to, after }) {
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    list.insertBefore(item, after);
    items = items.toSpliced(from, 1).toSpliced(to, 0, item);
    controller.invalidate();
    return ReorderResolution.accept();
  },
});
