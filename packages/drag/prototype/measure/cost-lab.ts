/** Runs in the page: one list on the prototype, composed as the cost rows were. */
import { y } from '@ydinjs/drag/sortable/y.js';
import { ReorderResolution, sortable } from '@ydinjs/drag/sortable.js';

function make(count: number): void {
  const list = document.createElement('div');

  list.style.cssText = 'position:relative;width:200px;';

  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');

    item.id = `i${i}`;
    item.textContent = String(i);
    item.style.cssText =
      'height:40px;box-sizing:border-box;background:#ccd;border:1px solid #889;position:relative;';
    list.append(item);
  }

  document.body.append(list);

  const log: string[] = [];

  Object.assign(globalThis, { log });
  sortable(list, {
    items: () =>
      [...list.children].filter((element) => element.id) as HTMLElement[],
    axis: y(),
    onReorder({ item, next }) {
      list.insertBefore(item, next);
      return ReorderResolution.accept();
    },
    onEnd: (result) => log.push(result.type),
  });
}

Object.assign(globalThis, { make });
