/**
 * Runs the model's hypotheses against real input in Chromium.
 *
 *   node bench/architecture-independent/probe.ts [filter]
 *
 * Serves the prototype with types stripped, drives it over CDP and writes
 * results.json beside this file. Resolves Playwright from the enclosing
 * checkout's node_modules.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { stripTypeScriptTypes } from 'node:module';
import type { AddressInfo } from 'node:net';
import {
  chromium,
  type BrowserContext,
  type CDPSession,
  type Page,
} from 'playwright';
import type * as Lab from './lab.ts';

declare const lab: typeof Lab;
declare const fuzz: Readonly<{
  reference: string[];
  expectedErrors: number;
  active: number;
  destroyed: boolean;
  pending: boolean;
}>;
declare const remount: () => void;

const here = new URL('.', import.meta.url);
const filter = process.argv[2];

const server = createServer((request, response) => {
  void (async () => {
    if (request.url === '/') {
      response.setHeader('content-type', 'text/html');
      response.end(
        `<!doctype html><style>body{margin:0;height:3000px}[data-dragging]{position:relative;z-index:1}</style>
<script type="module">import * as lab from '/lab.ts'; globalThis.lab = lab; globalThis.ready = true;</script>`,
      );
      return;
    }
    const source = await readFile(
      new URL(`.${request.url}`, here),
      'utf8',
    ).catch(() => undefined);
    if (source === undefined) {
      response.statusCode = 404;
      response.end();
      return;
    }
    response.setHeader('content-type', 'text/javascript');
    response.end(stripTypeScriptTypes(source));
  })();
});
await new Promise<void>((resolve) => {
  server.listen(0, '127.0.0.1', resolve);
});
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;

const browser = await chromium.launch({ headless: true });

type Row = Readonly<{
  id: string;
  name: string;
  pass: boolean;
  detail?: unknown;
}>;
const rows: Row[] = [];
const measurements: Record<string, unknown> = {};

function check(
  id: string,
  name: string,
  pass: boolean,
  detail?: unknown,
): void {
  rows.push({ id, name, pass, detail });
  console.log(
    `${pass ? 'ok  ' : 'FAIL'} ${id} ${name}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}`,
  );
}

async function open(page: Page): Promise<void> {
  await page.goto(base);
  await page.waitForFunction(() => 'ready' in globalThis);
}

async function metrics(cdp: CDPSession): Promise<Record<string, number>> {
  const { metrics: list } = (await cdp.send('Performance.getMetrics')) as {
    metrics: ReadonlyArray<{ name: string; value: number }>;
  };
  return Object.fromEntries(list.map(({ name, value }) => [name, value]));
}

async function listenerCount(
  cdp: CDPSession,
  expression: string,
): Promise<number> {
  const { result } = (await cdp.send('Runtime.evaluate', { expression })) as {
    result: { objectId?: string };
  };
  if (!result.objectId) {
    return 0;
  }
  const { listeners } = (await cdp.send('DOMDebugger.getEventListeners', {
    objectId: result.objectId,
  })) as { listeners: readonly unknown[] };
  return listeners.length;
}

async function globalListeners(cdp: CDPSession): Promise<number> {
  return (
    (await listenerCount(cdp, 'document')) +
    (await listenerCount(cdp, 'window'))
  );
}

const settled = async (page: Page): Promise<void> => {
  await page.evaluate(() => lab.frames());
};

const CANCEL_KEY = 'Escape';

/** Press item k, cross two neighbours downward, release when `release` is set. */
async function pointerGesture(
  page: Page,
  k: number,
  release = true,
): Promise<void> {
  const { x, y } = await page.evaluate((index) => lab.rectOf(index), k);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 10);
  await page.mouse.move(x, y + 80);
  await page.mouse.move(x, y + 150);
  if (release) {
    await page.mouse.up();
  }
}

async function keyboardGesture(page: Page, k: number): Promise<void> {
  await page.evaluate((index) => {
    lab.item(index).focus();
  }, k);
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
}

// ---------------------------------------------------------------------------
// H1: no layout while moving; sample cost independent of list size.
// ---------------------------------------------------------------------------
async function h1(context: BrowserContext): Promise<void> {
  const table: Array<Record<string, number | string>> = [];
  for (const kind of ['sticky', 'flip', 'seed', 'control'] as const) {
    for (const count of [20, 200, 2000]) {
      const page = await context.newPage();
      await open(page);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      await page.evaluate(
        ([which, n]) => {
          const list = lab.mountList({ count: n });
          if (which === 'sticky') {
            lab.sortable(list);
          } else if (which === 'flip' || which === 'seed') {
            lab.sortable(list, { arm: which });
          } else {
            lab.liveReorder(list);
          }
        },
        [kind, count] as const,
      );
      const { x, y } = await page.evaluate(() => lab.rectOf(0));
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + 10);
      await settled(page);
      const before = await metrics(cdp);
      const movesBefore = await page.evaluate(() => lab.log.moves);
      const samples = 300;
      for (let index = 0; index < samples; index += 1) {
        const phase = (index / samples) * Math.PI * 4;
        await page.mouse.move(x, y + 300 + Math.sin(phase) * 290);
      }
      await settled(page);
      const after = await metrics(cdp);
      const moves = (await page.evaluate(() => lab.log.moves)) - movesBefore;
      await page.mouse.up();
      const delta = (name: string) => after[name]! - before[name]!;
      table.push({
        kind,
        count,
        moves,
        layouts: delta('LayoutCount'),
        styleRecalcs: delta('RecalcStyleCount'),
        scriptUsPerMove: Number(
          ((delta('ScriptDuration') / moves) * 1e6).toFixed(1),
        ),
        layoutUsPerMove: Number(
          ((delta('LayoutDuration') / moves) * 1e6).toFixed(1),
        ),
        styleUsPerMove: Number(
          ((delta('RecalcStyleDuration') / moves) * 1e6).toFixed(1),
        ),
        taskUsPerMove: Number(
          ((delta('TaskDuration') / moves) * 1e6).toFixed(1),
        ),
      });
      await page.close();
    }
  }
  measurements['H1.samples'] = table;
  console.table(table);
  const model = table.filter((row) => row['kind'] === 'sticky');
  const flip = table.filter((row) => row['kind'] === 'flip');
  // The oscillation touches about nine distinct items; flip pays for each crossing.
  check(
    'H1.a',
    'layouts bounded by distinct items touched, not crossings',
    model.every(
      (row, index) =>
        (row['layouts'] as number) <= 12 &&
        (row['layouts'] as number) < (flip[index]!['layouts'] as number),
    ),
    {
      sticky: model.map((row) => row['layouts']),
      flip: flip.map((row) => row['layouts']),
    },
  );
  const small = model[0]!;
  const large = model[2]!;
  check(
    'H1.b',
    'script per move at 2000 items within 2x of 20 items',
    (large['scriptUsPerMove'] as number) <=
      (small['scriptUsPerMove'] as number) * 2,
    [small['scriptUsPerMove'], large['scriptUsPerMove']],
  );

  // Activation and plain-click cost.
  const costs: Array<Record<string, number>> = [];
  for (const count of [20, 200, 2000]) {
    const page = await context.newPage();
    await open(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.evaluate((n) => {
      lab.sortable(lab.mountList({ count: n }));
    }, count);
    await settled(page);
    const { x, y } = await page.evaluate(() => lab.rectOf(0));
    const m0 = await metrics(cdp);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
    await settled(page);
    const m1 = await metrics(cdp);
    const runs: number[] = [];
    for (let run = 0; run < 7; run += 1) {
      await page.mouse.down();
      await settled(page);
      const a = await metrics(cdp);
      await page.mouse.move(x, y + 8);
      await settled(page);
      const b = await metrics(cdp);
      runs.push((b['ScriptDuration']! - a['ScriptDuration']!) * 1e6);
      await page.keyboard.press(CANCEL_KEY);
      await page.mouse.up();
      await page.mouse.move(x, y);
      await settled(page);
    }
    runs.sort((p, q) => p - q);
    costs.push({
      count,
      clickLayouts: m1['LayoutCount']! - m0['LayoutCount']!,
      activationScriptUs: Number(runs[3]!.toFixed(0)),
    });
    await page.close();
  }
  measurements['H1.activation'] = costs;
  console.table(costs);
  check(
    'H1.c',
    'a plain press and release forces no layout beyond the page',
    costs.every((row) => row['clickLayouts']! <= 1),
    costs.map((row) => row['clickLayouts']),
  );
}

