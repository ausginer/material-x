import { landing } from '@ydinjs/drag/sortable/landing.js';
import { layoutAnimation } from '@ydinjs/drag/sortable/layout-animation.js';
import { y } from '@ydinjs/drag/sortable/y.js';
import { ReorderResolution, sortable } from '@ydinjs/drag/sortable.js';
import {
  checked,
  describeResult,
  mountLog,
  read,
  runVerdict,
  verdictOptions,
  type VerdictMode,
} from './shared.ts';

const log = mountLog();
const page = document.querySelector('#page')!;

page.innerHTML = `
  <div class="controls">
    <label><input id="landing" type="checkbox" checked /> Landing</label>
    <label><input id="rows" type="checkbox" checked /> Row animation</label>
    <label><input id="handle" type="checkbox" /> Grip handle only</label>
    ${verdictOptions}
    <button id="add">Add item</button>
    <button id="cancel" title="Fires 2 seconds after you click it, so start a drag">Cancel in 2s</button>
  </div>
  <p>The scroller clips its content and the dragged row still paints on top. Focus a row and press an arrow key. Escape cancels. The input is marked <code>data-drag-ignore</code>.</p>
  <div class="scroller"><div id="list" class="list"></div></div>`;

const list = document.querySelector<HTMLElement>('#list')!;
let count = 0;

const addRow = (): void => {
  count += 1;

  const row = document.createElement('div');

  row.className = 'row';
  row.tabIndex = 0;
  row.dataset['name'] = `Item ${count}`;
  row.style.minHeight = `${30 + ((count * 37) % 70)}px`;
  row.innerHTML = `<span class="grip">⠿</span>Item ${count}
    <button data-drag-ignore class="remove">✕</button>
    ${count % 4 === 0 ? '<input data-drag-ignore placeholder="owns its press" />' : ''}`;
  list.append(row);
};

for (let i = 0; i < 14; i += 1) {
  addRow();
}

const rowsOf = (): HTMLElement[] =>
  [...list.children].filter(
    (element) => !element.hasAttribute('data-drag-placeholder'),
  ) as HTMLElement[];

let controller: ReturnType<typeof sortable>;

const build = (): void => {
  controller = sortable(list, {
    items: rowsOf,
    axis: y(),
    ...(checked('landing') ? { landing: landing() } : {}),
    ...(checked('rows') ? { displacement: layoutAnimation() } : {}),
    ...(checked('handle')
      ? { handle: (item) => item.querySelector<HTMLElement>('.grip') }
      : {}),
    onStart(item) {
      log(`onStart: ${item.dataset['name']}`);
    },
    onReorder({ item, from, to, next }, { signal }) {
      log(`onReorder: ${item.dataset['name']} ${from} → ${to}`);

      return runVerdict(
        read('verdict') as VerdictMode,
        signal,
        () => {
          // Moving a focused element blurs it, and focus is the consumer's.
          const focused = document.activeElement === item;

          list.insertBefore(item, next);

          if (focused) {
            item.focus();
          }

          return ReorderResolution.accept();
        },
        () => ReorderResolution.reject('the toggle said no'),
      );
    },
    onEnd(result) {
      log(describeResult(result));
    },
  });
};

build();

for (const id of ['landing', 'rows', 'handle']) {
  document.querySelector(`#${id}`)!.addEventListener('change', () => {
    void controller.requestDestroy().then(build);
  });
}

document.querySelector('#add')!.addEventListener('click', () => {
  addRow();
  controller.invalidate();
});

document.querySelector('#cancel')!.addEventListener('click', () => {
  setTimeout(() => {
    log('requestCancel', 'request');
    controller.requestCancel('the timer');
  }, 2000);
});

list.addEventListener('click', (event) => {
  const remove = (event.target as Element).closest('.remove');

  if (remove) {
    remove.closest('.row')!.remove();
    controller.invalidate();
  }
});
