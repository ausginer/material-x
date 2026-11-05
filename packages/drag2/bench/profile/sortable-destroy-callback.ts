/**
 * The basic sortable destroying itself from `onReorder`: the first drop commits
 * and tears the controller down, and later presses do nothing.
 */
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const list = document.querySelector<HTMLElement>('#list')!;
const items = [...list.children] as HTMLElement[];

const controller = sortable(list, {
  items: () => items,
  axis: y(),
  onReorder({ item, after }) {
    list.insertBefore(item, after);
    void controller.requestDestroy();
    return ReorderResolution.accept();
  },
});