// ---------------------------------------------------------------------------
// H2: additive motion is position-continuous, also across the commit's DOM move.
// ---------------------------------------------------------------------------
function maxJumpRatio(
  samples: readonly Lab.Sample[],
  index: number,
  speedPxPerMs: number,
): number {
  let worst = 0;
  for (let k = 1; k < samples.length; k += 1) {
    const travel = Math.abs(
      samples[k]!.tops[index]! - samples[k - 1]!.tops[index]!,
    );
    const allowed = speedPxPerMs * (samples[k]!.t - samples[k - 1]!.t);
    if (allowed > 0) {
      worst = Math.max(worst, travel / allowed);
    }
  }
  return worst;
}

const NO_SPEC = { at: '', action: '', verdict: true, pending: false };

async function h2(context: BrowserContext): Promise<void> {
  const duration = 400;
  const page = await context.newPage();

  // Commit: item 1 released short of slot 4, so it lands while the DOM moves.
  await open(page);
  await page.evaluate(
    ([spec, d]) => {
      lab.mountSort({ count: 6 }, spec, d);
    },
    [NO_SPEC, duration] as const,
  );
  const { x, y } = await page.evaluate(() => lab.rectOf(1));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 10);
  await page.mouse.move(x, y + 260);
  await settled(page);
  await page.waitForTimeout(duration + 50);
  const held = await page.evaluate(() => lab.rectOf(1).top);
  await page.evaluate(() => {
    lab.startSampling([1, 2]);
  });
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(duration + 100);
  const commitSamples = await page.evaluate(() => lab.stopSampling());
  const finalTop = await page.evaluate(() => lab.rectOf(1).top);
  const orderAfter = await page.evaluate(() => lab.order());
  const landingDistance = Math.abs(finalTop - held);
  const ratioItem = maxJumpRatio(commitSamples, 0, landingDistance / duration);
  const ratioNeighbor = maxJumpRatio(commitSamples, 1, 68 / duration);
  measurements['H2.commit'] = {
    landingDistance,
    ratioItem,
    ratioNeighbor,
    orderAfter,
    frames: commitSamples.length,
  };
  check(
    'H2.a',
    'landing stays continuous across the DOM move',
    ratioItem < 1.6,
    { ratioItem, landingDistance, orderAfter },
  );
  check(
    'H2.b',
    'a settled neighbour does not move across the commit',
    ratioNeighbor < 1.6,
    ratioNeighbor,
  );
  check(
    'H2.c',
    'landing ends at the committed natural position',
    Math.abs(finalTop - 68 * 4) < 0.5 && orderAfter === '023415',
    { finalTop, orderAfter },
  );

  // A neighbour whose own tail is mid-flight when the commit clears its style.
  await open(page);
  await page.evaluate(
    ([spec, d]) => {
      lab.mountSort({ count: 6 }, spec, d);
    },
    [NO_SPEC, duration] as const,
  );
  const quick = await page.evaluate(() => lab.rectOf(0));
  await page.mouse.move(quick.x, quick.y);
  await page.mouse.down();
  await page.mouse.move(quick.x, quick.y + 10);
  await page.evaluate(() => {
    lab.startSampling([1]);
  });
  await page.mouse.move(quick.x, quick.y + 80);
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(duration + 60);
  const flight = await page.evaluate(() => lab.stopSampling());
  const flightRatio = maxJumpRatio(flight, 0, 68 / duration);
  const flightEnd = await page.evaluate(() => lab.rectOf(1).top);
  measurements['H2.neighbourInFlight'] = { flightRatio, flightEnd };
  check(
    'H2.i',
    'a neighbour mid-tail stays continuous across the commit',
    flightRatio < 1.6 && Math.abs(flightEnd) < 0.5,
    { flightRatio, flightEnd },
  );

  // Interruption: flipping across a neighbour's midpoint sums tails, never jumps.
  await open(page);
  await page.evaluate(
    ([spec, d]) => {
      lab.mountSort({ count: 6 }, spec, d);
    },
    [NO_SPEC, duration] as const,
  );
  const start = await page.evaluate(() => lab.rectOf(0));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + 10);
  await page.evaluate(() => {
    lab.startSampling([1]);
  });
  for (let flip = 0; flip < 6; flip += 1) {
    await page.mouse.move(start.x, start.y + (flip % 2 === 0 ? 80 : 50));
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(duration + 80);
  const flips = await page.evaluate(() => lab.stopSampling());
  const flipRatio = maxJumpRatio(flips, 0, 68 / duration);
  const tails = await page.evaluate(() => lab.item(1).getAnimations().length);
  measurements['H2.flips'] = { flipRatio, tails };
  // Up to `flips` tails overlap, so travel may sum; the bound is one tail each.
  check(
    'H2.d',
    'repeated retargeting sums without a jump',
    flipRatio <= 6.5,
    flipRatio,
  );
  check('H2.e', 'tails do not accumulate once finished', tails === 0, tails);
  await page.mouse.up();

  // Async rejection mid-landing returns continuously.
  await open(page);
  await page.evaluate(
    ([spec, d]) => {
      lab.mountSort({ count: 6 }, spec, d);
    },
    [{ ...NO_SPEC, pending: true }, duration] as const,
  );
  await pointerGesture(page, 0, false);
  await page.mouse.up();
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    lab.startSampling([0]);
  });
  await page.waitForTimeout(40);
  await page.evaluate(() => {
    lab.settle('false');
  });
  await page.waitForTimeout(duration + 80);
  const rejectSamples = await page.evaluate(() => lab.stopSampling());
  const backTop = await page.evaluate(() => lab.rectOf(0).top);
  const rejectRatio = maxJumpRatio(rejectSamples, 0, 136 / duration);
  measurements['H2.reject'] = { rejectRatio, backTop };
  check(
    'H2.f',
    'rejection mid-landing returns without a jump',
    rejectRatio < 2.6,
    rejectRatio,
  );
  check('H2.g', 'rejection ends at origin', Math.abs(backTop) < 0.5, backTop);
  await page.close();
}

