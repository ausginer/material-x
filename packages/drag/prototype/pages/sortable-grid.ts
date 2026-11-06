import { landing } from '@ydinjs/drag/sortable/landing.js';
import { layoutAnimation } from '@ydinjs/drag/sortable/layout-animation.js';
import { xy } from '@ydinjs/drag/sortable/xy.js';
import { ReorderResolution, sortable } from '@ydinjs/drag/sortable.js';
import { describeResult, mountLog } from './shared.ts';

const log = mountLog();
const page = document.querySelector('#page')!;

page.innerHTML = '<div id="grid" class="grid"></div>';

const grid = document.querySelector<HTMLElement>('#grid')!;

for (let i = 1; i <= 14; i += 1) {
  const cell = document.createElement('div');

  cell.className = `card${i % 5 === 0 ? ' wide' : ''}${i % 7 === 0 ? ' tall' : ''}`;
  cell.tabIndex = 0;
  cell.textContent = `Cell ${i}`;
  grid.append(cell);
}

sortable(grid, {
  items: () =>
    [...grid.children].filter(
      (element) => !element.hasAttribute('data-drag-placeholder'),
    ) as HTMLElement[],
  axis: xy(),
  landing: landing(),
  displacement: layoutAnimation(),
  // A placeholder has no size class of its own, so it takes the cell's span.
  placeholder({ item }) {
    const hole = document.createElement('div');

    hole.className = item.className.replace('card', '');
    return hole;
  },
  onReorder({ item, next }) {
    // Moving a focused element blurs it, and focus is the consumer's.
    const focused = document.activeElement === item;

    grid.insertBefore(item, next);

    if (focused) {
      item.focus();
    }

    return ReorderResolution.accept();
  },
  onEnd(result) {
    log(describeResult(result));
  },
});
