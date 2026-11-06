/**
 * The prototype's focused checks, one per assumption most likely to invalidate
 * the design, with real input in each engine. `node checks/run.ts [engine...]`.
 *
 * An engine that cannot launch is recorded as not run, and nothing stands in for
 * it. Writes `.plan/probes/prototype/checks.json`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, type Page, webkit } from 'playwright';
import { createServer } from 'vite';

// Evaluated in the page, where `harness.ts` installs it.
declare const lab: any;

const here = fileURLToPath(new URL('./', import.meta.url));
const output = `${here}../../.plan/probes/prototype/checks.json`;

type Row = { id: string; group: number; pass: boolean; detail: string };
type Scenario = {
  id: string;
  group: number;
  /** Records what it saw and cannot fail. */
  observe?: boolean;
  run(page: Page, note: (text: string) => void): Promise<void>;
};

function equal(actual: unknown, expected: unknown, what: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);

  if (a !== e) {
    throw new Error(`${what}: expected ${e}, got ${a}`);
  }
}

function near(actual: number, expected: number, what: string, slack = 1): void {
  if (Math.abs(actual - expected) > slack) {
    throw new Error(`${what}: expected ${expected}±${slack}, got ${actual}`);
  }
}

const frames = (page: Page, count = 2): Promise<void> =>
  page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        const step = (left: number): void => {
          if (left === 0) {
            resolve();
          } else {
            requestAnimationFrame(() => {
              step(left - 1);
            });
          }
        };

        step(n);
      }),
    count,
  );

const centre = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const { left, top, width, height } = document
      .querySelector(s)!
      .getBoundingClientRect();

    return { x: left + width / 2, y: top + height / 2, left, top };
  }, selector);

/** Presses on `selector` and carries the pointer past the threshold by `dy`. */
async function grab(
  page: Page,
  selector: string,
  dx = 0,
  dy = 40,
): Promise<{ x: number; y: number }> {
  const start = await centre(page, selector);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx / 2, start.y + dy / 2, { steps: 2 });
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 2 });
  await frames(page);

  return { x: start.x + dx, y: start.y + dy };
}

async function dragAndDrop(
  page: Page,
  selector: string,
  dy: number,
): Promise<void> {
  await grab(page, selector, 0, dy);
  await page.mouse.up();
  await frames(page);
}

const log = (page: Page): Promise<string[]> => page.evaluate(() => lab.log);

/* -------- 1. the click guard -------- */

const clickGuard: Scenario[] = [
  {
    id: 'flow-1: trailing click swallowed, next outside click delivered',
    group: 1,
    async run(page, note) {
      await page.evaluate(() => {
        lab.basicSortable(lab.makeList(4));
      });
      await dragAndDrop(page, '#r0', 90);
      equal(await log(page), ['start', 'end:accepted'], 'terminals');

      const raw = await page.evaluate(() => lab.rawClicks.length);

      note(`platform produced ${raw} trailing click(s)`);
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        [],
        'trailing click',
      );
      await page.click('#out');
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        ['out'],
        'next click',
      );
    },
  },
  {
    id: 'a rejected drop, which leaves the row where the press landed: trailing click swallowed',
    group: 1,
    async run(page, note) {
      await page.evaluate(() => {
        lab.basicSortable(lab.makeList(4), {
          onReorder: () => lab.ReorderResolution.reject('no'),
        });
      });
      await dragAndDrop(page, '#r0', 90);
      equal(await log(page), ['start', 'end:rejected'], 'terminals');
      note(
        `platform produced ${await page.evaluate(() => lab.rawClicks.length)} trailing click(s)`,
      );
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        [],
        'trailing click',
      );
      await page.click('#out');
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        ['out'],
        'next click',
      );
    },
  },
  {
    id: 'cancel with the button held: trailing click swallowed, next delivered',
    group: 1,
    async run(page, note) {
      await page.evaluate(() => {
        lab.basicSortable(lab.makeList(4));
      });
      await grab(page, '#r0');
      await page.keyboard.press('Escape');
      await frames(page);
      equal(
        await log(page),
        ['start', 'end:canceled'],
        'cancel applied while held',
      );
      await page.mouse.up();
      await frames(page);
      note(
        `platform produced ${await page.evaluate(() => lab.rawClicks.length)} trailing click(s)`,
      );
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        [],
        'trailing click',
      );
      await page.click('#out');
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        ['out'],
        'next click',
      );
    },
  },
  {
    id: 'a press below the threshold keeps its click',
    group: 1,
    async run(page) {
      await page.evaluate(() => {
        lab.basicSortable(lab.makeList(4));
      });

      const { x, y } = await centre(page, '#r1');

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 2, y + 2);
      await page.mouse.up();
      await frames(page);
      equal(await page.evaluate(() => lab.deliveredClicks), ['r1'], 'click');
      equal(await log(page), [], 'no terminals');
    },
  },
  {
    id: 'a later click on the same row is delivered at once',
    group: 1,
    async run(page) {
      await page.evaluate(() => {
        lab.basicSortable(lab.makeList(4));
      });
      await dragAndDrop(page, '#r0', 90);
      await page.click('#r3');
      equal(await page.evaluate(() => lab.deliveredClicks), ['r3'], 'click');
    },
  },
  {
    id: 'the guard holds for a custom behavior with no lift',
    group: 1,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(2);

        lab.draggable(list, {
          lift: false,
          admit: (event: Event) => ({ item: event.target }),
        });
      });
      await dragAndDrop(page, '#r0', 30);
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        [],
        'trailing click',
      );
      await page.click('#out');
      equal(
        await page.evaluate(() => lab.deliveredClicks),
        ['out'],
        'next click',
      );
    },
  },
];

/* -------- 2. top-layer lift and additive landing -------- */