// ---------------------------------------------------------------------------
// H3: no settling state is needed.
// ---------------------------------------------------------------------------
async function h3(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const duration = 400;
  // Positioned items are ordinary consumer styling, and they paint in DOM order
  // with a tail's stacking context rather than beneath it.
  await open(page);
  await page.evaluate(
    ([spec, d]) => {
      lab.mountSort({ count: 6, positioned: true }, spec, d);
    },
    [NO_SPEC, duration] as const,
  );
  // Release item 0 overlapping item 4, which paints later than slot 3 in DOM order.
  const { x, y } = await page.evaluate(() => lab.rectOf(0));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 10);
  await page.mouse.move(x, y + 68 * 3 + 30);
  await page.waitForTimeout(duration + 40);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const stacking = await page.evaluate(() => {
    const dragged = lab.item(0);
    const rect = dragged.getBoundingClientRect();
    const below = document.elementFromPoint(rect.left + 10, rect.bottom - 2);
    return {
      top: rect.top,
      animating: dragged.getAnimations().length,
      onTop: below === dragged,
      under: (below as HTMLElement | null)?.dataset?.['k'],
    };
  });
  check(
    'H3.a',
    'landing item paints above later siblings during its tail',
    stacking.onTop,
    stacking,
  );

  // Re-grab during a tail: geometry must be measured free of running motion.
  await page.waitForTimeout(40);
  const during = await page.evaluate(() => ({
    order: lab.order(),
    top: lab.rectOf(1).top,
  }));
  const target = await page.evaluate(() => lab.rectOf(1));
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y + 8);
  const afterGrab = await page.evaluate(() => {
    const value = lab.items().map((element) => ({
      k: element.dataset['k'],
      motion: element.getAnimations().length,
      translate: element.style.translate,
      top: element.getBoundingClientRect().top,
    }));
    return value;
  });
  const naturalTops = afterGrab.map((row, index) =>
    row.translate === '' ? Math.abs(row.top - 68 * index) : 0,
  );
  check(
    'H3.b',
    're-grab during a tail stops motion and measures natural layout',
    afterGrab.every((row) => row.motion === 0) &&
      Math.max(...naturalTops) < 0.5,
    { during, naturalTops },
  );
  await page.keyboard.press(CANCEL_KEY);
  await page.mouse.up();

  // Destruction and cancellation while a tail runs.
  await open(page);
  await page.evaluate(
    ([spec, d]) => {
      lab.mountSort({ count: 6 }, spec, d);
    },
    [NO_SPEC, duration] as const,
  );
  await pointerGesture(page, 0);
  const orderCommitted = await page.evaluate(() => lab.order());
  await page.evaluate(() => {
    lab.controller.cancel();
  });
  const afterCancel = await page.evaluate(() => ({
    order: lab.order(),
    tails: lab.item(0).getAnimations().length,
  }));
  check(
    'H3.c',
    'cancel after acceptance leaves the accepted order',
    afterCancel.order === orderCommitted,
    afterCancel,
  );
  await page.evaluate(() => {
    lab.controller.destroy();
  });
  const afterDestroy = await page.evaluate(() => ({
    tails: lab
      .items()
      .reduce((sum, element) => sum + element.getAnimations().length, 0),
    top: lab.rectOf(0).top,
    order: lab.order(),
    elevated: document.querySelectorAll('[data-dragging]').length,
  }));
  check(
    'H3.d',
    'destroy during a tail stops it at the truth',
    afterDestroy.tails === 0 &&
      afterDestroy.order === orderCommitted &&
      Math.abs(afterDestroy.top - 68 * 2) < 0.5 &&
      afterDestroy.elevated === 0,
    afterDestroy,
  );
  await page.close();
}

// ---------------------------------------------------------------------------
// H4: every state x callback x {cancel, destroy, throw} cell stays sound.
// ---------------------------------------------------------------------------
type Observation = Readonly<{
  starts: number;
  ends: readonly string[];
  errors: number;
  rejections: number;
  aborts: number;
  order: string;
  translate: string;
  attributes: number;
  tails: number;
  capture: boolean;
}>;

async function observe(
  page: Page,
  kind: 'sort' | 'free',
): Promise<Observation> {
  return await page.evaluate((which) => {
    const elements =
      which === 'sort'
        ? lab.items()
        : [document.querySelector<HTMLElement>('#free')!];
    return {
      starts: lab.log.starts,
      ends: lab.log.ends,
      errors: lab.log.errors,
      rejections: lab.log.rejections,
      aborts: lab.log.aborts,
      order: which === 'sort' ? lab.order() : '',
      translate: elements.map((element) => element.style.translate).join('|'),
      attributes: elements.filter((element) =>
        element.hasAttribute('data-dragging'),
      ).length,
      tails: elements.reduce(
        (sum, element) => sum + element.getAnimations().length,
        0,
      ),
      capture: elements.some((element) => element.hasPointerCapture(1)),
    };
  }, kind);
}

