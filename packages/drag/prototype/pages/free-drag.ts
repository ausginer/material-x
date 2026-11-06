import { bounds } from '@ydinjs/drag/free-drag/bounds.js';
import { landing } from '@ydinjs/drag/free-drag/landing.js';
import { freeDrag, FreeDragResolution } from '@ydinjs/drag/free-drag.js';
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
    <label>Axis <select id="axis"><option>both</option><option>x</option><option>y</option></select></label>
    <label><input id="bounds" type="checkbox" checked /> Bounds</label>
    <label><input id="home" type="checkbox" /> Home is the arena's corner</label>
    <label><input id="landing" type="checkbox" checked /> Landing</label>
    ${verdictOptions}
  </div>
  <p>Press <kbd>M</kbd> during a drag to call <code>moveTo</code> with the arena's centre. Escape cancels.</p>
  <div id="arena" class="arena"><div id="free" class="card free">Drag me</div></div>`;

const arena = document.querySelector<HTMLElement>('#arena')!;
const free = document.querySelector<HTMLElement>('#free')!;
let controller: ReturnType<typeof freeDrag>;

const build = (): void => {
  controller = freeDrag(free, {
    axis: read('axis') as 'both' | 'x' | 'y',
    ...(checked('bounds') ? { bounds: bounds(arena) } : {}),
    ...(checked('landing') ? { landing: landing() } : {}),
    ...(checked('home')
      ? {
          home() {
            const { left, top } = arena.getBoundingClientRect();

            return { x: left, y: top };
          },
        }
      : {}),
    onStart() {
      log('onStart');
    },
    onDrop({ localDeltaX, localDeltaY }, { signal }) {
      log(`onDrop: ${Math.round(localDeltaX)}, ${Math.round(localDeltaY)}`);

      return runVerdict(
        read('verdict') as VerdictMode,
        signal,
        () => {
          free.style.left = `${free.offsetLeft + localDeltaX}px`;
          free.style.top = `${free.offsetTop + localDeltaY}px`;
          return FreeDragResolution.accept();
        },
        () => FreeDragResolution.reject('the toggle said no'),
      );
    },
    onEnd(result) {
      log(describeResult(result));
    },
  });
};

build();

for (const id of ['axis', 'bounds', 'home', 'landing']) {
  document.querySelector(`#${id}`)!.addEventListener('change', () => {
    void controller.requestDestroy().then(build);
  });
}

addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    const { left, top, width, height } = arena.getBoundingClientRect();

    log('moveTo: the centre', 'request');
    controller.moveTo({ x: left + width / 2 - 60, y: top + height / 2 - 40 });
  }
});
