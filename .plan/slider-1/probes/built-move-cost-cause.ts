// Why one value change costs more on the built mx-slider than on the
// prototype's `all` in move-cost.ts. Every variant is on one page and the
// rounds are interleaved, so the host's load is the same for each. Each round
// is compared with the same round's `proto` (the prototype's `all`), and the
// median of those ratios is printed beside the median and the minimum.
//
// The two suspects are crossed: the script (the prototype's direct writes, or
// the built listener) and the styles (the prototype's, or the built ones).
// Then one thing at a time is taken from the built styles.
//
//   script  - the round without the flush, so without style and layout
//   flushed - the round with a rect read after each change
//   held    - the flushed round while the mouse button is down on the slider,
//             as in a drag, so the held state and the value indicator are drawn
//   frames  - Chromium: main-thread task time of a frame that changes the value
//
// node built-move-cost-cause.ts <packages> <chromium|firefox|webkit> <modes> <rounds> [variant;...]
// The modes are separated by commas. No variant list means all of them.
// Build the packages first.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE, MODES, ROUNDS, ONLY] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
  string,
  string,
  string | undefined,
];
const build = await rolldown({
  input: join(PACKAGES, 'material-x/slider/slider.js'),
  platform: 'browser',
});
const { output } = await build.generate({
  format: 'iife',
  name: 'slider',
  exports: 'named',
});
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage();
page.on('pageerror', (error) => {
  console.log('  page error', String(error));
});
const filler = '<p>text <b>bold</b></p>'.repeat(250);
await page.setContent(
  `<!doctype html><style>x-s,mx-slider{display:block;inline-size:300px}</style><div>${filler}</div><section></section><div>${filler}</div><script>${code.replaceAll('</script', '<\\/script')}</script>`,
);
const ids: string[] = await page.evaluate((only) => {
  const section = document.querySelector('section')!;
  const sheet = (text: string) => {
    const s = new CSSStyleSheet();
    s.replaceSync(text);
    return s;
  };
  const sample = document.createElement('mx-slider');
  const built = sample
    .shadowRoot!.adoptedStyleSheets.flatMap((s) => [...s.cssRules])
    .map((r) => r.cssText)
    .join('\n');
  const proto = `
    .track{position:relative;block-size:44px}
    input{all:unset;appearance:none;position:absolute;inset:0;inline-size:100%;block-size:100%}
    input::-webkit-slider-runnable-track{block-size:100%}
    input::-webkit-slider-thumb{appearance:none;inline-size:4px;block-size:100%}
    input::-moz-range-thumb{appearance:none;border:0;inline-size:4px;block-size:44px;background:transparent}
    .handle{position:absolute;inset-block:0;inline-size:4px;background:purple;border-radius:2px;pointer-events:none}
    .handle::after{content:attr(data-v);position:absolute;inset-block-end:calc(100% + 12px);color:#fff;background:#333;visibility:hidden}
    .track::before,.track::after{content:'';position:absolute;inset-block:14px}
    .handle{inset-inline-start:calc(var(--_f) * (100% - 4px))}
    .track::before{inset-inline:0 calc(100% - var(--_f) * (100% - 4px) + 6px);background:purple;border-radius:8px 2px 2px 8px}
    .track::after{inset-inline:calc(var(--_f) * (100% - 4px) + 10px) 0;background:#ddd;border-radius:2px 8px 8px 2px}`;

  // The tokens are every custom property of the first rules, with literals.
  const tokens = new Map<string, string>();
  for (const s of sample.shadowRoot!.adoptedStyleSheets) {
    for (const r of s.cssRules) {
      if (
        r instanceof CSSStyleRule &&
        r.selectorText === '.track' &&
        !tokens.has([...r.style][0]!)
      ) {
        for (const name of r.style) {
          const value = r.style.getPropertyValue(name);
          if (name.startsWith('--')) {
            tokens.set(name, value);
          }
        }
      }
    }
  }
  const geometry = [...tokens].filter(([, v]) => v.includes('100%'));
  for (const [name] of geometry) {
    tokens.delete(name);
  }
  const fraction = /--[\w-]+/u.exec(
    sample.shadowRoot!.querySelector<HTMLElement>('.track')!.style.cssText,
  )![0];
  const literal = (text: string) => {
    let out = text;
    for (let n = 0; n < 4; n += 1) {
      out = out.replaceAll(/var\((--[\w-]+)\)/gu, (all, name) =>
        tokens.has(name) ? tokens.get(name)! : all,
      );
    }
    return out;
  };
  const noTokenRules = (text: string) =>
    text.replaceAll(/(--[\w-]+): [^;}]+;/gu, (all, name) =>
      tokens.has(name) ? '' : all,
    );
  const noHas = (text: string) =>
    text
      .split('\n')
      .filter((rule) => !rule.startsWith('.track:has'))
      .join('\n');
  // Later declarations replace parts of the built ones.
  const plainAfter =
    '.track::after{background:#ddd !important}';
  const noPadding = '.track::after{padding:0 !important}';
  const plainBefore = '.track::before{background:purple !important;opacity:1 !important}';
  const noNative = '.input{display:none}';
  const protoGeometry = `
    .handle{inset-inline-start:calc(var(${fraction}) * (100% - 4px)) !important}
    .track::before{inset-inline:0 calc(100% - var(${fraction}) * (100% - 4px) + 6px) !important;inline-size:auto !important}
    .track::after{inset-inline:calc(var(${fraction}) * (100% - 4px) + 10px) 0 !important;inline-size:auto !important}`;

  customElements.define(
    'x-s',
    class extends HTMLElement {
      static formAssociated = true;
      i = this.attachInternals();
      run!: (n: number) => void;
      connectedCallback() {
        const root = this.attachShadow({ mode: 'open' });
        const styles = this.getAttribute('styles');
        root.innerHTML =
          '<label class="label" for="input"><slot name="label"></slot></label><div class="track"><input id="input" class="input" type="range" max="1000">' +
          (styles === 'none'
            ? ''
            : '<span class="handle" aria-hidden="true"></span>') +
          '</div>';
        root.adoptedStyleSheets = [
          sheet(
            styles === 'built'
              ? built
              : styles === 'none'
                ? proto.slice(0, proto.indexOf('.handle'))
                : proto,
          ),
        ];
        const input = root.querySelector('input')!;
        const track = root.querySelector<HTMLElement>('.track')!;
        const handle = root.querySelector<HTMLElement>('.handle')!;
        const name = styles === 'built' ? fraction : '--_f';
        const text = this.hasAttribute('text');
        const listener = () => {
          track.style.setProperty(name, String(Number(input.value) / 1000));
          if (text) {
            handle.dataset.v = input.value;
          }
          this.i.setFormValue(input.value);
        };
        if (this.hasAttribute('event')) {
          input.addEventListener('input', listener);
          this.run = (n) => {
            input.value = String(n);
            input.dispatchEvent(
              new Event('input', { bubbles: true, composed: true }),
            );
          };
        } else if (styles === 'none') {
          this.run = (n) => {
            input.value = String(n);
          };
        } else {
          this.run = (n) => {
            input.value = String(n);
            listener();
          };
        }
      }
    },
  );

  type Variant = { el: HTMLElement; run: (n: number) => void; box: Element };
  const variants = new Map<string, Variant>();
  const addProto = (id: string, html: string) => {
    if (only && !only.includes(id)) {
      return;
    }
    section.insertAdjacentHTML('beforeend', html);
    const el = section.lastElementChild as any;
    variants.set(id, {
      el,
      run: el.run,
      box: el.shadowRoot.querySelector('.handle') ?? el.shadowRoot.querySelector('input'),
    });
  };
  const addBuilt = (id: string, text: string | null, html = '<mx-slider max="1000"></mx-slider>') => {
    if (only && !only.includes(id)) {
      return;
    }
    section.insertAdjacentHTML('beforeend', html);
    const el = section.lastElementChild as HTMLElement;
    const input = el.shadowRoot!.querySelector('input')!;
    if (text !== null) {
      el.shadowRoot!.adoptedStyleSheets = [sheet(text)];
    }
    variants.set(id, {
      el,
      run: (n) => {
        input.value = String(n);
        input.dispatchEvent(
          new Event('input', { bubbles: true, composed: true }),
        );
      },
      box: el.shadowRoot!.querySelector('.handle')!,
    });
  };
  addProto('native', '<x-s styles="none"></x-s>');
  addProto('proto', '<x-s styles="proto" text></x-s>');
  addProto('proto-again', '<x-s styles="proto" text></x-s>');
  addProto('proto-no-text', '<x-s styles="proto"></x-s>');
  addProto('proto+event', '<x-s styles="proto" event></x-s>');
  addProto('direct+built-css', '<x-s styles="built"></x-s>');
  addProto('event+built-css', '<x-s styles="built" event></x-s>');
  addBuilt('built', null);
  addBuilt('built-recloned', built);
  addBuilt('built+proto-css', proto.replaceAll('--_f)', `${fraction})`));
  addBuilt('no-has', noHas(built));
  addBuilt('literals', noTokenRules(literal(built)));
  addBuilt('literals,no-has', noTokenRules(literal(noHas(built))));
  addBuilt('no-gradient', built + plainAfter);
  addBuilt('no-gradient,no-padding', built + plainAfter + noPadding);
  addBuilt('plain-parts', built + plainAfter + noPadding + plainBefore);
  addBuilt('proto-geometry', built + protoGeometry);
  addBuilt(
    'plain-parts,proto-geometry',
    built + plainAfter + noPadding + plainBefore + protoGeometry,
  );
  addBuilt(
    'literals,no-has,plain-parts,proto-geometry',
    noTokenRules(literal(noHas(built))) +
      plainAfter + noPadding + plainBefore + protoGeometry,
  );
  // One part of the inactive track's drawing at a time.
  addBuilt('no-padding', built + noPadding);
  addBuilt('no-stop-gradient', built.replaceAll(/radial-gradient\(.*?\) content-box( no-repeat)?( content-box)?, color-mix/gu, 'color-mix').replaceAll(/radial-gradient\(.*?\) no-repeat( content-box)?, color-mix/gu, 'color-mix'));
  addBuilt('gradient-only', built + '.track::after{background:radial-gradient(closest-side,#333 calc(100% - .25px),transparent calc(100% + .25px)) content-box no-repeat,#ddd !important}');
  // The stop indicator as its own element: no gradient, padding or color-mix.
  // It reads the same tokens as the built rule, under their minified names.
  const name = (pattern: string) => {
    const match = new RegExp(pattern.replaceAll('V', 'var\\((--[\\w-]+)(?:, ?1)?\\)'), 'u').exec(built);
    if (!match) {
      throw new Error('no match for ' + pattern);
    }
    return match.slice(1).map((n) => 'var(' + n + ')');
  };
  const [inactive, trailing, size] = name('max\\(\\s*0px,\\s*V - V - V') as [string, string, string];
  const [stopColor] = name('--md-slider-stop-indicator-color, ?V');
  const [stopOpacity] = name('--md-slider-stop-indicator-color, ?var\\([^)]*\\)\\)\\s*calc\\(V');
  const [inactiveColor] = name('--md-slider-inactive-track-color, ?V');
  const [inactiveOpacity] = name('--md-slider-inactive-track-color, ?var\\([^)]*\\)\\)\\s*calc\\(V');
  const [height] = name('block-size: V');
  const withDefault = (ref: string) => ref.replace(')', ',1)');
  const stop = (end: string) => `
    .track::after{background:var(--md-slider-inactive-track-color,${inactiveColor}) !important;padding:0 !important;opacity:${withDefault(inactiveOpacity!)}}
    .stop{position:absolute;inset-block:calc((${height} - ${size}) / 2);inset-inline-end:${trailing};inline-size:${end};border-radius:calc(${size} / 2);background-color:var(--md-slider-stop-indicator-color,${stopColor});opacity:${withDefault(stopOpacity!)};z-index:1;pointer-events:none}`;
  const stopSize = `min(${size}, max(0px, ${inactive} - ${trailing}))`;
  const withStop = (id: string, end: string, html?: string) => {
    addBuilt(id, built.replace(/--[\w-]+: ?color-mix\(in srgb, ?var\(--md-slider-stop[^;]*;/u, '') + stop(end), html);
    variants
      .get(id)
      ?.box.before(Object.assign(document.createElement('span'), { className: 'stop' }));
  };
  withStop('stop-span', stopSize);
  // The input in flow, so it gives the slider a preferred inline size.
  const inFlow = '.input{position:static;display:block}';
  addBuilt('input-in-flow', built + inFlow);
  const indicator = '<mx-slider max="1000" indicator></mx-slider>';
  addBuilt('indicator', null, indicator);
  withStop('indicator,stop-span', stopSize, indicator);
  addBuilt('indicator,no-text-rule', built.split('\n').filter((r) => !r.includes('attr(data-value)')).join('\n'), indicator);
  addBuilt('indicator,literals', noTokenRules(literal(built)), indicator);
  addBuilt('indicator,no-transition', built + ':host(:state(indicator)) .handle::after{transition:none !important}', indicator);
  (window as any).round = (id: string, flush: boolean) => {
    const { run, box } = variants.get(id)!;
    let sink = 0;
    const start = performance.now();
    for (let n = 0; n < 400; n += 1) {
      run((n * 37) % 1000);
      if (flush) {
        sink += box.getBoundingClientRect().x;
      }
    }
    const us = ((performance.now() - start) * 1000) / 400 + sink * 0;
    box.getBoundingClientRect();
    return us;
  };
  (window as any).center = (id: string) => {
    const { el } = variants.get(id)!;
    el.scrollIntoView({ block: 'center' });
    const r = el.shadowRoot!.querySelector('input')!.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  (window as any).frames120 = (id: string) =>
    new Promise<void>((resolve) => {
      const variant = variants.get(id);
      (variant?.el ?? section).scrollIntoView({ block: 'center' });
      let n = 0;
      const step = () => {
        variant?.run((n * 37) % 1000);
        n += 1;
        if (n < 120) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  // A variant that draws nothing would be cheap, so each one's drawing is read.
  (window as any).drawn = () =>
    [...variants].map(([id, { run, box }]) => {
      run(250);
      const low = box.getBoundingClientRect().x;
      run(750);
      return [id, low, box.getBoundingClientRect().x, tokens.size];
    });
  return [...variants.keys()];
}, ONLY?.split(';'));
for (const [id, a, b, tokens] of await page.evaluate(() =>
  (window as any).drawn(),
)) {
  if (id !== 'native' && Math.abs(b - a - 148) > 1) {
    console.log(`  !! ${id}: the handle goes from ${a} to ${b} (${tokens})`);
  }
}
const SCALE = Number(ROUNDS);
for (const mode of MODES.split(',')) {
  if (mode === 'frames') {
    continue;
  }
  const results = new Map<string, number[]>(ids.map((id) => [id, []]));
  for (let n = 0; n < SCALE + 2; n += 1) {
    // The order rotates, so no variant always runs at the same place.
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[(i + n) % ids.length]!;
      if (mode === 'held') {
        const { x, y } = await page.evaluate(
          (id) => (window as any).center(id),
          id,
        );
        await page.mouse.move(x, y);
        await page.mouse.down();
      }
      const us = await page.evaluate(
        ([id, flush]) => (window as any).round(id, flush),
        [id, mode !== 'script'] as const,
      );
      if (mode === 'held') {
        await page.mouse.up();
      }
      if (n > 1) {
        results.get(id)!.push(us);
      }
    }
  }
  console.log(` ${mode}`);
  const base = results.get('proto');
  for (const [id, all] of results) {
    const at = (list: number[], part: number) =>
      [...list].sort((a, b) => a - b)[Math.floor((list.length - 1) * part)]!;
    const ratios = base?.map((b, i) => all[i]! / b);
    console.log(
      `  ${id.padEnd(44)} median ${at(all, 0.5).toFixed(1).padStart(7)} us, min ${at(all, 0).toFixed(1).padStart(7)}${ratios ? `, against proto ${at(ratios, 0.5).toFixed(2)} (${at(ratios, 0.25).toFixed(2)} to ${at(ratios, 0.75).toFixed(2)})` : ''}`,
    );
  }
}
if (MODES.includes('frames') && ENGINE === 'chromium') {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () =>
    Object.fromEntries(
      ((await cdp.send('Performance.getMetrics')) as any).metrics.map(
        (m: any) => [m.name, m.value],
      ),
    );
  const runs = new Map<string, number[][]>();
  for (let n = 0; n < 12; n += 1) {
    for (const id of ['idle', ...ids]) {
      const a = await metrics();
      await page.evaluate((id) => (window as any).frames120(id), id);
      const b = await metrics();
      const per = (k: string) => ((b[k] - a[k]) * 1e6) / 120;
      if (!runs.has(id)) {
        runs.set(id, []);
      }
      runs
        .get(id)!
        .push([
          per('TaskDuration'),
          per('RecalcStyleDuration'),
          per('LayoutDuration'),
        ]);
    }
  }
  console.log(' frames');
  for (const [id, list] of runs) {
    const [task, style, layout] = [0, 1, 2].map(
      (i) => list.map((r) => r[i]!).sort((a, b) => a - b)[list.length >> 1]!,
    );
    console.log(
      `  ${id.padEnd(44)} task ${task!.toFixed(0).padStart(5)} us, style ${style!.toFixed(0).padStart(4)}, layout ${layout!.toFixed(0).padStart(4)}`,
    );
  }
}
await browser.close();