async function h4(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const hooks = ['onStart', 'onChange', 'decide', 'onEnd'];
  const actions = [
    'cancel',
    'destroy',
    'throw',
    'cancel+throw',
    'destroy+throw',
  ];
  const failures: unknown[] = [];
  let cells = 0;

  const expectedOutcome = (
    at: string,
    action: string,
    verdict: boolean,
  ): string => {
    if (at === 'onEnd') {
      return verdict ? 'accepted' : 'rejected';
    }
    return at === 'decide' && action === 'throw' ? 'rejected' : 'canceled';
  };

  for (const kind of ['sort', 'free'] as const) {
    for (const input of kind === 'sort'
      ? (['pointer', 'keyboard'] as const)
      : (['pointer'] as const)) {
      for (const duration of [0, 30]) {
        for (const at of hooks) {
          for (const action of actions) {
            for (const verdict of [true, false]) {
              cells += 1;
              await open(page);
              const baseline = await globalListeners(cdp);
              await page.evaluate(
                ([which, spec, d]) => {
                  if (which === 'sort') {
                    lab.mountSort({ count: 6 }, spec, d);
                  } else {
                    lab.mountFree(spec, d);
                  }
                },
                [
                  kind,
                  { at, action, verdict, pending: false },
                  duration,
                ] as const,
              );
              if (kind === 'free') {
                await page.mouse.move(140, 140);
                await page.mouse.down();
                await page.mouse.move(150, 150);
                await page.mouse.move(180, 190);
                await page.mouse.up();
              } else if (input === 'pointer') {
                await pointerGesture(page, 0);
              } else {
                // Space after a mid-session cancel is a new lift, so the drop
                // is only pressed while the session is still open.
                await page.evaluate(() => {
                  lab.item(0).focus();
                });
                await page.keyboard.press('Space');
                await page.keyboard.press('ArrowDown');
                await page.keyboard.press('ArrowDown');
                if ((await page.evaluate(() => lab.log.ends.length)) === 0) {
                  await page.keyboard.press('Space');
                }
              }
              await settled(page);
              if (duration) {
                await page.waitForTimeout(duration + 30);
              }
              const seen = await observe(page, kind);
              const outcome = expectedOutcome(at, action, verdict);
              const destroys = action.startsWith('destroy');
              const problems: string[] = [];
              if (seen.starts !== 1) {
                problems.push(`starts ${seen.starts}`);
              }
              if (seen.ends.length !== 1 || seen.ends[0] !== outcome) {
                problems.push(`ends ${seen.ends.join()} expected ${outcome}`);
              }
              if (seen.errors !== (action.includes('throw') ? 1 : 0)) {
                problems.push(`errors ${seen.errors}`);
              }
              if (kind === 'sort') {
                const moved =
                  input === 'pointer' || input === 'keyboard' ? '120345' : '';
                const expectedOrder = outcome === 'accepted' ? moved : '012345';
                if (seen.order !== expectedOrder) {
                  problems.push(
                    `order ${seen.order} expected ${expectedOrder}`,
                  );
                }
                if (seen.translate.replaceAll('|', '') !== '') {
                  problems.push(`translate ${seen.translate}`);
                }
              } else {
                const rest = outcome === 'accepted' ? '40px 50px' : '0px';
                if (seen.translate !== rest) {
                  problems.push(`translate ${seen.translate} expected ${rest}`);
                }
              }
              if (seen.attributes !== 0) {
                problems.push('data-dragging left');
              }
              if (seen.tails !== 0) {
                problems.push(`tails ${seen.tails}`);
              }
              if (seen.capture) {
                problems.push('capture left');
              }
              const listeners = await globalListeners(cdp);
              if (listeners !== baseline) {
                problems.push(`listeners ${listeners} vs ${baseline}`);
              }
              if (
                destroys &&
                kind === 'sort' &&
                (await listenerCount(
                  cdp,
                  "document.querySelector('#list')",
                )) !== 1
              ) {
                problems.push('root listeners left after destroy');
              }
              // A later gesture proves liveness, or proves destruction.
              const startsBefore = seen.starts;
              if (kind === 'sort') {
                if (input === 'pointer') {
                  await pointerGesture(page, Number(seen.order[0]));
                } else {
                  await keyboardGesture(page, Number(seen.order[0]));
                }
                await settled(page);
                const again = await observe(page, kind);
                const expectedStarts = destroys
                  ? startsBefore
                  : startsBefore + 1;
                if (again.starts !== expectedStarts) {
                  problems.push(
                    `follow-up starts ${again.starts} expected ${expectedStarts}`,
                  );
                }
              }
              if (problems.length > 0) {
                failures.push({
                  kind,
                  input,
                  duration,
                  at,
                  action,
                  verdict,
                  problems,
                });
              }
            }
          }
        }
      }
    }
  }
  check(
    'H4.a',
    `${cells} callback cells keep every invariant`,
    failures.length === 0,
    failures.slice(0, 6),
  );
  measurements['H4.callbackCells'] = {
    cells,
    failures: failures.length,
    sample: failures.slice(0, 20),
  };

  // External commands against a pending verdict, then a late settlement.
  const pendingFailures: unknown[] = [];
  let pendingCells = 0;
  for (const kind of ['sort', 'free'] as const) {
    for (const duration of [0, 30]) {
      for (const command of ['none', 'cancel', 'destroy', 'escape']) {
        for (const how of ['true', 'false', 'reject'] as const) {
          pendingCells += 1;
          await open(page);
          const baseline = await globalListeners(cdp);
          await page.evaluate(
            ([which, spec, d]) => {
              if (which === 'sort') {
                lab.mountSort({ count: 6 }, spec, d);
              } else {
                lab.mountFree(spec, d);
              }
            },
            [kind, { ...NO_SPEC, pending: true }, duration] as const,
          );
          if (kind === 'free') {
            await page.mouse.move(140, 140);
            await page.mouse.down();
            await page.mouse.move(150, 150);
            await page.mouse.up();
          } else {
            await pointerGesture(page, 0);
          }
          await settled(page);
          const mid = await observe(page, kind);
          if (command === 'cancel') {
            await page.evaluate(() => {
              lab.controller.cancel();
            });
          } else if (command === 'destroy') {
            await page.evaluate(() => {
              lab.controller.destroy();
            });
          } else if (command === 'escape') {
            await page.keyboard.press(CANCEL_KEY);
          }
          const beforeSettle = await observe(page, kind);
          await page.evaluate((verdict) => {
            lab.settle(verdict);
          }, how);
          await settled(page);
          if (duration) {
            await page.waitForTimeout(duration + 30);
          }
          const seen = await observe(page, kind);
          const problems: string[] = [];
          const live = command === 'none';
          const outcome = live
            ? how === 'true'
              ? 'accepted'
              : 'rejected'
            : 'canceled';
          if (mid.ends.length !== 0) {
            problems.push('ended before a verdict');
          }
          if (seen.ends.length !== 1 || seen.ends[0] !== outcome) {
            problems.push(`ends ${seen.ends.join()} expected ${outcome}`);
          }
          if (seen.aborts !== (live ? 0 : 1)) {
            problems.push(`aborts ${seen.aborts}`);
          }
          if (seen.errors !== (live && how === 'reject' ? 1 : 0)) {
            problems.push(`errors ${seen.errors}`);
          }
          if (seen.rejections !== 0) {
            problems.push(`unhandled ${seen.rejections}`);
          }
          if (
            !live &&
            (beforeSettle.order !== seen.order ||
              beforeSettle.translate !== seen.translate)
          ) {
            problems.push('late settlement changed something');
          }
          if (
            kind === 'sort' &&
            seen.order !== (outcome === 'accepted' ? '120345' : '012345')
          ) {
            problems.push(`order ${seen.order}`);
          }
          if ((await globalListeners(cdp)) !== baseline) {
            problems.push('listeners left');
          }
          if (problems.length > 0) {
            pendingFailures.push({ kind, duration, command, how, problems });
          }
        }
      }
    }
  }
  check(
    'H4.b',
    `${pendingCells} pending-verdict cells ignore late answers`,
    pendingFailures.length === 0,
    pendingFailures.slice(0, 6),
  );
  measurements['H4.pendingCells'] = {
    cells: pendingCells,
    failures: pendingFailures.length,
    sample: pendingFailures.slice(0, 20),
  };

  // Commands while moving, with the button still held.
  for (const command of [
    'cancel',
    'destroy',
    'escape',
    'release-capture',
  ] as const) {
    await open(page);
    const baseline = await globalListeners(cdp);
    await page.evaluate(
      ([spec, d]) => {
        lab.mountSort({ count: 6, button: true }, spec, d);
      },
      [NO_SPEC, 0] as const,
    );
    await pointerGesture(page, 0, false);
    if (command === 'cancel') {
      await page.evaluate(() => {
        lab.controller.cancel();
      });
    } else if (command === 'destroy') {
      await page.evaluate(() => {
        lab.controller.destroy();
      });
    } else if (command === 'escape') {
      await page.keyboard.press(CANCEL_KEY);
    } else {
      await page.evaluate(() => {
        lab.item(0).releasePointerCapture(1);
      });
    }
    await settled(page);
    // Pending capture changes are processed at the next pointer event, so a
    // consumer's own release can only be seen once the pointer moves again.
    if (command === 'release-capture') {
      await page.mouse.move(400, 300);
      await settled(page);
    }
    const held = await observe(page, 'sort');
    await page.mouse.move(400, 500);
    await page.mouse.up();
    await settled(page);
    const seen = await observe(page, 'sort');
    check(
      `H4.c.${command}`,
      'command while moving restores at once and ignores the later release',
      seen.ends.join() === 'canceled' &&
        seen.order === '012345' &&
        held.translate.replaceAll('|', '') === '' &&
        !held.capture &&
        (await globalListeners(cdp)) === baseline,
      {
        ends: seen.ends,
        order: seen.order,
        held: held.translate,
        capture: held.capture,
      },
    );
  }

  // An abort listener is consumer code too, and it may destroy.
  await open(page);
  await page.evaluate(() => {
    const element = lab.mountList({ count: 6 });
    const held = lab.sortable(element, {
      decide(_value, signal) {
        signal.addEventListener('abort', () => {
          held.destroy();
        });
        return new Promise<boolean>(() => {});
      },
      onEnd(outcome) {
        lab.log.ends.push(outcome);
      },
    });
    Object.assign(globalThis, { held });
  });
  await pointerGesture(page, 0);
  await page.keyboard.press(CANCEL_KEY);
  await settled(page);
  const nested = await observe(page, 'sort');
  check(
    'H4.d',
    'destroy from an abort listener still ends the session once',
    nested.ends.join() === 'canceled' &&
      nested.order === '012345' &&
      nested.translate.replaceAll('|', '') === '',
    nested.ends,
  );

  // A cancelled session's verdict arriving during the next session must not
  // end that session: only the decision's own signal can tell them apart.
  for (const late of ['true', 'false', 'reject'] as const) {
    await open(page);
    await page.evaluate(
      ([spec, d]) => {
        lab.mountSort({ count: 6 }, spec, d);
      },
      [{ ...NO_SPEC, pending: true }, 0] as const,
    );
    await pointerGesture(page, 0);
    await page.keyboard.press(CANCEL_KEY);
    await pointerGesture(page, 0, false);
    await page.evaluate((verdict) => {
      lab.settle(verdict);
    }, late);
    await settled(page);
    const during = await observe(page, 'sort');
    await page.keyboard.press(CANCEL_KEY);
    await page.mouse.up();
    await settled(page);
    check(
      `H4.g.${late}`,
      'a late verdict cannot end the following session',
      during.starts === 2 &&
        during.ends.join() === 'canceled' &&
        during.order === '012345' &&
        during.errors === 0,
      { starts: during.starts, ends: during.ends, errors: during.errors },
    );
  }

  // No second session while a verdict is pending.
  await open(page);
  await page.evaluate(
    ([spec, d]) => {
      lab.mountSort({ count: 6 }, spec, d);
    },
    [{ ...NO_SPEC, pending: true }, 0] as const,
  );
  await pointerGesture(page, 0);
  await pointerGesture(page, 4);
  const heldOff = await observe(page, 'sort');
  await page.evaluate(() => {
    lab.settle('true');
  });
  await pointerGesture(page, 4);
  await settled(page);
  const resumed = await observe(page, 'sort');
  check(
    'H4.e',
    'a press during a pending verdict is ignored, and input returns after it',
    heldOff.starts === 1 && heldOff.ends.length === 0 && resumed.starts === 2,
    { held: heldOff.starts, resumed: resumed.starts, order: resumed.order },
  );

  // Free element: rest accumulates, rejection returns to it, transform survives.
  await open(page);
  await page.evaluate(() => {
    const element = document.createElement('div');
    element.id = 'free';
    element.style.cssText =
      'position:absolute;left:100px;top:100px;width:80px;height:80px;background:tomato;touch-action:none;transform:rotate(10deg)';
    document.body.append(element);
    let accept = true;
    lab.movable(element, {
      decide: () => accept,
      onEnd(outcome) {
        lab.log.ends.push(outcome);
        accept = false;
      },
    });
  });
  const freeDrag = async (
    fromX: number,
    fromY: number,
    byX: number,
    byY: number,
  ) => {
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await page.mouse.move(fromX + byX, fromY + byY);
    await page.mouse.up();
    await settled(page);
    return await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('#free')!;
      return {
        translate: element.style.translate,
        transform: element.style.transform,
      };
    });
  };
  const accepted = await freeDrag(140, 140, 30, 40);
  const rejected = await freeDrag(170, 180, 50, 50);
  check(
    'H4.f',
    'free rest accumulates on accept, returns on reject, keeps transform',
    accepted.translate === '30px 40px' &&
      rejected.translate === '30px 40px' &&
      rejected.transform === 'rotate(10deg)',
    { accepted, rejected },
  );

  // Each motion is independently optional.
  for (const [name, landing, neighbors] of [
    ['neither', false, false],
    ['landing only', true, false],
    ['neighbours only', false, true],
  ] as const) {
    await open(page);
    const seen = await page
      .evaluate(
        ([withLanding, withNeighbors]) => {
          const motion = lab.slide({ duration: 300 });
          const options = {
            ...(withLanding ? { landing: motion } : {}),
            ...(withNeighbors ? { neighbors: motion } : {}),
          };
          lab.sortable(lab.mountList({ count: 6 }), options);
        },
        [landing, neighbors] as const,
      )
      .then(async () => {
        await pointerGesture(page, 0, false);
        const moving = await page.evaluate(
          () => document.getAnimations().length,
        );
        await page.mouse.up();
        const after = await page.evaluate(() =>
          document
            .getAnimations()
            .map(
              (animation) =>
                ((animation.effect as KeyframeEffect).target as HTMLElement)
                  .dataset['k'],
            ),
        );
        return { moving, after };
      });
    const expectedMoving = neighbors ? 2 : 0;
    check(
      `H2.h.${name}`,
      'motion options act independently',
      seen.moving === expectedMoving && seen.after.includes('0') === landing,
      seen,
    );
  }
  await page.close();
}

