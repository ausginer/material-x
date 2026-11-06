import { landing } from '@ydinjs/drag/sortable/landing.js';
import { y } from '@ydinjs/drag/sortable/y.js';
import { ReorderResolution, sortable } from '@ydinjs/drag/sortable.js';
import { describeResult, type Log, mountLog } from './shared.ts';

const log = mountLog();
const page = document.querySelector('#page')!;

page.innerHTML = `
  <p>Each list stays under the pointer. The orange panel is positioned later than the list and the dragged row still paints above it.</p>
  <div class="panels">
    <section class="panel"><h2>Ancestor <code>scale(.5)</code></h2><div style="transform:scale(.5);transform-origin:0 0"><div id="scaled" class="list"></div></div></section>
    <section class="panel"><h2>Ancestor <code>zoom: 2</code></h2><div style="zoom:2"><div id="zoomed" class="list"></div></div></section>
    <section class="panel"><h2>Later positioned panel</h2><div id="covered" class="list"></div><div class="cover">panel</div></section>
    <section class="panel"><h2>Shadow root</h2><div id="shadow-host"></div></section>
    <section class="panel"><h2>Same-origin iframe, parent-controlled</h2><iframe id="frame" title="list" style="width:100%;height:190px;border:0"></iframe></section>
  </div>`;

/** Fills a list and runs a sortable on it from this realm. */
function mount(list: HTMLElement, name: string, write: Log): void {
  for (let i = 1; i <= 4; i += 1) {
    const row = list.ownerDocument.createElement('div');

    row.className = 'row';
    row.textContent = `${name} ${i}`;
    list.append(row);
  }

  sortable(list, {
    items: () =>
      [...list.children].filter(
        (element) => !element.hasAttribute('data-drag-placeholder'),
      ) as HTMLElement[],
    axis: y(),
    landing: landing(),
    onReorder({ item, next }) {
      list.insertBefore(item, next);
      return ReorderResolution.accept();
    },
    onEnd(result) {
      write(`${name}: ${describeResult(result)}`);
    },
  });
}

for (const [id, name] of [
  ['scaled', 'Scaled'],
  ['zoomed', 'Zoomed'],
  ['covered', 'Covered'],
] as const) {
  mount(document.querySelector<HTMLElement>(`#${id}`)!, name, log);
}

const shadow = document
  .querySelector('#shadow-host')!
  .attachShadow({ mode: 'open' });

shadow.innerHTML =
  '<link rel="stylesheet" href="./shared.css"><div id="inner" class="list"></div>';
mount(shadow.querySelector<HTMLElement>('#inner')!, 'Shadow', log);

const frame = document.querySelector<HTMLIFrameElement>('#frame')!;
const inner = frame.contentDocument!;

inner.head.innerHTML = '<link rel="stylesheet" href="/pages/shared.css">';
inner.body.innerHTML = '<div id="inner" class="list"></div>';
mount(inner.querySelector<HTMLElement>('#inner')!, 'Iframe', log);