const presentation: Scenario[] = [
  {
    id: 'an item dragged out of an overflow:hidden list stays visible',
    group: 2,
    async run(page) {
      await page.evaluate(() => {
        lab.basicSortable(
          lab.makeList(6, document.body, 'height:100px;overflow:hidden'),
        );
      });

      const at = await grab(page, '#r0', 300, 160);
      const hit = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.id,
        at,
      );

      equal(hit, 'r0', 'the top element under the pointer');
      await page.mouse.up();
    },
  },
  {
    id: 'a later positioned panel does not cover the item',
    group: 2,
    async run(page) {
      await page.evaluate(() => {
        lab.basicSortable(lab.makeList(4));

        const panel = document.createElement('div');

        panel.id = 'panel';
        panel.style.cssText =
          'position:fixed;inset:0;z-index:999;background:#f004;';
        document.body.append(panel);
        panel.style.pointerEvents = 'none';
      });

      const at = await grab(page, '#r0', 40, 60);
      const stack = await page.evaluate(({ x, y }) => {
        const panel = document.querySelector<HTMLElement>('#panel')!;

        panel.style.pointerEvents = 'auto';

        const top = document.elementFromPoint(x, y)?.id;

        panel.style.pointerEvents = 'none';
        return top;
      }, at);

      equal(stack, 'r0', 'the top element under the pointer');
      await page.mouse.up();
    },
  },
  ...(
    [
      ['ancestor scale(.5)', 'transform:scale(.5);transform-origin:0 0'],
      ['ancestor zoom:2', 'zoom:2'],
    ] as const
  ).map(([name, css]): Scenario => ({
    id: `${name}: the item follows the pointer exactly`,
    group: 2,
    async run(page) {
      await page.evaluate((style) => {
        const host = document.createElement('div');

        host.style.cssText = style;
        document.body.append(host);
        lab.basicSortable(lab.makeList(5, host));
      }, css);

      const before = await centre(page, '#r0');

      await grab(page, '#r0', 60, 40);

      const during = await centre(page, '#r0');

      near(during.x - before.x, 60, 'x travel');
      near(during.y - before.y, 40, 'y travel');
      await page.mouse.up();
      await frames(page);
      equal(
        await page.evaluate(() => lab.clean(document.querySelector('#list'))),
        true,
        'clean',
      );
    },
  })),
  {
    id: 'a list in a shadow root',
    group: 2,
    async run(page) {
      await page.evaluate(() => {
        const host = document.createElement('div');

        host.id = 'host';
        document.body.append(host);

        const root = host.attachShadow({ mode: 'open' });
        const list = lab.makeList(4, root);

        list.style.cssText = 'width:200px';

        for (const row of list.children) {
          (row as HTMLElement).style.cssText =
            'height:40px;touch-action:none;user-select:none';
        }

        lab.basicSortable(list);
        lab.list = list;
      });

      const { left, top } = await centre(page, '#host');

      await page.mouse.move(left + 50, top + 20);
      await page.mouse.down();
      await page.mouse.move(left + 50, top + 60, { steps: 3 });
      await frames(page);
      await page.mouse.move(left + 50, top + 110, { steps: 3 });
      await frames(page);
      await page.mouse.up();
      equal(await log(page), ['start', 'end:accepted'], 'terminals');
      equal(
        await page.evaluate(() => lab.order(lab.list)),
        'r1,r2,r0,r3',
        'order',
      );
    },
  },
  {
    id: 'a parent-controlled same-origin iframe',
    group: 2,
    async run(page) {
      await page.evaluate(() => {
        const frame = document.createElement('iframe');

        frame.id = 'frame';
        frame.style.cssText = 'width:300px;height:300px;border:0';
        document.body.append(frame);

        const inner = frame.contentDocument!;
        const list = lab.makeList(4, inner.body);

        for (const row of list.children) {
          (row as HTMLElement).style.cssText =
            'height:40px;touch-action:none;user-select:none';
        }

        lab.basicSortable(list);
        lab.list = list;
      });

      const { left, top } = await centre(page, '#frame');
      const row = await page.evaluate(
        () => lab.list.children[0].getBoundingClientRect().top,
      );

      await page.mouse.move(left + 50, top + row + 20);
      await page.mouse.down();
      await page.mouse.move(left + 50, top + row + 60, { steps: 3 });
      await frames(page);
      await page.mouse.move(left + 50, top + row + 110, { steps: 3 });
      await frames(page);
      await page.mouse.up();
      await frames(page);
      equal(await log(page), ['start', 'end:accepted'], 'terminals');
      equal(
        await page.evaluate(() => lab.order(lab.list)),
        'r1,r2,r0,r3',
        'order',
      );
    },
  },
  {
    id: 'a rejected drop lands home from where it was dropped, additively',
    group: 2,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);

        lab.basicSortable(list, {
          landing: lab.landing({ duration: 600, easing: 'linear' }),
          onReorder: () => lab.ReorderResolution.reject('no'),
        });
      });

      const home = await centre(page, '#r0');

      await grab(page, '#r0', 0, 90);
      await page.mouse.up();

      const running = await page.evaluate(() => {
        const row = document.querySelector<HTMLElement>('#r0')!;
        const [animation] = row.getAnimations();
        const effect = animation?.effect as KeyframeEffect | undefined;

        return {
          count: row.getAnimations().length,
          composite: effect?.composite,
          top: row.getBoundingClientRect().top,
        };
      });

      equal(running.count, 1, 'landing animations');
      equal(running.composite, 'add', 'composite');

      if (running.top <= home.top + 5) {
        throw new Error(`the landing starts at home: ${running.top}`);
      }

      await page.evaluate(() =>
        Promise.all(
          document
            .querySelector('#r0')!
            .getAnimations()
            .map((animation) => animation.finished),
        ),
      );

      const after = await centre(page, '#r0');

      near(after.y, home.y, 'landed home');
      equal(
        await log(page),
        ['start', 'end:rejected'],
        'the terminal did not wait',
      );
    },
  },
  {
    id: 'the terminal runs before the landing ends, and presentation is already released',
    group: 2,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);

        lab.basicSortable(list, {
          landing: lab.landing({ duration: 600 }),
          onEnd() {
            const row = document.querySelector<HTMLElement>('#r0')!;

            lab.log.push(
              `open=${row.matches(':popover-open')} hole=${Boolean(list.querySelector('[data-drag-placeholder]'))} animating=${row.getAnimations().length}`,
            );
          },
        });
      });
      await dragAndDrop(page, '#r0', 90);
      equal(
        await log(page),
        ['start', 'open=false hole=false animating=1'],
        'onEnd saw',
      );
    },
  },
  {
    id: 'elevation: a landing item against a positioned sibling',
    group: 2,
    observe: true,
    async run(page, note) {
      await page.evaluate(() => {
        const list = lab.makeList(4);

        for (const row of list.children) {
          (row as HTMLElement).style.position = 'relative';
        }

        lab.basicSortable(list, {
          landing: lab.landing({ duration: 1000, easing: 'linear' }),
          onReorder: () => lab.ReorderResolution.reject('no'),
        });
      });
      await grab(page, '#r0', 0, 90);
      await page.mouse.up();

      const seen = await page.evaluate(() => {
        const row = document.querySelector('#r0')!;
        const { left, top, width, height } = row.getBoundingClientRect();

        return document.elementFromPoint(left + width / 2, top + height / 2)
          ?.id;
      });

      note(`mid-landing, the top element at the item's centre is ${seen}`);
    },
  },
];

/* -------- 3. the single-pass rule through the public API -------- */

const clearsAndWorks = async (page: Page): Promise<void> => {
  equal(
    await page.evaluate(() => lab.clean(document.querySelector('#list'))),
    true,
    'clean',
  );
};

