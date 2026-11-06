/**
 * Per-move and per-press cost with real input, median of three runs in headless
 * Chromium: the moves as the plan's section 4 measured them, a press and release
 * below the threshold, and what the kernel module allocates on the move path, by
 * V8's sampling heap profiler. Writes `.plan/probes/prototype/cost.json`.
 */
import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = `${here}/..`;
const output = `${root}/../.plan/probes/prototype/cost.json`;

const bundle = await build({
  entryPoints: [`${here}/cost-lab.ts`],
  bundle: true,
  format: 'iife',
  write: false,
  target: 'es2022',
  define: { __DEV__: 'false' },
  alias: { '@ydinjs/box-quad': `${root}/../../box-quad/src/index.ts` },
  plugins: [
    {
      name: 'consumer-alias',
      setup(context) {
        context.onResolve({ filter: /^@ydinjs\/drag\// }, ({ path }) => ({
          path: `${root}/src/${path.slice('@ydinjs/drag/'.length).replace(/\.js$/u, '.ts')}`,
        }));
      },
    },
  ],
  logLevel: 'silent',
});
const code = bundle.outputFiles[0]!.text;
const browser = await chromium.launch();
const MOVES = 300;
const PRESSES = 100;
const ROWS = 9;

const median = (values: number[]): number =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]!;

const open = async (count: number) => {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  await page.setContent('<!doctype html><body style="margin:40px"></body>');
  await page.addScriptTag({ content: code });
  await page.evaluate((n) => {
    (globalThis as any).make(n);
  }, count);

  const cdp = await page.context().newCDPSession(page);

  await cdp.send('Performance.enable');

  const metrics = async (): Promise<Record<string, number>> =>
    Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map(
        ({ name, value }) => [name, value],
      ),
    );

  return { page, cdp, metrics };
};

const X = 140;
const Y0 = 40 + 40 * 2 + 20;
const rows: unknown[] = [];

for (const count of [20, 2000]) {
  const moves: Array<Record<string, number>> = [];
  const presses: Array<Record<string, number>> = [];

  for (let run = 0; run < 3; run += 1) {
    const { page, metrics } = await open(count);

    await page.mouse.move(X, Y0);
    await page.mouse.down();
    await page.mouse.move(X, Y0 + 12, { steps: 2 });
    await page.mouse.move(X, Y0 + 20);
    await page.waitForTimeout(50);

    const a = await metrics();

    for (let i = 0; i < MOVES; i += 1) {
      const phase = Math.abs(((i / 60) % 2) - 1);

      await page.mouse.move(X, Y0 + 20 + phase * ROWS * 40);
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }

    const b = await metrics();

    await page.mouse.up();
    await page.waitForTimeout(30);
    moves.push({
      layouts: b['LayoutCount']! - a['LayoutCount']!,
      scriptUs: ((b['ScriptDuration']! - a['ScriptDuration']!) * 1e6) / MOVES,
      taskUs: ((b['TaskDuration']! - a['TaskDuration']!) * 1e6) / MOVES,
    });

    await page.mouse.move(X, Y0);
    await page.waitForTimeout(30);

    const c = await metrics();

    for (let i = 0; i < PRESSES; i += 1) {
      await page.mouse.down();
      await page.mouse.up();
    }

    const d = await metrics();

    presses.push({
      layouts: d['LayoutCount']! - c['LayoutCount']!,
      scriptUs: ((d['ScriptDuration']! - c['ScriptDuration']!) * 1e6) / PRESSES,
      taskUs: ((d['TaskDuration']! - c['TaskDuration']!) * 1e6) / PRESSES,
    });
    await page.close();
  }

  const summarize = (runs: Array<Record<string, number>>) =>
    Object.fromEntries(
      Object.keys(runs[0]!).flatMap((key) => {
        const values = runs.map((run) => run[key]!);

        return [
          [key, Math.round(median(values))],
          [
            `${key}Range`,
            [Math.round(Math.min(...values)), Math.round(Math.max(...values))],
          ],
        ];
      }),
    );

  const row = {
    items: count,
    perMove: summarize(moves),
    perPressAndRelease: summarize(presses),
  };

  rows.push(row);
  console.log(JSON.stringify(row));
}

// What the move path allocates, by function, between the moves of one drag. The
// bundle is unminified, so the kernel's methods keep their names.
const { page, cdp } = await open(20);

await page.mouse.move(X, Y0);
await page.mouse.down();
await page.mouse.move(X, Y0 + 12, { steps: 2 });
await page.mouse.move(X, Y0 + 20);
await page.waitForTimeout(50);
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.startSampling', {
  samplingInterval: 64,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
});

for (let i = 0; i < MOVES; i += 1) {
  const phase = Math.abs(((i / 60) % 2) - 1);

  await page.mouse.move(X, Y0 + 20 + phase * ROWS * 40);
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

const { profile } = await cdp.send('HeapProfiler.stopSampling');

type Node = {
  callFrame: { functionName: string };
  selfSize: number;
  children: Node[];
};

const byFunction = new Map<string, number>();
const walk = (node: Node): void => {
  const name = node.callFrame.functionName || '(anonymous)';

  byFunction.set(name, (byFunction.get(name) ?? 0) + node.selfSize);
  node.children.forEach(walk);
};

walk(profile.head);
await page.mouse.up();
await browser.close();

const allocation = [...byFunction]
  .toSorted((a, b) => b[1] - a[1])
  .slice(0, 25)
  .map(([name, bytes]) => ({ name, bytesPerMove: Math.round(bytes / MOVES) }));

await writeFile(
  output,
  `${JSON.stringify({ moves: MOVES, presses: PRESSES, rows, allocation }, null, 1)}\n`,
);
console.log(allocation);
