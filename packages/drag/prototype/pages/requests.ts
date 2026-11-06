/**
 * Request against application, on screen. A custom-element reaction runs inside
 * the DOM write that triggers it, in the middle of a step, so what it asks for can
 * only fill a slot. The log shows the request, then what the step did anyway, then
 * the application.
 */
import { landing } from '@ydinjs/drag/sortable/landing.js';
import { y } from '@ydinjs/drag/sortable/y.js';
import { ReorderResolution, sortable } from '@ydinjs/drag/sortable.js';
import { describeResult, mountLog, read } from './shared.ts';

const log = mountLog();
const page = document.querySelector('#page')!;

page.innerHTML = `
  <div class="controls">
    <label>When
      <select id="when">
        <option value="activation">during activation</option>
        <option value="drop">during the drop</option>
        <option value="landing">during the landing</option>
      </select>
    </label>
    <label>From
      <select id="from">
        <option value="reaction">a custom-element reaction</option>
        <option value="listener">an event listener</option>
      </select>
    </label>
    <label>Asks to
      <select id="action">
        <option value="cancel">cancel</option>
        <option value="destroy">destroy</option>
        <option value="press">press (a nested pointerdown)</option>
      </select>
    </label>
    <button id="rebuild">Rebuild after destroy</button>
  </div>
  <div class="scroller"><div id="list" class="list"></div></div>`;

const list = document.querySelector<HTMLElement>('#list')!;

for (let i = 1; i <= 6; i += 1) {
  const row = document.createElement('div');

  row.className = 'row';
  row.textContent = `Row ${i}`;
  list.append(row);
}

let controller: ReturnType<typeof sortable>;

const act = (where: string): void => {
  const action = read('action');

  log(`request from ${where}: ${action}`, 'request');

  if (action === 'cancel') {
    controller.requestCancel('asked mid-step');
  } else if (action === 'destroy') {
    void controller.requestDestroy().then(() => {
      log('destroy settled; press Rebuild to try again');
    });
  } else {
    list.firstElementChild!.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
    );
  }
};

class RequestProbe extends HTMLElement {
  static readonly observedAttributes = ['data-poke'];

  connectedCallback(): void {
    if (read('from') === 'reaction' && read('when') === 'activation') {
      act('connectedCallback');
    }
  }

  attributeChangedCallback(): void {
    if (read('from') === 'reaction') {
      act('attributeChangedCallback');
    }
  }
}

customElements.define('request-probe', RequestProbe);

// Never connected: an attribute write still runs its reaction.
const probe = document.createElement('request-probe');

const poke = (stage: string): void => {
  if (read('when') === stage) {
    if (read('from') === 'reaction') {
      probe.setAttribute('data-poke', String(Math.random()));
    } else {
      probe.dispatchEvent(new Event('poke'));
    }
  }
};

probe.addEventListener('poke', () => {
  act('a listener');
});

const build = (): void => {
  controller = sortable(list, {
    items: () =>
      [...list.children].filter(
        (element) => !element.hasAttribute('data-drag-placeholder'),
      ) as HTMLElement[],
    axis: y(),
    landing: landing({
      duration() {
        log('landing: duration read');
        poke('landing');
        log('landing: the step continues');
        return 300;
      },
    }),
    placeholder() {
      log('activation: placeholder made');

      if (read('from') === 'listener') {
        poke('activation');
      }

      return document.createElement('request-probe');
    },
    onStart() {
      log('onStart');
    },
    onReorder({ item, next }) {
      log('drop: onReorder');
      poke('drop');
      log('drop: the step continues');
      list.insertBefore(item, next);
      return ReorderResolution.accept();
    },
    onEnd(result) {
      log(describeResult(result));
    },
  });
};

build();
document.querySelector('#rebuild')!.addEventListener('click', build);