const reactions: Scenario[] = [
  {
    id: 'sortable: a reaction cancels during activation',
    group: 3,
    async run(page) {
      await page.evaluate(() => {
        let controller: { requestCancel(reason: unknown): void };

        lab.ReactionProbe.react = () => {
          controller.requestCancel('reaction');
        };
        controller = lab.basicSortable(lab.makeList(4), {
          placeholder: () => document.createElement('reaction-probe'),
        });
      });
      await grab(page, '#r0');
      equal(await log(page), ['start', 'end:canceled'], 'order');
      await page.mouse.up();
      await clearsAndWorks(page);
      await page.evaluate(() => {
        lab.ReactionProbe.react = null;
      });
      await dragAndDrop(page, '#r0', 90);
      equal(
        await log(page),
        ['start', 'end:canceled', 'start', 'end:accepted'],
        'the next drag',
      );
    },
  },
  {
    id: 'sortable: a reaction destroys during activation',
    group: 3,
    async run(page) {
      await page.evaluate(() => {
        let controller: { requestDestroy(): Promise<void> };

        lab.ReactionProbe.react = () => {
          void controller
            .requestDestroy()
            .then(() => lab.log.push('destroyed'));
        };
        controller = lab.basicSortable(lab.makeList(4), {
          placeholder: () => document.createElement('reaction-probe'),
        });
      });
      await grab(page, '#r0');
      await page.mouse.up();
      await frames(page);
      equal(await log(page), ['start', 'destroyed'], 'order');
      await clearsAndWorks(page);
    },
  },
  ...(['cancel', 'destroy', 'press'] as const).map((action): Scenario => ({
    id: `custom behavior: a reaction during activate asks to ${action}`,
    group: 3,
    async run(page) {
      await page.evaluate((asked) => {
        const list = lab.makeList(4);
        const probe = document.createElement('reaction-probe');

        document.body.append(probe);

        const panel = lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          activate() {
            lab.log.push('activate:before');
            probe.setAttribute('data-poke', '1');
            lab.log.push('activate:after');
          },
          start: () => lab.log.push('start'),
          move(drag: any) {
            drag.translate(drag.x - drag.originX, drag.y - drag.originY);
          },
          end: (_: unknown, outcome: { type: string }) =>
            lab.log.push(`end:${outcome.type}`),
        });

        lab.ReactionProbe.react = () => {
          lab.ReactionProbe.react = null;
          lab.log.push(`request:${asked}`);

          if (asked === 'cancel') {
            panel.requestCancel('reaction');
          } else if (asked === 'destroy') {
            void panel.requestDestroy();
          } else {
            list.firstElementChild!.dispatchEvent(
              new PointerEvent('pointerdown', {
                bubbles: true,
                isPrimary: true,
              }),
            );
          }
        };
      }, action);
      await grab(page, '#r1');

      const running = [
        'activate:before',
        `request:${action}`,
        'activate:after',
        'start',
      ];

      if (action === 'cancel') {
        equal(await log(page), [...running, 'end:canceled'], 'order');
      } else if (action === 'destroy') {
        equal(await log(page), running, 'order');
      } else {
        equal(await log(page), running, 'order, the drag alive');
        equal(
          await page.evaluate(
            () => (globalThis as any).__dragRefused?.untrusted,
          ),
          1,
          'the instrument saw the nested press',
        );
      }

      await page.mouse.up();
      await frames(page);

      if (action === 'press') {
        equal(
          (await log(page)).at(-1),
          'end:skipped',
          'the real release drops',
        );
      }

      await clearsAndWorks(page);
    },
  })),
  {
    id: 'custom behavior: requests from every hook leave that step alone',
    group: 3,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        let cancelInSettle = false;
        const panel = lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          move() {
            lab.log.push('move:before');
            panel.requestCancel('from move');
            lab.log.push('move:after');
          },
          settle(_: unknown, outcome: { reason: unknown }) {
            cancelInSettle = true;
            panel.requestCancel('too late');
            lab.log.push(`settle:${String(outcome.reason)}`);
            return null;
          },
          end(_: unknown, outcome: { reason: unknown }) {
            lab.log.push(`end:${String(outcome.reason)}:${cancelInSettle}`);
          },
        });
      });
      await grab(page, '#r0');
      await page.mouse.up();
      equal(
        await log(page),
        ['move:before', 'move:after', 'settle:from move', 'end:from move:true'],
        'order',
      );
    },
  },
  {
    id: 'a destroy requested from settle is applied before the terminal',
    group: 3,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        const panel = lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          settle() {
            void panel.requestDestroy();
            return null;
          },
          end: () => lab.log.push('end'),
        });
      });
      await dragAndDrop(page, '#r0', 30);
      equal(await log(page), [], 'no terminal');
      await clearsAndWorks(page);
    },
  },
  // One page per kind: on a page where three drags run, WebKit's mouse stream
  // stops during the third, with no library loaded at all.
  ...(['cancel', 'destroy', 'fault'] as const).map((kind): Scenario => ({
    id: `no terminal without a start: ${kind} before start`,
    group: 3,
    async run(page) {
      await page.evaluate((asked) => {
        const list = lab.makeList(1);
        const panel = lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          activate() {
            if (asked === 'cancel') {
              panel.requestCancel('early');
            } else if (asked === 'destroy') {
              void panel.requestDestroy();
            }

            throw new Error(asked);
          },
          start: () => lab.log.push('start'),
          end: () => lab.log.push('end'),
        });
      }, kind);
      await dragAndDrop(page, '#r0', 30);
      equal(await log(page), [], 'no start and no end');
      equal(
        await page.evaluate(() =>
          lab.faults.map((fault: any) => fault.cause.message),
        ),
        [kind],
        'the throw is reported',
      );
      await clearsAndWorks(page);
    },
  })),
];

/* -------- 4. reporting when caught -------- */

