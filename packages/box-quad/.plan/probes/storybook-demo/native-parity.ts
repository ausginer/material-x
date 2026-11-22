/**
 * Compares box-quad's read with Firefox's native `getBoxQuads()` on the
 * geometry of the getBoxQuadsPolyfill live demo, which `storybook-plan.md`
 * reproduces. The demo calls `target.getBoxQuads({ box: 'border', relativeTo:
 * stage })`; the story is to call `coordinates` on both elements and
 * `projection(target, quad, stage)`. The probe establishes that the two give the
 * same four points, in the same order.
 *
 * Firefox exposes `getBoxQuads()` to pages behind
 * `layout.css.getBoxQuads.enabled`. The DOM below is written for the probe from
 * the demo's numbers (positions, sizes, padding, border, the transform and the
 * slider ranges); none of the demo's markup or CSS is copied.
 *
 * Run from the repository root: `node packages/box-quad/.plan/probes/storybook-demo/native-parity.ts`.
 * It loads the package's built `index.js`, so run `aube exec just build` in
 * `packages/box-quad` first.
 */
import { readFile } from 'node:fs/promises';
import { firefox } from 'playwright';

const moduleSource = await readFile(
  new URL('../../../index.js', import.meta.url),
  'utf8',
);

const page = `<!doctype html>
<style>
  body { margin: 0; font: 14px system-ui; }
  .stage { position: relative; width: 640px; min-height: 420px; padding: 28px; box-sizing: border-box; overflow: hidden; }
  .stack { position: relative; width: 100%; height: 100%; min-height: 364px; }
  .card { position: absolute; }
  .base { left: 90px; top: 110px; width: 300px; height: 200px; border: 2px solid; }
  .target { left: 170px; top: 146px; width: 220px; height: 120px; padding: 20px 28px; border: 8px solid; transform-origin: center; }
  .nested-outer { margin: 40px; height: 300px; overflow: auto; }
  .nested-space { rotate: 12deg; zoom: 1.25; padding: 200px 0 600px; }
</style>
<div id="demo-host"></div>
<div class="nested-outer" id="scroller"><div class="nested-space" id="nested-host"></div></div>
<script type="module">
  import { coordinates, projection } from './box-quad.js';
  const stageMarkup = '<div class="stage"><div class="stack"><div class="card base">Ancestor</div><div class="card target">Target node</div></div></div>';
  for (const id of ['demo-host', 'nested-host']) document.getElementById(id).innerHTML = stageMarkup;
  window.read = (hostId, rotation, skew) => {
    const host = document.getElementById(hostId);
    const stage = host.querySelector('.stage');
    const target = host.querySelector('.target');
    target.style.transform = 'rotate(' + rotation + 'deg) skewX(' + skew + 'deg)';
    const t = new Float64Array(8), s = new Float64Array(8), q = new Float64Array(8);
    const ok = coordinates(target, t) && coordinates(stage, s) && projection(t, q, s);
    const [n] = target.getBoxQuads({ box: 'border', relativeTo: stage });
    const native = [n.p1, n.p2, n.p3, n.p4].flatMap((p) => [p.x, p.y]);
    return { ok, boxQuad: Array.from(q), native };
  };
  document.getElementById('scroller').scrollTop = 170;
  window.ready = true;
</script>`;

const browser = await firefox.launch({
  firefoxUserPrefs: { 'layout.css.getBoxQuads.enabled': true },
});
const context = await browser.newContext();
const tab = await context.newPage();
await tab.route('http://probe.test/**', (route) => {
  const url = new URL(route.request().url());
  return url.pathname === '/box-quad.js'
    ? route.fulfill({ contentType: 'text/javascript', body: moduleSource })
    : route.fulfill({ contentType: 'text/html', body: page });
});
await tab.goto('http://probe.test/');
await tab.waitForFunction(
  () => (window as unknown as { ready?: boolean }).ready,
);

console.log(`Firefox ${browser.version()}, layout.css.getBoxQuads.enabled`);
console.log('variant  rotation skew  ok    max |box-quad - native| (px)');

const cases: ReadonlyArray<readonly [string, number, number]> = [
  ['demo-host', -18, 8],
  ['demo-host', 0, 0],
  ['demo-host', -55, -20],
  ['demo-host', 55, 20],
  ['demo-host', 33, -7],
  ['nested-host', -18, 8],
  ['nested-host', 55, -20],
];

for (const [host, rotation, skew] of cases) {
  const result = await tab.evaluate(
    ([h, r, k]) =>
      (
        window as unknown as {
          read(
            h: string,
            r: number,
            k: number,
          ): { ok: boolean; boxQuad: number[]; native: number[] };
        }
      ).read(h, r, k),
    [host, rotation, skew] as const,
  );
  const error = Math.max(
    ...result.native.map((value, index) =>
      Math.abs(value - result.boxQuad[index]!),
    ),
  );
  const variant = host === 'demo-host' ? 'demo  ' : 'nested';
  console.log(
    `${variant}   ${String(rotation).padStart(4)}   ${String(skew).padStart(4)}  ${String(result.ok).padEnd(5)} ${error.toExponential(2)}`,
  );
  if (host === 'demo-host' && rotation === -18) {
    const format = (values: number[]): string =>
      [0, 2, 4, 6]
        .map(
          (i) =>
            `p${i / 2 + 1} (${values[i]!.toFixed(2)}, ${values[i + 1]!.toFixed(2)})`,
        )
        .join(' ');
    console.log(`  box-quad ${format(result.boxQuad)}`);
    console.log(`  native   ${format(result.native)}`);
  }
}

await browser.close();