// ---------------------------------------------------------------------------
// H5: predicted displacement equals the real post-commit layout.
// ---------------------------------------------------------------------------
async function h5(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const variants: ReadonlyArray<readonly [string, Lab.ListSpec]> = [
    ['flex gap, equal heights', { count: 6 }],
    [
      'flex gap, varied heights',
      { count: 6, heights: [40, 90, 30, 120, 60, 75] },
    ],
    [
      'block with uniform margin',
      { count: 6, display: 'block', heights: [40, 90, 30, 120, 60, 75] },
    ],
    [
      'non-uniform margins',
      {
        count: 6,
        display: 'block',
        heights: [40, 90, 30, 120, 60, 75],
        margins: [0, 20, 4, 30, 9, 0],
      },
    ],
    [
      'fractional heights',
      { count: 6, heights: [40.25, 90.5, 30.75, 120.125, 60.375, 75.625] },
    ],
  ];
  const report: Record<string, number> = {};
  for (const [name, spec] of variants) {
    let worst = 0;
    for (let from = 0; from < 6; from += 1) {
      for (let to = 0; to < 6; to += 1) {
        if (from === to) {
          continue;
        }
        await open(page);
        await page.evaluate(
          ([list, keep]) => {
            lab.mountSort(list, { ...(keep as Lab.Spec) }, 0);
          },
          [spec, { ...NO_SPEC, pending: true }] as const,
        );
        await page.evaluate((k) => {
          lab.item(k).focus();
        }, from);
        await page.keyboard.press('Space');
        for (let step = 0; step < Math.abs(to - from); step += 1) {
          await page.keyboard.press(to > from ? 'ArrowDown' : 'ArrowUp');
        }
        await page.keyboard.press('Space');
        const read = () =>
          page.evaluate(() =>
            Object.fromEntries(
              lab
                .items()
                .map((element) => [
                  element.dataset['k'],
                  element.getBoundingClientRect().top,
                ]),
            ),
          );
        const predicted = await read();
        await page.evaluate(() => {
          lab.settle('true');
        });
        await settled(page);
        const actual = await read();
        for (const key of Object.keys(predicted)) {
          worst = Math.max(worst, Math.abs(predicted[key]! - actual[key]!));
        }
      }
    }
    report[name] = Number(worst.toFixed(3));
  }
  measurements['H5.residualPx'] = report;
  console.table(report);
  check(
    'H5.a',
    'residual under half a pixel for equal heights',
    report['flex gap, equal heights']! < 0.5,
    report['flex gap, equal heights'],
  );
  check(
    'H5.b',
    'residual under half a pixel for varied heights',
    report['flex gap, varied heights']! < 0.5,
    report['flex gap, varied heights'],
  );
  check(
    'H5.c',
    'residual under half a pixel for uniform block margins',
    report['block with uniform margin']! < 0.5,
    report['block with uniform margin'],
  );
  check(
    'H5.d',
    'residual under half a pixel for fractional heights',
    report['fractional heights']! < 0.5,
    report['fractional heights'],
  );
  await page.close();
}