const reporting: Scenario[] = [
  {
    id: 'two faults in one pass: each reported once, the first decides',
    group: 4,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        const first = new Error('first');
        const second = new Error('second');

        lab.first = first;
        lab.second = second;
        lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          activate(drag: any) {
            drag.use(() => {
              throw second;
            });
          },
          start() {
            throw first;
          },
          end(_: unknown, outcome: any) {
            lab.log.push(
              `${outcome.origin}:${outcome.reason.cause === first}:${outcome.reason === lab.faults[0]}`,
            );
          },
        });
      });
      await grab(page, '#r0');
      await page.mouse.up();
      equal(await log(page), ['fault:true:true'], 'the deciding fault');
      equal(
        await page.evaluate(() =>
          lab.faults.map((fault: any) => fault.cause.message),
        ),
        ['first', 'second'],
        'reports',
      );
    },
  },
  {
    id: 'a fault during destruction, and a throwing disposer, reported once each',
    group: 4,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        const panel = lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          activate(drag: any) {
            drag.use(() => {
              throw new Error('disposer 1');
            });
            drag.use(() => {
              throw new Error('disposer 2');
            });
          },
          end: () => lab.log.push('end'),
        });

        panel.use(() => {
          throw new Error('controller use');
        });
        lab.panel = panel;
      });
      await grab(page, '#r0');
      await page.evaluate(() =>
        lab.panel.requestDestroy().then(() => lab.log.push('destroyed')),
      );
      await page.mouse.up();
      equal(await log(page), ['destroyed'], 'no end, and the promise settled');
      equal(
        await page.evaluate(() =>
          lab.faults.map((fault: any) => fault.cause.message),
        ),
        ['disposer 2', 'disposer 1', 'controller use'],
        'reports',
      );
    },
  },
  {
    id: 'the hostile values arrive once, typed, with cause identity',
    group: 4,
    async run(page) {
      const results = await page.evaluate(async () => {
        const hostile = {
          get message() {
            throw new Error('getter');
          },
        };
        const proxy = new Proxy(
          {},
          {
            get() {
              throw new Error('proxy');
            },
          },
        );
        const values = [
          new Error('plain'),
          null,
          undefined,
          'text',
          Symbol('symbol'),
          Object.freeze(new Error('frozen')),
          hostile,
          proxy,
        ];

        return values.map((value) => {
          lab.faults.length = 0;

          const root = document.createElement('div');

          document.body.append(root);

          const panel = lab.draggable(root, {
            admit() {
              throw value;
            },
          });

          root.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
          );
          void panel.requestDestroy();
          root.remove();

          return (
            lab.faults.length === 1 &&
            lab.faults[0] instanceof lab.DragFault &&
            lab.faults[0].cause === value &&
            typeof lab.faults[0].message === 'string'
          );
        });
      });

      equal(
        results,
        results.map(() => true),
        'each value',
      );
    },
  },
  {
    id: 'a global listener that requests cancel leaves origin fault',
    group: 4,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        const panel = lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          start() {
            throw new Error('boom');
          },
          end(_: unknown, outcome: any) {
            lab.log.push(
              `${outcome.origin}:${outcome.reason === lab.faults[0]}`,
            );
          },
        });

        addEventListener('error', () => {
          panel.requestCancel('from the listener');
        });
      });
      await grab(page, '#r0');
      await page.mouse.up();
      equal(await log(page), ['fault:true'], 'the outcome');
    },
  },
  {
    id: 'a global listener that requests destroy delivers no terminal',
    group: 4,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        const panel = lab.draggable(list, {
          admit: (event: Event) => ({ item: event.target }),
          start() {
            lab.log.push('start');
            throw new Error('boom');
          },
          end: () => lab.log.push('end'),
        });

        addEventListener('error', () => {
          void panel.requestDestroy().then(() => lab.log.push('destroyed'));
        });
      });
      await grab(page, '#r0');
      await page.mouse.up();
      await frames(page);
      equal(await log(page), ['start', 'destroyed'], 'order');
      await clearsAndWorks(page);
    },
  },
  {
    id: 'sortable: a thrown and a rejected verdict both reach onEnd as the reported fault',
    group: 4,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        let round = 0;

        lab.basicSortable(list, {
          onReorder() {
            round += 1;

            if (round === 1) {
              throw new Error('thrown');
            }

            return Promise.reject(new Error('rejected'));
          },
          onEnd(result: any) {
            lab.log.push(
              `${result.type}:${result.origin}:${result.reason.cause.message}:${result.reason === lab.faults.at(-1)}`,
            );
          },
        });
      });
      await dragAndDrop(page, '#r0', 90);
      await dragAndDrop(page, '#r0', 90);
      await frames(page);
      equal(
        (await log(page)).filter((line) => line !== 'start'),
        ['canceled:fault:thrown:true', 'canceled:fault:rejected:true'],
        'results',
      );
      equal(await page.evaluate(() => lab.faults.length), 2, 'reports');
      equal(
        await page.evaluate(() => lab.rejections.length),
        0,
        'unhandled rejections',
      );
    },
  },
];

/* -------- 5. precedence in place of FIFO -------- */

const precedence: Scenario[] = [
  {
    id: 'collection work queued by a release, which then cancels',
    group: 5,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(5);
        const removed = document.querySelector('#r4')!;
        let pulls = 0;
        let round = 0;
        const controller = lab.basicSortable(list, {
          items() {
            pulls += 1;
            return lab.rowsOf(list);
          },
          onReorder({ item, next }: any) {
            round += 1;

            if (round > 1) {
              list.insertBefore(item, next);
              return lab.ReorderResolution.accept();
            }

            removed.remove();
            controller.invalidate();
            controller.requestCancel('after the work');
            return lab.ReorderResolution.accept();
          },
          onEnd(result: any) {
            lab.log.push(
              `${result.type}:${result.origin}:${result.reason}:pulls=${pulls}`,
            );
          },
        });
      });
      await dragAndDrop(page, '#r0', 90);
      equal(
        await log(page),
        ['start', 'canceled:request:after the work:pulls=1'],
        'result',
      );
      await clearsAndWorks(page);
      await dragAndDrop(page, '#r1', 60);
      equal(
        (await log(page)).at(-1),
        'accepted:undefined:undefined:pulls=2',
        'next drag pulls fresh',
      );
    },
  },
  {
    id: 'collection work queued by a release, which then faults',
    group: 5,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(5);
        const controller = lab.basicSortable(list, {
          onReorder() {
            controller.invalidate();
            throw new Error('after the work');
          },
          onEnd(result: any) {
            lab.log.push(
              `${result.type}:${result.origin}:${result.reason.cause.message}`,
            );
          },
        });
      });
      await dragAndDrop(page, '#r0', 90);
      equal(
        await log(page),
        ['start', 'canceled:fault:after the work'],
        'result',
      );
      equal(await page.evaluate(() => lab.faults.length), 1, 'reports');
      await clearsAndWorks(page);
    },
  },
  {
    id: 'a cancel, then collection work, in one mid-drag callback: observed pulls',
    group: 5,
    async run(page, note) {
      await page.evaluate(() => {
        const list = lab.makeList(5);
        let pulls = 0;
        const panel = lab.basicSortable(list, {
          items() {
            pulls += 1;
            return lab.rowsOf(list);
          },
          onStart() {
            panel.requestCancel('first');
            panel.invalidate();
          },
          onEnd(result: any) {
            lab.log.push(`${result.reason}:pulls=${pulls}`);
          },
        });
      });
      await grab(page, '#r0');
      await page.mouse.up();

      const [line] = await log(page);

      note(`deferred work runs before the cancel: ${line}`);
      equal(line, 'first:pulls=2', 'result');
    },
  },
  {
    id: 'a sibling removed with invalidate during a drag rebases; the dragged item removed cancels',
    group: 5,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(5);
        const controller = lab.basicSortable(list);

        lab.controller = controller;
      });
      await grab(page, '#r0', 0, 20);
      await page.evaluate(() => {
        document.querySelector('#r4')!.remove();
        lab.controller.invalidate();
      });
      await frames(page);
      equal(await log(page), ['start'], 'a surviving gap continues');
      await page.evaluate(() => {
        document.querySelector('#r0')!.remove();
        lab.controller.invalidate();
      });
      await page.mouse.up();
      equal(
        await log(page),
        ['start', 'end:canceled'],
        'a removed item cancels',
      );
    },
  },
];

