// Scratch probe for repo:RF-36, removed after its reading. It repeats the two
// Safari-skipped rows' gesture and logs when each step of the landing happens.
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { server } from 'vitest/browser';
import { useShadowDOM } from '../../src/controllers/useShadowDOM.ts';
import { ControlledElement } from '../../src/element.ts';
import { impl } from '../../src/traits/attributes.ts';
import {
  Reorderable,
  useReorderable,
  useReorderableItem,
} from '../../src/traits/reorderable.ts';
import { host, nextFrame } from '../browser.ts';

const ReorderableCore = impl(ControlledElement, [Reorderable] as const);

function createList() {
  const template = document.createElement('template');
  template.innerHTML = '<slot></slot>';
  return host((h) => {
    useShadowDOM(h, [template], []);
    useReorderable(h, () => ({ duration: 200, easing: 'ease-out' }));
  }, ReorderableCore);
}

function frameInterval(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame((first) => {
      requestAnimationFrame((second) => resolve(second - first));
    });
  });
}

const REPEATS = 15;

describe.runIf(server.browser !== 'firefox')('RF-36 probe', () => {
  for (let run = 1; run <= REPEATS; run += 1) {
    it(`should time landing ${run}`, async () => {
      const ue = userEvent.setup();
      const list = createList();
      const item = host((h) => {
        useReorderableItem(h);
      });
      document.body.append(list);
      list.append(item);
      list.reorderable = true;
      await nextFrame();

      const t: Record<string, number> = {};
      const mark = (name: string) => {
        t[name] ??= performance.now();
      };
      window.addEventListener('pointerup', () => mark('pointerup'), {
        capture: true,
        once: true,
      });
      item.addEventListener('toggle', (event) => {
        mark(`toggle-${(event as ToggleEvent).newState}`);
      });
      const animate = item.animate.bind(item);
      item.animate = (...args) => {
        mark('animation-start');
        const animation = animate(...args);
        animation.finished.then(
          () => mark('animation-finished'),
          () => mark('animation-cancelled'),
        );
        return animation;
      };

      const before = {
        visibility: document.visibilityState,
        focus: document.hasFocus(),
        frame: await frameInterval(),
      };
      const start = performance.now();
      await ue.pointer([
        { target: item, keys: '[MouseLeft>]', coords: { clientY: 10 } },
        { coords: { clientY: 100 } },
        { keys: '[/MouseLeft]' },
      ]);
      mark('pointer-end');
      mark('wait-start');
      await vi.waitFor(
        () => expect(item.matches(':popover-open')).toBeFalsy(),
        {
          timeout: 5000,
          interval: 5,
        },
      );
      mark('popover-closed');
      const after = {
        visibility: document.visibilityState,
        focus: document.hasFocus(),
        frame: await frameInterval(),
      };

      const relative = Object.fromEntries(
        Object.entries(t).map(([name, time]) => [
          name,
          Math.round(time - start),
        ]),
      );
      // oxlint-disable-next-line no-console
      console.log(
        `RF36 ${server.browser} run ${run} ${JSON.stringify({ ...relative, before, after })}`,
      );
      list.remove();
    });
  }
});
