/**
 * Throw any value from any hook of a behavior with no `try` in it. The global
 * listener below shows what a consumer gets. Open the DevTools console here too:
 * how each engine prints the `cause` is part of what this page asks.
 */
import { draggable } from '@ydinjs/drag/draggable.js';
import { DragFault } from '@ydinjs/drag/fault.js';
import { describeValue, mountLog, read } from './shared.ts';

const log = mountLog();
const page = document.querySelector('#page')!;

const HOSTILE = {
  get message(): string {
    throw new Error('the message getter threw');
  },
};
const values: Record<string, unknown> = {
  error: new Error('an error'),
  null: null,
  string: 'a string',
  hostile: HOSTILE,
};

page.innerHTML = `
  <div class="controls">
    <label>Throw from
      <select id="hook">
        ${[
          'activate',
          'start',
          'move',
          'drop',
          'verdict',
          'rejected verdict',
          'settle',
          'end',
          'use',
          'admit',
        ]
          .map((hook) => `<option>${hook}</option>`)
          .join('')}
      </select>
    </label>
    <label>The value
      <select id="value">${Object.keys(values)
        .map((name) => `<option>${name}</option>`)
        .join('')}</select>
    </label>
    <label>A global listener
      <select id="listener">
        <option value="none">only reads</option>
        <option value="cancel">requests cancel</option>
        <option value="destroy">requests destroy</option>
      </select>
    </label>
    <button id="rebuild">Rebuild after destroy</button>
  </div>
  <div id="root" class="arena"><div class="card free">Drag me</div></div>`;

const root = document.querySelector<HTMLElement>('#root')!;
const card = root.querySelector<HTMLElement>('.card')!;
const chosen = (): unknown => values[read('value')];
const hurl = (hook: string): void => {
  if (read('hook') === hook) {
    // oxlint-disable-next-line no-throw-literal -- throwing any value is the point
    throw chosen();
  }
};

let lastFault: DragFault | null = null;
let panel: ReturnType<typeof build>;

addEventListener('error', (event) => {
  if (event.error instanceof DragFault) {
    lastFault = event.error;
    log(
      `instanceof DragFault: true; cause === thrown: ${event.error.cause === chosen()}; message: ${event.message}`,
      'fault',
    );

    if (read('listener') === 'cancel') {
      log('the listener requests cancel', 'request');
      panel.requestCancel('from the listener');
    } else if (read('listener') === 'destroy') {
      log('the listener requests destroy', 'request');
      void panel.requestDestroy().then(() => {
        log('destroy settled, with no end for this drag; press Rebuild');
      });
    }
  }
});

function build() {
  return draggable(root, {
    admit() {
      hurl('admit');
      return { item: card };
    },
    activate(drag) {
      hurl('activate');
      drag.use(() => {
        hurl('use');
      });
    },
    start() {
      log('start');
      hurl('start');
    },
    move(drag) {
      drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      hurl('move');
    },
    drop() {
      hurl('drop');

      return () => {
        hurl('verdict');

        return read('hook') === 'rejected verdict'
          ? Promise.reject(chosen())
          : 'accepted';
      };
    },
    settle({ rect }) {
      hurl('settle');
      return { x: rect.left, y: rect.top };
    },
    end(_drag, outcome) {
      const same =
        outcome.type === 'canceled' && outcome.origin === 'fault'
          ? `; reason === reported: ${outcome.reason === lastFault}`
          : '';

      log(
        `end: ${outcome.type}${
          outcome.type === 'canceled' ? ` origin=${outcome.origin}` : ''
        }${same}`,
      );
      hurl('end');
    },
  });
}

panel = build();
document.querySelector('#rebuild')!.addEventListener('click', () => {
  panel = build();
  log(`rebuilt; the chosen value is ${describeValue(chosen())}`);
});