/* -------- 7. a late verdict -------- */

const lateVerdict: Scenario[] = [
  ...(['resolve', 'reject'] as const).map((how): Scenario => ({
    id: `a late ${how} after a cancel never reaches the next drag`,
    group: 7,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(5);

        lab.pending = [];
        lab.signals = [];
        lab.basicSortable(list, {
          onReorder(_: unknown, { signal }: { signal: AbortSignal }) {
            lab.signals.push(signal);
            return new Promise((resolve, reject) => {
              lab.pending.push({ resolve, reject });
            });
          },
        });
      });
      await dragAndDrop(page, '#r0', 90);
      await page.keyboard.press('Escape');
      await frames(page);
      equal(await log(page), ['start', 'end:canceled'], 'cancel');
      equal(
        await page.evaluate(() => lab.signals[0].aborted),
        true,
        'the signal aborted',
      );
      // A second drag is mid-flight when the first verdict arrives.
      await grab(page, '#r1');
      await page.evaluate((settle) => {
        const { resolve, reject } = lab.pending[0];

        if (settle === 'resolve') {
          resolve(lab.ReorderResolution.accept());
        } else {
          reject(new Error('late'));
        }
      }, how);
      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });
      await frames(page);
      equal(
        await log(page),
        ['start', 'end:canceled', 'start'],
        'the second drag is untouched',
      );
      equal(await page.evaluate(() => lab.faults.length), 0, 'reports');
      equal(
        await page.evaluate(() => lab.rejections.length),
        0,
        'unhandled rejections',
      );
      await page.keyboard.press('Escape');
      await page.mouse.up();
    },
  })),
  ...(['resolve', 'reject'] as const).map((how): Scenario => ({
    id: `a late ${how} after destroy reaches nothing`,
    group: 7,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(5);

        lab.pending = [];
        lab.signals = [];
        lab.controller = lab.basicSortable(list, {
          onReorder(_: unknown, { signal }: { signal: AbortSignal }) {
            lab.signals.push(signal);
            return new Promise((resolve, reject) => {
              lab.pending.push({ resolve, reject });
            });
          },
        });
      });
      await dragAndDrop(page, '#r0', 90);
      await page.evaluate(() => lab.controller.requestDestroy());
      equal(
        await page.evaluate(() => lab.signals[0].aborted),
        true,
        'the signal aborted',
      );
      await page.evaluate((settle) => {
        const { resolve, reject } = lab.pending[0];

        if (settle === 'resolve') {
          resolve(lab.ReorderResolution.accept());
        } else {
          reject(new Error('late'));
        }
      }, how);
      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });
      equal(await log(page), ['start'], 'no terminal');
      equal(await page.evaluate(() => lab.faults.length), 0, 'reports');
      equal(
        await page.evaluate(() => lab.rejections.length),
        0,
        'unhandled rejections',
      );
      await clearsAndWorks(page);
    },
  })),
  {
    id: 'the signal stays unaborted on acceptance',
    group: 7,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);

        lab.signals = [];
        lab.basicSortable(list, {
          onReorder({ item, next }: any, { signal }: { signal: AbortSignal }) {
            lab.signals.push(signal);
            list.insertBefore(item, next);
            return Promise.resolve(lab.ReorderResolution.accept());
          },
        });
      });
      await dragAndDrop(page, '#r0', 90);
      await frames(page);
      equal(await log(page), ['start', 'end:accepted'], 'result');
      equal(
        await page.evaluate(() => lab.signals[0].aborted),
        false,
        'aborted',
      );
    },
  },
];

/* -------- beyond the seven: the new behaviours this unit adds -------- */

const added: Scenario[] = [
  {
    id: 'items() is pulled at admission: a row added without invalidate can be dragged',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(3);

        lab.basicSortable(list);

        const row = document.createElement('div');

        row.className = 'row';
        row.id = 'late';
        list.prepend(row);
      });
      await dragAndDrop(page, '#late', 60);
      equal(await log(page), ['start', 'end:accepted'], 'terminals');
      equal(
        await page.evaluate(() => lab.order(document.querySelector('#list'))),
        'r0,late,r1,r2',
        'order',
      );
    },
  },
  {
    id: 'keyboard: one press moves one slot, with no pointer',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(3);

        for (const row of list.children) {
          (row as HTMLElement).tabIndex = 0;
        }

        lab.basicSortable(list);
        document.querySelector<HTMLElement>('#r0')!.focus();
      });
      await page.keyboard.press('ArrowDown');
      await frames(page);
      equal(await log(page), ['start', 'end:accepted'], 'terminals');
      equal(
        await page.evaluate(() => lab.order(document.querySelector('#list'))),
        'r1,r0,r2',
        'order',
      );
      await clearsAndWorks(page);
    },
  },
  {
    id: 'data-drag-ignore refuses a press through a marked descendant',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(3);

        lab.basicSortable(list);
        document.querySelector('#r0')!.innerHTML =
          '<span id="owned" data-drag-ignore>owned</span>';
      });
      await dragAndDrop(page, '#owned', 60);
      equal(await log(page), [], 'terminals');
    },
  },
  {
    id: 'a landing survives a press that never activates, and the next activation cancels it',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        lab.basicSortable(lab.makeList(4), {
          landing: lab.landing({ duration: 2000 }),
          onReorder: () => lab.ReorderResolution.reject('no'),
        });
      });
      await dragAndDrop(page, '#r0', 90);

      const running = (): Promise<number> =>
        page.evaluate(
          () => document.querySelector('#r0')!.getAnimations().length,
        );

      equal(await running(), 1, 'landing');

      const { x, y } = await centre(page, '#r3');

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.up();
      equal(await running(), 1, 'a press below the threshold leaves it');
      await grab(page, '#r2');
      equal(await running(), 0, 'the next activation cancels it');
      await page.mouse.up();
    },
  },
  {
    id: 'a row animation outlives the operation and ends with the controller',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        lab.controller = lab.basicSortable(lab.makeList(4), {
          displacement: lab.layoutAnimation({ duration: 3000 }),
        });
      });

      const start = await centre(page, '#r0');

      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x, start.y + 20, { steps: 2 });
      await page.mouse.move(start.x, start.y + 62, { steps: 3 });
      await frames(page, 3);
      await page.mouse.move(start.x, start.y + 65);
      await frames(page, 3);
      await page.mouse.up();
      await frames(page);

      const count = (): Promise<number> =>
        page.evaluate(() =>
          lab
            .rowsOf(document.querySelector('#list'))
            .reduce(
              (sum: number, row: Element) => sum + row.getAnimations().length,
              0,
            ),
        );

      equal((await count()) > 0, true, 'still running after the terminal');
      await page.evaluate(() => lab.controller.requestDestroy());
      equal(await count(), 0, 'gone after destruction');
    },
  },
  {
    id: 'free drag: bounds, axis and moveTo through the public behavior',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const arena = document.createElement('div');

        arena.style.cssText = 'position:relative;width:300px;height:200px';
        arena.innerHTML =
          '<div id="free" style="position:absolute;left:0;top:0;width:50px;height:50px;background:#ccd;touch-action:none"></div>';
        document.body.append(arena);

        const free = arena.querySelector<HTMLElement>('#free')!;

        lab.controller = lab.freeDrag(free, {
          bounds: lab.bounds(arena),
          onDrop: () => lab.FreeDragResolution.reject('no'),
          onEnd: (result: { type: string }) =>
            lab.log.push(`end:${result.type}`),
        });
      });

      const at = await grab(page, '#free', 800, 600);
      const clamped = await centre(page, '#free');

      near(clamped.x, 20 + 300 - 25, 'clamped x', 40);

      if (clamped.x > at.x) {
        throw new Error('not clamped');
      }

      await page.evaluate(() => lab.controller.moveTo({ x: 40, y: 50 }));

      const moved = await centre(page, '#free');

      near(moved.left, 40, 'moveTo x');
      near(moved.top, 50, 'moveTo y');
      await page.mouse.up();
      await frames(page);
      equal(await log(page), ['end:rejected'], 'terminal');
    },
  },
];