// ---------------------------------------------------------------------------
// H6: keyboard shares the machine and keeps focus.
// ---------------------------------------------------------------------------
async function h6(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const mount = async (list: Lab.ListSpec, spec: Lab.Spec, duration = 0) => {
    await open(page);
    await page.evaluate(
      ([l, s, d]) => {
        lab.mountSort(l, s, d);
      },
      [list, spec, duration] as const,
    );
  };
  const focused = () =>
    page.evaluate(() => (document.activeElement as HTMLElement).dataset['k']);

  await mount({ count: 6 }, { ...NO_SPEC });
  await keyboardGesture(page, 1);
  check(
    'H6.a',
    'keyboard commits the same transaction',
    (await page.evaluate(() => lab.order())) === '023145',
    await page.evaluate(() => lab.order()),
  );
  check(
    'H6.b',
    'focus survives the DOM move',
    (await focused()) === '1',
    await focused(),
  );

  await mount({ count: 6 }, { ...NO_SPEC });
  await page.evaluate(() => {
    lab.item(1).focus();
  });
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  const escaped = await observe(page, 'sort');
  check(
    'H6.c',
    'Escape restores order and styles',
    escaped.order === '012345' &&
      escaped.translate.replaceAll('|', '') === '' &&
      escaped.ends.join() === 'canceled',
    escaped.ends,
  );

  await mount({ count: 6 }, { ...NO_SPEC });
  await page.evaluate(() => {
    lab.item(1).focus();
  });
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.evaluate(() => {
    lab.item(4).focus();
  });
  const blurred = await observe(page, 'sort');
  check(
    'H6.d',
    'losing focus cancels',
    blurred.ends.join() === 'canceled' && blurred.order === '012345',
    blurred.ends,
  );

  await mount({ count: 6, button: true }, { ...NO_SPEC });
  await page.evaluate(() => {
    lab.item(1).querySelector('button')!.focus();
  });
  await page.keyboard.press('Space');
  const inner = await observe(page, 'sort');
  check(
    'H6.e',
    'Space on an inner button does not lift',
    inner.starts === 0 && (await page.evaluate(() => lab.log.clicks)) === 1,
    { starts: inner.starts },
  );

  await mount({ count: 6 }, { ...NO_SPEC });
  await page.evaluate(() => {
    lab.item(0).focus();
  });
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  const limit = await page.evaluate(() => [lab.log.changes, scrollY]);
  check(
    'H6.f',
    'a step past the end changes nothing and does not scroll',
    limit[0] === 0 && limit[1] === 0,
    limit,
  );
  await page.keyboard.press('Escape');

  // Consumer-owned order: the DOM moves inside decide, focus must survive it.
  await open(page);
  await page.evaluate(() => {
    const list = lab.mountList({ count: 6 });
    lab.sortable(list, {
      consumerOrder: true,
      async decide(value) {
        await Promise.resolve();
        const anchor = lab.items()[value.to]!;
        if (value.to > value.from) {
          anchor.after(value.item!);
        } else {
          anchor.before(value.item!);
        }
        return true;
      },
      onEnd(outcome) {
        lab.log.ends.push(outcome);
      },
    });
  });
  await keyboardGesture(page, 1);
  await settled(page);
  const owned = await page.evaluate(() => ({
    order: lab.order(),
    ends: lab.log.ends,
    focus: (document.activeElement as HTMLElement).dataset['k'],
    translate: lab
      .items()
      .map((element) => element.style.translate)
      .join(''),
    top: lab.rectOf(1).top,
  }));
  check(
    'H6.g',
    'consumer-owned DOM move is not mistaken for losing focus',
    owned.ends.join() === 'accepted' &&
      owned.order === '023145' &&
      owned.translate === '',
    owned,
  );
  check(
    'H6.h',
    'focus survives a consumer-owned DOM move',
    owned.focus === '1',
    owned.focus,
  );

  // A long scrolled list: rapid steps with motion keep the item in view.
  await mount({ count: 50, scroller: true }, { ...NO_SPEC }, 200);
  await page.evaluate(() => {
    lab.item(0).focus();
  });
  await page.keyboard.press('Space');
  let worstOutside = 0;
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('ArrowDown');
    const outside = await page.evaluate(() => {
      const scroller = document
        .querySelector('#scroller')!
        .getBoundingClientRect();
      const destination = lab.item(0).getBoundingClientRect();
      return Math.max(
        0,
        destination.bottom - scroller.bottom,
        scroller.top - destination.top,
      );
    });
    worstOutside = Math.max(worstOutside, outside);
  }
  await page.waitForTimeout(260);
  const settledOutside = await page.evaluate(() => {
    const scroller = document
      .querySelector('#scroller')!
      .getBoundingClientRect();
    const destination = lab.item(0).getBoundingClientRect();
    return Math.max(
      0,
      destination.bottom - scroller.bottom,
      scroller.top - destination.top,
    );
  });
  await page.keyboard.press('Space');
  await settled(page);
  const scrolled = await page.evaluate(() => {
    const scroller = document
      .querySelector('#scroller')!
      .getBoundingClientRect();
    const destination = lab.item(0).getBoundingClientRect();
    return {
      index: lab.items().indexOf(lab.item(0)),
      outside: Math.max(
        0,
        destination.bottom - scroller.bottom,
        scroller.top - destination.top,
      ),
      focus: (document.activeElement as HTMLElement).dataset['k'],
    };
  });
  measurements['H6.scroll'] = { worstOutside, settledOutside, ...scrolled };
  check(
    'H6.i',
    'keyboard steps end with the item fully in view',
    settledOutside < 0.5,
    { worstOutside, settledOutside },
  );
  check(
    'H6.j',
    'keyboard commit in a scrolled list lands in view with focus',
    scrolled.index === 30 && scrolled.outside < 0.5 && scrolled.focus === '0',
    scrolled,
  );
  await page.close();
}

