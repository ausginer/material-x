/**
 * The basic sortable cancelling every drag from `onStart`, so `onReorder` is
 * never reached.
 */
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const list = document.querySelector<HTMLElement>('#list')!;

const controller = sortable(list, {
  items: () => [...list.children] as HTMLElement[],
  axis: y(),
  onStart() {
    controller.requestCancel();
  },
  onReorder: () => ReorderResolution.accept(),
});