/* -------- the guarantees with no scenario above -------- */

const guarantees: Scenario[] = [
  {
    id: 'a thenable: then is read once, and a throwing accessor or call is a fault',
    group: 0,
    async run(page) {
      const results = await page.evaluate(() => {
        const element = document.createElement('div');

        document.body.append(element);

        const panel = lab.draggable(element, {
          admit: () => ({ item: element }),
          lift: false,
          threshold: 0,
          drop: () => () => lab.current,
          end(_: unknown, outcome: any) {
            lab.log.push(`${outcome.type}:${String(outcome.origin)}`);
          },
        });

        return { panel: Boolean(panel) };
      });

      equal(results.panel, true, 'mounted');
      await page.evaluate(() => {
        let reads = 0;

        lab.reads = () => reads;
        lab.current = {
          get then() {
            reads += 1;
            return (resolve: (value: string) => void) => {
              resolve('settled');
              resolve('again');
            };
          },
        };
      });

      const press = async (): Promise<void> => {
        await page.mouse.move(25, 25);
        await page.mouse.down();
        await page.mouse.move(40, 40, { steps: 2 });
        await page.mouse.up();
        await frames(page);
      };

      await page.evaluate(() => {
        const element = document.querySelector<HTMLElement>('body > div')!;

        element.style.cssText =
          'position:fixed;left:0;top:0;width:100px;height:100px;touch-action:none';
      });
      await press();
      equal(await log(page), ['verdict:undefined'], 'first completion wins');
      equal(await page.evaluate(() => lab.reads()), 1, 'then is read once');
      await page.evaluate(() => {
        lab.current = {
          get then() {
            throw new Error('accessor');
          },
        };
      });
      await press();
      await page.evaluate(() => {
        lab.current = {
          then() {
            throw new Error('call');
          },
        };
      });
      await press();
      equal(
        await page.evaluate(() =>
          lab.faults.map((fault: any) => fault.cause.message),
        ),
        ['accessor', 'call'],
        'reports',
      );
    },
  },
  ...([false, true] as const).map((composed): Scenario => ({
    id: `the landing target is measured only with a landing composed: ${composed ? 'composed' : 'absent'}`,
    group: 0,
    async run(page) {
      await page.evaluate((withLanding) => {
        const list = lab.makeList(4);
        const original = Element.prototype.getBoundingClientRect;
        let holeReads = 0;

        Element.prototype.getBoundingClientRect = function measure(
          this: Element,
        ) {
          if (this.hasAttribute('data-drag-placeholder')) {
            holeReads += 1;
          }

          return original.call(this);
        };

        lab.basicSortable(list, {
          ...(withLanding ? { landing: lab.landing() } : {}),
          onReorder({ item, next }: any) {
            holeReads = 0;
            list.insertBefore(item, next);
            return lab.ReorderResolution.accept();
          },
          onEnd() {
            lab.log.push(`reads=${holeReads}`);
          },
        });
      }, composed);
      await dragAndDrop(page, '#r0', 90);
      equal(
        (await log(page)).at(-1),
        `reads=${composed ? 1 : 0}`,
        'hole reads after the verdict',
      );
    },
  })),
  {
    id: 'two invalidate calls in one callback pull once',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);
        let pulls = 0;
        const controller = lab.basicSortable(list, {
          items() {
            pulls += 1;
            return lab.rowsOf(list);
          },
          onStart() {
            pulls = 0;
            controller.invalidate();
            controller.invalidate();
            lab.after = () => pulls;
          },
        });
      });
      await grab(page, '#r0');
      equal(await page.evaluate(() => lab.after()), 1, 'pulls');
      await page.mouse.up();
    },
  },
  {
    id: 'a lost adjacency cancels the drag',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);

        lab.controller = lab.basicSortable(list, {
          onEnd: (result: any) =>
            lab.log.push(`${result.type}:${result.reason}`),
        });
      });
      await grab(page, '#r0', 0, 20);
      await page.evaluate(() => {
        document.querySelector('#r1')!.remove();
        lab.controller.invalidate();
      });
      await page.mouse.up();
      equal(
        await log(page),
        ['start', 'canceled:sortable:collection-invalidated'],
        'the gap did not survive',
      );
    },
  },
  ...(
    [
      ['removes itself', 'probe.remove()'],
      ['moves itself', 'document.body.append(probe)'],
      ['takes the list out', 'probe.parentElement.remove()'],
    ] as const
  ).map(([name, code]): Scenario => ({
    id: `a placeholder that ${name} ends the activation clean, with no start`,
    group: 0,
    async run(page) {
      await page.evaluate((body) => {
        const list = lab.makeList(4);
        const act = new Function('probe', body) as (probe: Element) => void;

        lab.basicSortable(list, {
          placeholder() {
            const probe = document.createElement('reaction-probe');

            lab.ReactionProbe.react = () => {
              lab.ReactionProbe.react = null;
              act(probe);
            };
            return probe;
          },
        });
      }, code);
      await grab(page, '#r0');
      await page.mouse.up();
      await frames(page);
      equal(await log(page), [], 'no start and no end');
      equal(
        await page.evaluate(() => lab.faults.length),
        1,
        'the fault is reported',
      );
      equal(
        await page.evaluate(
          () => !document.querySelector('[data-drag-placeholder]'),
        ),
        true,
        'no placeholder left',
      );
    },
  })),
  {
    id: 'an anchor leaving the container mid-drag cancels and reports the fault',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(5);

        lab.basicSortable(list, {
          onEnd: (result: any) =>
            lab.log.push(`${result.type}:${result.origin}`),
        });
      });
      await grab(page, '#r0', 0, 20);
      // The last row, so the pointer on it asks for the end gap, anchored on it.
      await page.evaluate(() => {
        document.body.append(document.querySelector('#r4')!);
      });

      const anchor = await centre(page, '#r4');

      await page.mouse.move(anchor.x, anchor.y + 15, { steps: 3 });
      await frames(page, 3);
      await page.mouse.up();
      await frames(page);
      equal(await log(page), ['start', 'canceled:fault'], 'result');
      equal(await page.evaluate(() => lab.faults.length), 1, 'reports');
    },
  },
  {
    id: 'a platform throw is a fault and the controller survives: the item left the document',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const list = lab.makeList(4);

        lab.basicSortable(list);
      });

      const { x, y } = await centre(page, '#r0');

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.evaluate(() => {
        document.querySelector('#r0')!.remove();
      });
      await page.mouse.move(x, y + 30, { steps: 3 });
      await page.mouse.up();
      await frames(page);
      equal(await log(page), [], 'no start and no end');
      equal(await page.evaluate(() => lab.faults.length), 1, 'reports');
      await dragAndDrop(page, '#r1', 60);
      equal(await log(page), ['start', 'end:accepted'], 'the next drag');
    },
  },
  {
    id: 'keyboard focus after the consumer moves the item',
    group: 0,
    observe: true,
    async run(page, note) {
      await page.evaluate(() => {
        const list = lab.makeList(3);

        for (const row of list.children) {
          (row as HTMLElement).tabIndex = 0;
        }

        lab.basicSortable(list);
        document.querySelector<HTMLElement>('#r0')!.focus();
      });
      await page.keyboard.press('ArrowDown');
      await frames(page);
      note(
        `focus is on ${await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)}`,
      );
    },
  },
];