// ---------------------------------------------------------------------------
// H7: scroll during a session.
// ---------------------------------------------------------------------------
async function h7(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  for (const where of ['element', 'window'] as const) {
    await open(page);
    await page.evaluate(
      ([scroller, spec]) => {
        lab.mountSort({ count: 50, scroller }, spec, 0);
      },
      [where === 'element', NO_SPEC] as const,
    );
    const { x, y } = await page.evaluate(() => lab.rectOf(2));
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 8);
    await settled(page);
    const before = await metrics(cdp);
    await page.mouse.wheel(0, 340);
    await page.waitForTimeout(200);
    const after = await metrics(cdp);
    const seen = await page.evaluate(
      ([kind, py]) => {
        const scrollTop =
          kind === 'element'
            ? document.querySelector('#scroller')!.scrollTop
            : scrollY;
        return {
          scrollTop,
          itemCentre: lab.rectOf(2).y,
          pointerY: py,
          changes: lab.log.changes,
        };
      },
      [where, y + 8] as const,
    );
    check(
      `H7.a.${where}`,
      'the item stays under the pointer through a wheel scroll',
      seen.scrollTop > 100 && Math.abs(seen.itemCentre - seen.pointerY) < 1,
      seen,
    );
    const expected = Math.round(seen.scrollTop / 68);
    await page.mouse.up();
    await settled(page);
    const index = await page.evaluate(() => lab.items().indexOf(lab.item(2)));
    check(
      `H7.b.${where}`,
      'the commit uses the scrolled proposal',
      Math.abs(index - (2 + expected)) <= 1,
      { index, expected: 2 + expected },
    );
    measurements[`H7.${where}`] = {
      ...seen,
      layouts: after['LayoutCount']! - before['LayoutCount']!,
      index,
    };
  }
  await page.close();
}

// ---------------------------------------------------------------------------
// H8: clicks.
// ---------------------------------------------------------------------------
async function h8(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const mount = async () => {
    await open(page);
    await page.evaluate(
      ([spec]) => {
        lab.mountSort({ count: 6, button: true }, spec, 0);
      },
      [NO_SPEC] as const,
    );
  };
  const buttonAt = (k: number) =>
    page.evaluate((index) => {
      const rect = lab
        .item(index)
        .querySelector('button')!
        .getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, k);
  const clicks = () =>
    page.evaluate(() => [lab.log.clicks, lab.log.listClicks]);

  await mount();
  let at = await buttonAt(1);
  await page.mouse.click(at.x, at.y);
  check(
    'H8.a',
    'a plain click reaches the inner button',
    (await clicks())[0] === 1,
    await clicks(),
  );

  await mount();
  at = await buttonAt(1);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 2, at.y + 1);
  await page.mouse.up();
  check(
    'H8.b',
    'a click under threshold reaches the button',
    (await clicks())[0] === 1,
    await clicks(),
  );

  await mount();
  at = await buttonAt(1);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x, at.y + 10);
  await page.mouse.move(at.x, at.y + 5);
  await page.mouse.up();
  await settled(page);
  const afterDrag = await clicks();
  check(
    'H8.c',
    'a click after a drag that ends on the item is suppressed',
    afterDrag[0] === 0 && afterDrag[1] === 0,
    afterDrag,
  );
  at = await buttonAt(1);
  await page.mouse.click(at.x, at.y);
  check(
    'H8.d',
    'the next real click is delivered',
    (await clicks())[0] === 1,
    await clicks(),
  );
  await page.evaluate(() => {
    lab.item(2).querySelector('button')!.click();
  });
  check(
    'H8.e',
    'a later programmatic click is delivered',
    (await clicks())[0] === 2,
    await clicks(),
  );

  await mount();
  at = await buttonAt(1);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x, at.y + 10);
  await page.keyboard.press(CANCEL_KEY);
  await settled(page);
  await page.mouse.move(at.x, at.y);
  await page.mouse.up();
  await settled(page);
  const afterCancel = await clicks();
  check(
    'H8.f',
    'a release after a mid-drag cancel delivers no click',
    afterCancel[0] === 0 && afterCancel[1] === 0,
    afterCancel,
  );

  await mount();
  at = await buttonAt(1);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x, at.y + 10);
  await page.evaluate(() => {
    lab.controller.destroy();
  });
  await settled(page);
  await page.mouse.move(at.x, at.y);
  await page.mouse.up();
  await settled(page);
  measurements['H8.destroyMidDragThenRelease'] = await clicks();

  // A link inside an item would start a native drag without the session guard.
  await open(page);
  await page.evaluate(
    ([spec]) => {
      lab.mountSort({ count: 6, link: true }, spec, 0);
    },
    [NO_SPEC] as const,
  );
  const link = await page.evaluate(() => {
    const rect = lab.item(0).querySelector('a')!.getBoundingClientRect();
    return { x: rect.left + 5, y: rect.top + 5 };
  });
  await page.mouse.move(link.x, link.y);
  await page.mouse.down();
  await page.mouse.move(link.x, link.y + 10);
  await page.mouse.move(link.x, link.y + 150);
  await page.mouse.up();
  await settled(page);
  const dragged = await observe(page, 'sort');
  check(
    'H8.g',
    'pressing on a link cannot start a native drag',
    dragged.ends.join() === 'accepted',
    { ends: dragged.ends, order: dragged.order },
  );
  await page.close();
}

