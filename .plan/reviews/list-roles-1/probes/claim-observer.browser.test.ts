// Re-check of the feature proof's `reviewer-1` at 0bf998d2f: the sortable
// item's claim observer. MutationObserver is wrapped before the list modules
// load, so each item observer (the one whose attributeFilter is the claimed
// names) reports whether it still observes and how often its callback ran.
//
// Copy it to packages/material-x/tests/list/ and run, from
// packages/material-x:
//   MX_TEST_ENGINES=chromium,firefox,webkit aube exec vitest run \
//     -c vitest.config.ts tests/list/claim-observer.browser.test.ts \
//     --silent=false
// Each case logs one `CLAIM` line. Reading: ../checks/claim-observer.txt.
import { $ } from '@ydinjs/core/utils/DOM.js';
import { beforeAll, expect, it } from 'vitest';
import { server } from 'vitest/browser';
import { nextFrame } from '../browser.ts';

type Watched = { observing: boolean; calls: number; filter: string };
const watched: Watched[] = [];
const ITEM_FILTER = 'tabindex,role,aria-label,aria-description';

beforeAll(async () => {
  const Native = window.MutationObserver;
  window.MutationObserver = class extends Native {
    readonly #record: Watched;

    constructor(callback: MutationCallback) {
      const record: Watched = { observing: false, calls: 0, filter: '' };
      super((records, observer) => {
        record.calls += 1;
        callback(records, observer);
      });
      this.#record = record;
      watched.push(record);
    }

    override observe(target: Node, options?: MutationObserverInit): void {
      this.#record.observing = true;
      this.#record.filter = String(options?.attributeFilter ?? '');
      super.observe(target, options);
    }

    override disconnect(): void {
      this.#record.observing = false;
      super.disconnect();
    }
  };
  await import('../../src/list/list-button-item.ts');
  await import('../../src/list/list-item.ts');
  await import('../../src/list/list.ts');
  await import('../../src/list/sortable-list.ts');
});

const items = (): Watched[] => watched.filter((w) => w.filter === ITEM_FILTER);
const observing = (): number => items().filter((w) => w.observing).length;
const calls = (): number => items().reduce((sum, w) => sum + w.calls, 0);

function item(tag: string, label: string): HTMLElement {
  const element = document.createElement(tag);
  element.append(label);
  return element;
}

function handle(): HTMLElement {
  const span = document.createElement('span');
  span.slot = 'trail';
  span.dataset['handle'] = '';
  span.textContent = '≡';
  return span;
}

async function sortable(...children: HTMLElement[]): Promise<HTMLElement> {
  const list = document.createElement('mx-sortable-list');
  list.append(...children);
  document.body.append(list);
  await nextFrame();
  return list;
}

const log = (name: string, value: unknown): void => {
  console.log(`CLAIM ${server.browser} ${name} | ${JSON.stringify(value)}`);
};

it('reads the observers after a release by a move into mx-list, and writes after it', async () => {
  const a = item('mx-list-item', 'A');
  const b = item('mx-list-button-item', 'B');
  const list = await sortable(a, b);
  const during = observing();
  const plain = document.createElement('mx-list');
  document.body.append(plain);
  plain.append(a, b);
  await nextFrame();
  const after = observing();
  const callsAtRelease = calls();
  for (let i = 0; i < 5; i += 1) {
    a.setAttribute('tabindex', String(i));
    a.setAttribute('aria-description', `d${i}`);
    b.setAttribute('aria-description', `d${i}`);
  }
  await nextFrame();
  await nextFrame();
  log('move into mx-list', {
    observingInList: during,
    observingAfterRelease: after,
    callbacksAfterRelease: calls() - callsAtRelease,
  });
  list.remove();
  plain.remove();
  expect(true).toBe(true);
});

it('reads the observers after the item is removed from the document', async () => {
  const before = observing();
  const a = item('mx-list-item', 'A');
  const list = await sortable(a);
  const during = observing() - before;
  a.remove();
  await nextFrame();
  log('removed from the document', {
    observingInList: during,
    observingAfterRemoval: observing() - before,
  });
  list.remove();
  expect(true).toBe(true);
});

it('reads the observers after 20 moves between two sortable lists', async () => {
  const before = observing();
  const created = items().length;
  const a = item('mx-list-item', 'A');
  const one = await sortable(a);
  const two = await sortable();
  for (let i = 0; i < 20; i += 1) {
    (i % 2 ? one : two).append(a);
    await nextFrame();
  }
  log('20 moves', {
    observersCreated: items().length - created,
    observingNow: observing() - before,
    claimed: [a.getAttribute('tabindex'), a.getAttribute('aria-description')],
  });
  one.remove();
  two.remove();
  expect(true).toBe(true);
});

it("reads a button item whose host gets a consumer's description in the same task as a handle", async () => {
  const b = item('mx-list-button-item', 'B');
  const list = await sortable(b);
  const control = $<HTMLElement>(b, '.host')!;
  const claimed = control.getAttribute('aria-description');
  b.setAttribute('aria-description', 'Mine');
  b.prepend(handle());
  await nextFrame();
  log('button item, description and handle in one task', {
    claimed,
    control: control.getAttribute('aria-description'),
  });
  list.remove();
  expect(true).toBe(true);
});

it("reads a static host whose tabindex the consumer removed, then the item's next update", async () => {
  const a = item('mx-list-item', 'A');
  const list = await sortable(a);
  a.removeAttribute('tabindex');
  await nextFrame();
  const removed = a.getAttribute('tabindex');
  const lead = document.createElement('span');
  lead.slot = 'lead';
  a.prepend(lead);
  await nextFrame();
  const afterUpdate = a.getAttribute('tabindex');
  const plain = document.createElement('mx-list');
  document.body.append(plain);
  plain.append(a);
  await nextFrame();
  log('removal, then update, then release', {
    removed,
    afterUpdate,
    afterRelease: a.getAttribute('tabindex'),
  });
  list.remove();
  plain.remove();
  expect(true).toBe(true);
});

it("reads a handle's touch-action that the consumer writes after the claim", async () => {
  const a = item('mx-list-item', 'A');
  const h = handle();
  a.prepend(h);
  const b = item('mx-list-item', 'B');
  const g = handle();
  b.prepend(g);
  const list = await sortable(a, b);
  h.style.touchAction = 'none';
  g.style.touchAction = 'pan-y';
  await nextFrame();
  h.remove();
  g.remove();
  await nextFrame();
  log('touch-action', {
    sameValue: h.style.touchAction,
    otherValue: g.style.touchAction,
  });
  list.remove();
  expect(true).toBe(true);
});