/* -------- the example behaviors -------- */

const nodeAt = (page: Page, id: string) =>
  page.evaluate((name) => {
    const node = document.querySelector<HTMLElement>(`#${name}`)!;

    return {
      left: node.offsetLeft,
      top: node.offsetTop,
      translate: node.style.translate,
    };
  }, id);

const canvasSetup = async (page: Page, fails = false): Promise<void> => {
  await page.evaluate((failing) => {
    const canvas = document.createElement('div');

    canvas.style.cssText =
      'position:relative;width:500px;height:300px;transform:scale(.5);transform-origin:0 0;touch-action:none';
    canvas.innerHTML = `
      <div class="node" id="a" style="position:absolute;left:20px;top:20px;width:60px;height:60px;background:#ccd"></div>
      <div class="node" id="b" style="position:absolute;left:200px;top:20px;width:60px;height:60px;background:#dcc"></div>
      <div class="node" id="c" style="position:absolute;left:300px;top:200px;width:60px;height:60px;background:#cdc"></div>`;
    document.body.append(canvas);
    lab.group = lab.canvasGroup(
      canvas,
      () => {
        lab.log.push('save');
        return failing
          ? Promise.reject(new Error('save failed'))
          : Promise.resolve();
      },
      () => {},
    );
  }, fails);
};

const examples: Scenario[] = [
  {
    id: 'resize handle: resizes with no lift, and Escape restores',
    group: 0,
    async run(page) {
      await page.evaluate(() => {
        const box = document.createElement('div');

        box.id = 'box';
        box.style.cssText =
          'position:relative;width:200px;height:100px;background:#ccd';
        box.innerHTML =
          '<div id="grip" style="position:absolute;right:0;bottom:0;width:20px;height:20px;background:#88a;touch-action:none"></div>';
        document.body.append(box);
        lab.resizeHandle(box.firstElementChild, box, (size: unknown) => {
          lab.log.push(typeof size === 'string' ? size : 'resized');
        });
      });

      const size = (): Promise<number> =>
        page.evaluate(
          () => document.querySelector<HTMLElement>('#box')!.offsetWidth,
        );

      await grab(page, '#grip', 50, 30);
      await page.mouse.move(600, 400);
      await frames(page);

      if ((await size()) < 250) {
        throw new Error(`did not resize: ${await size()}`);
      }

      equal(
        await page.evaluate(() =>
          document.querySelector('#grip')!.hasAttribute('popover'),
        ),
        false,
        'no lift',
      );
      await page.keyboard.press('Escape');
      equal(await size(), 200, 'restored');
      await page.mouse.up();
      equal(await log(page), ['restored'], 'the callback');
    },
  },
  ...([true, false] as const).map((accepts): Scenario => ({
    id: `drop zone: an async verdict that ${accepts ? 'accepts lands in the zone' : 'rejects lands home'}`,
    group: 0,
    async run(page) {
      await page.evaluate((verdict) => {
        const board = document.createElement('div');

        board.style.cssText = 'display:flex;gap:40px';
        board.innerHTML = `
            <div class="zone" id="z1" style="width:150px;height:200px;background:#eee"><div class="card" id="card" style="height:40px;background:#ccd;touch-action:none;user-select:none"></div></div>
            <div class="zone" id="z2" style="width:150px;height:200px;background:#eee"></div>`;
        document.body.append(board);
        lab.dropZone(board, async (_: unknown, zone: Element) => {
          lab.log.push(`save:${zone.id}`);
          await new Promise((resolve) => {
            setTimeout(resolve, 50);
          });
          return verdict;
        });
      }, accepts);

      const home = await centre(page, '#card');
      const zone = await centre(page, '#z2');

      await grab(page, '#card', zone.x - home.x, zone.y - home.y);
      await page.mouse.up();
      await new Promise((resolve) => {
        setTimeout(resolve, 400);
      });
      equal(await log(page), ['save:z2'], 'saved once');
      equal(
        await page.evaluate(
          () => document.querySelector('#card')!.parentElement!.id,
        ),
        accepts ? 'z2' : 'z1',
        'where the card is',
      );
      equal(
        await page.evaluate(() => document.querySelector('#z2')!.className),
        'zone',
        'highlight cleared',
      );
    },
  })),
  {
    id: 'canvas group: moves in canvas units under scale(.5), and saves',
    group: 0,
    async run(page) {
      await canvasSetup(page);
      await grab(page, '#a', 40, 40);
      await page.mouse.up();
      await frames(page);
      equal(await log(page), ['save'], 'saved');

      const { left, top, translate } = await nodeAt(page, 'a');

      near(left, 20 + 80, 'left, doubled by the scale', 7);
      near(top, 20 + 80, 'top, doubled by the scale', 7);
      equal(translate, '', 'its own rendering is gone');
    },
  },
  {
    id: 'canvas group: Escape rolls back',
    group: 0,
    async run(page) {
      await canvasSetup(page);
      await grab(page, '#a', 40, 40);
      await page.keyboard.press('Escape');
      await frames(page);
      equal(
        await nodeAt(page, 'a'),
        { left: 20, top: 20, translate: '' },
        'rolled back',
      );
      await page.mouse.up();
    },
  },
  {
    id: 'canvas group: destruction rolls back with no end',
    group: 0,
    async run(page) {
      await canvasSetup(page);
      await grab(page, '#a', 40, 40);
      await page.evaluate(() => lab.group.panel.requestDestroy());
      equal(
        await nodeAt(page, 'a'),
        { left: 20, top: 20, translate: '' },
        'rolled back',
      );
      await page.mouse.up();
      equal(await log(page), [], 'no save');
    },
  },
  {
    id: 'canvas group: a failed save rolls back and reports the fault',
    group: 0,
    async run(page) {
      await canvasSetup(page, true);
      await grab(page, '#a', 40, 40);
      await page.mouse.up();
      await frames(page);
      equal(
        await nodeAt(page, 'a'),
        { left: 20, top: 20, translate: '' },
        'rolled back',
      );
      equal(
        await page.evaluate(() =>
          lab.faults.map((fault: any) => fault.cause.message),
        ),
        ['save failed'],
        'reports',
      );
    },
  },
  {
    id: 'canvas group: a nudge from foreign code renders through requestApply',
    group: 0,
    async run(page) {
      await canvasSetup(page);
      await grab(page, '#a', 20, 60);
      await page.mouse.move(100, 150);
      await frames(page);
      await page.evaluate(() => {
        lab.group.nudge(10);
      });

      const nudged = await page.evaluate(
        () => document.querySelector<HTMLElement>('#a')!.style.translate,
      );

      if (!nudged) {
        throw new Error('the nudge did not render');
      }

      await page.keyboard.press('Escape');
      await page.mouse.up();
    },
  },
];