// ---------------------------------------------------------------------------
// Lifecycle, touch and the model-based fuzz.
// ---------------------------------------------------------------------------
async function lifecycle(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await open(page);
  const baseline = await globalListeners(cdp);
  await page.evaluate(
    ([spec]) => {
      lab.mountSort({ count: 200 }, spec, 0);
    },
    [NO_SPEC] as const,
  );
  const idleRoot = await listenerCount(cdp, "document.querySelector('#list')");
  const idleItem = await listenerCount(
    cdp,
    "document.querySelector('#list > li')",
  );
  check(
    'L.a',
    'idle costs two root listeners, none per item, none global',
    idleRoot === 3 &&
      idleItem === 0 &&
      (await globalListeners(cdp)) === baseline,
    { idleRoot, idleItem },
  );
  await pointerGesture(page, 0, false);
  const during = await globalListeners(cdp);
  await page.mouse.up();
  await settled(page);
  measurements['L.listeners'] = {
    idleRoot,
    idleItem,
    baseline,
    during,
    after: await globalListeners(cdp),
  };
  await page.evaluate(() => {
    lab.controller.destroy();
  });
  check(
    'L.b',
    'destroy leaves no library listener',
    (await listenerCount(cdp, "document.querySelector('#list')")) === 1 &&
      (await globalListeners(cdp)) === baseline,
  );

  // Collectability once the consumer drops the controller and the list.
  await page.evaluate(() => {
    const element = lab.mountList({ count: 10 });
    element.id = 'collectable';
    const held = lab.sortable(element);
    const reference = new WeakRef(element);
    element.remove();
    held.destroy();
    Object.assign(globalThis, { reference });
  });
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(50);
  await cdp.send('HeapProfiler.collectGarbage');
  const collected = await page.evaluate(
    () =>
      (
        globalThis as unknown as { reference: WeakRef<object> }
      ).reference.deref() === undefined,
  );
  check('L.c', 'a destroyed list is collectable', collected);
  await page.close();
}

async function touch(browserHasTouch: BrowserContext): Promise<void> {
  const page = await browserHasTouch.newPage();
  const cdp = await browserHasTouch.newCDPSession(page);
  const send = (
    type: string,
    points: ReadonlyArray<Readonly<{ x: number; y: number }>>,
  ) =>
    cdp.send('Input.dispatchTouchEvent', {
      type: type as 'touchStart',
      touchPoints: [...points],
    });

  for (const action of ['none', 'pan-y'] as const) {
    await open(page);
    await page.evaluate(
      ([ta, spec]) => {
        lab.mountSort({ count: 30, touchAction: ta }, spec, 0);
      },
      [action, NO_SPEC] as const,
    );
    const { x, y } = await page.evaluate(() => lab.rectOf(0));
    await send('touchStart', [{ x, y }]);
    for (let step = 1; step <= 15; step += 1) {
      await send('touchMove', [{ x, y: y + step * 10 }]);
    }
    await send('touchEnd', []);
    await settled(page);
    const seen = await observe(page, 'sort');
    if (action === 'none') {
      check(
        'T.a',
        'a touch drag with touch-action none commits',
        seen.ends.join() === 'accepted' && seen.order.startsWith('12'),
        { ends: seen.ends, order: seen.order.slice(0, 6) },
      );
    } else {
      const clean =
        seen.translate.replaceAll('|', '') === '' && seen.attributes === 0;
      check(
        'T.b',
        'a browser pan ends the session with no leftovers',
        clean && (seen.ends.join() === 'canceled' || seen.starts === 0),
        { starts: seen.starts, ends: seen.ends, order: seen.order.slice(0, 6) },
      );
    }
  }
  await page.close();
}

async function fuzzRun(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  let operations = 0;
  const violations: unknown[] = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    await open(page);
    const baseline = await globalListeners(cdp);
    const duration = seed % 2 === 0 ? 25 : 0;
    await page.evaluate(
      ([s, d]) => {
        lab.mountFuzz(s, d);
      },
      [seed, duration] as const,
    );
    let state = seed * 2654435761;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    let down = false;
    for (let index = 0; index < 500; index += 1) {
      const roll = random();
      operations += 1;
      const label = roll.toFixed(3);
      if (roll < 0.15) {
        const k = Math.floor(random() * 6);
        const at = await page.evaluate((target) => lab.rectOf(target), k);
        await page.mouse.move(at.x, at.y);
        if (!down) {
          await page.mouse.down();
          down = true;
        }
      } else if (roll < 0.5) {
        await page.mouse.move(40 + random() * 400, random() * 500);
      } else if (roll < 0.62) {
        if (down) {
          await page.mouse.up();
          down = false;
        }
      } else if (roll < 0.66) {
        await page.keyboard.press(CANCEL_KEY);
      } else if (roll < 0.7) {
        await page.evaluate(() => {
          lab.controller.cancel();
        });
      } else if (roll < 0.72) {
        await page.evaluate(() => {
          lab.controller.destroy();
        });
      } else if (roll < 0.78) {
        const how = (['true', 'false', 'reject'] as const)[
          Math.floor(random() * 3)
        ]!;
        await page.evaluate((verdict) => {
          if (verdict === 'reject' && fuzz.pending) {
            (fuzz as { expectedErrors: number }).expectedErrors += 1;
          }
          lab.settle(verdict);
        }, how);
      } else if (roll < 0.84) {
        const k = Math.floor(random() * 6);
        await page.evaluate((target) => {
          lab.item(target).focus();
        }, k);
        await page.keyboard.press('Space');
      } else {
        await page.keyboard.press(roll < 0.92 ? 'ArrowDown' : 'ArrowUp');
      }
      const reached = await page.evaluate(() => {
        const problem = lab.fuzzCheck();
        const { destroyed, active } = fuzz;
        if (!problem && destroyed && active === 0) {
          remount();
        }
        return problem;
      });
      if (reached) {
        violations.push({ seed, index, label, reached });
        break;
      }
      await page.evaluate(() => Promise.resolve());
    }
    if (down) {
      await page.mouse.up();
    }
    await page.evaluate(() => {
      lab.controller.cancel();
      lab.settle('true');
    });
    await page.waitForTimeout(duration + 30);
    const end = await page.evaluate(() => ({
      problem: lab.fuzzCheck(),
      errors: lab.log.errors,
      expected: fuzz.expectedErrors,
      rejections: lab.log.rejections,
    }));
    if (end.problem || end.errors !== end.expected || end.rejections !== 0) {
      violations.push({ seed, end });
    }
    if ((await globalListeners(cdp)) !== baseline) {
      violations.push({ seed, listeners: 'left' });
    }
  }
  measurements['F.fuzz'] = { operations, violations };
  check(
    'F.a',
    `${operations} random operations keep order, cleanliness and error accounting`,
    violations.length === 0,
    violations.slice(0, 5),
  );
  await page.close();
}

const context = await browser.newContext({
  viewport: { width: 1000, height: 800 },
});
const touchContext = await browser.newContext({
  viewport: { width: 1000, height: 800 },
  hasTouch: true,
});
const suite: ReadonlyArray<readonly [string, () => Promise<void>]> = [
  ['H1', () => h1(context)],
  ['H2', () => h2(context)],
  ['H3', () => h3(context)],
  ['H4', () => h4(context)],
  ['H5', () => h5(context)],
  ['H6', () => h6(context)],
  ['H7', () => h7(context)],
  ['H8', () => h8(context)],
  ['L', () => lifecycle(context)],
  ['T', () => touch(touchContext)],
  ['F', () => fuzzRun(context)],
];
for (const [name, run] of suite) {
  if (!filter || filter.split(',').includes(name)) {
    await run();
  }
}
await browser.close();
server.close();

const failed = rows.filter((row) => !row.pass);
console.log(`\n${rows.length - failed.length}/${rows.length} checks passed`);
if (!filter) {
  await writeFile(
    new URL('results.json', here),
    `${JSON.stringify(
      { browser: browser.version(), rows, measurements },
      null,
      2,
    )}\n`,
  );
}