const scenarios = [
  ...clickGuard,
  ...presentation,
  ...reactions,
  ...reporting,
  ...precedence,
  ...lateVerdict,
  ...added,
  ...guarantees,
  ...examples,
];

const PAGES = [
  'sortable-list',
  'sortable-grid',
  'free-drag',
  'environments',
  'requests',
  'faults',
  'behaviors',
];
const engines = { chromium, firefox, webkit };
const requested = process.argv.slice(2);
const selected = (Object.keys(engines) as Array<keyof typeof engines>).filter(
  (name) => requested.length === 0 || requested.includes(name),
);

const server = await createServer({
  configFile: `${here}../vite.config.ts`,
  logLevel: 'silent',
  server: { port: 5192, strictPort: false },
});

await server.listen();

const base = server.resolvedUrls!.local[0]!;
const report: Record<string, unknown> = {};
let failed = 0;

for (const name of selected) {
  let browser;

  try {
    browser = await engines[name].launch();
  } catch (error) {
    report[name] = { launched: false, error: String(error).slice(0, 600) };
    console.log(`${name}: did not launch; no substitute was run`);
    continue;
  }

  const version = browser.version();
  const rows: Row[] = [];
  let trustedRefused = 0;
  let untrustedRefused = 0;

  const count = async (page: Page): Promise<void> => {
    const refused = await page.evaluate(
      () => (globalThis as any).__dragRefused ?? { trusted: 0, untrusted: 0 },
    );

    trustedRefused += refused.trusted;
    untrustedRefused += refused.untrusted;
  };

  for (const scenario of scenarios) {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 700 },
    });
    const notes: string[] = [];
    let pass = true;

    try {
      await page.goto(`${base}checks/harness.html`);
      await page.waitForFunction(() => (globalThis as any).lab);
      await scenario.run(page, (text) => {
        notes.push(text);
      });

      const foreign = await page.evaluate(() => lab.foreignErrors.map(String));

      if (foreign.length > 0) {
        throw new Error(`errors outside the library: ${foreign.join('; ')}`);
      }
    } catch (error) {
      pass = false;
      notes.push(String((error as Error).message ?? error).slice(0, 500));
    }

    await count(page).catch(() => {});
    await page.close();

    if (!pass && !scenario.observe) {
      failed += 1;
    }

    rows.push({
      id: scenario.id,
      group: scenario.group,
      pass: pass || Boolean(scenario.observe),
      detail: notes.join(' | '),
    });
    console.log(
      `${name} ${pass ? 'ok  ' : 'FAIL'} [${scenario.group}] ${scenario.id}${notes.length ? ` — ${notes.join(' | ')}` : ''}`,
    );
  }

  // Page drivers: a drag on each delivered page, for its errors and the count.
  for (const path of PAGES) {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    });
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      // The faults page reports faults on purpose.
      if (path !== 'faults' || !String(error).includes('DragFault')) {
        errors.push(String(error));
      }
    });

    await page.goto(`${base}pages/${path}.html`);
    await page.waitForSelector('.row, .card, .node');

    const target = await page.evaluate(() => {
      const element = document.querySelector('.row, .card, .node')!;
      const { left, top, width, height } = element.getBoundingClientRect();

      return { x: left + width / 2, y: top + height / 2 };
    });

    await page.mouse.move(target.x, target.y);
    await page.mouse.down();
    await page.mouse.move(target.x + 10, target.y + 60, { steps: 4 });
    await frames(page);
    await page.mouse.up();
    await frames(page);
    await count(page);
    await page.close();

    const pass = errors.length === 0;

    if (!pass) {
      failed += 1;
    }

    rows.push({
      id: `page: ${path}`,
      group: 0,
      pass,
      detail: errors.join(' | ').slice(0, 400),
    });
    console.log(
      `${name} ${pass ? 'ok  ' : 'FAIL'} page ${path}${pass ? '' : ` — ${errors.join(' | ')}`}`,
    );
  }

  // Check 6: across every check and page driver.
  const noneRefused = trustedRefused === 0;

  if (!noneRefused) {
    failed += 1;
  }

  rows.push({
    id: 'no trusted event was refused, across every check and page driver',
    group: 6,
    pass: noneRefused,
    detail: `trusted refused: ${trustedRefused}; untrusted refused, the instrument's control: ${untrustedRefused}`,
  });
  console.log(
    `${name} ${noneRefused ? 'ok  ' : 'FAIL'} [6] trusted refused ${trustedRefused}, untrusted ${untrustedRefused}`,
  );

  report[name] = { launched: true, version, rows };
  await browser.close();
}

await server.close();
await mkdir(new URL('./', `file://${output}`), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 1)}\n`);
console.log(failed === 0 ? 'all passed' : `${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
