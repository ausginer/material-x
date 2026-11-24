// Probe for the slider plan: what a native range with a 4px transparent thumb
// does inside a shadow tree, under real pointer and keyboard input, in each
// engine: the values a drag gives, the events, a value written in the `input`
// handler in the middle of a drag, the keys in both directions, label
// activation, focus-visible, and touch panning (Chromium only).
//
// node interaction.ts <chromium|firefox|webkit>
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.argv[2] as 'chromium' | 'firefox' | 'webkit';
const TYPES = { chromium, firefox, webkit };

const HTML = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;padding:20px} x-s{display:block;inline-size:204px;margin-block:20px} #spacer{block-size:2000px}</style>
<form>
<x-s id="plain"></x-s>
<x-s id="clamp"></x-s>
<x-s id="revert"></x-s>
<x-s id="async"></x-s>
<x-s id="echo"></x-s>
<x-s id="cancel"></x-s>
<x-s id="signed" min="-55" max="55" value="-18"></x-s>
<x-s id="frac" min="0" max="1" step="0.1" value="0"></x-s>
<x-s id="rtl" dir="rtl"></x-s>
<x-s id="cssrtl" style="direction:rtl"></x-s>
<fieldset disabled><x-s id="off"></x-s></fieldset>
<x-s id="lab"><span slot="label" id="labtext">Label</span></x-s>
</form><div id="spacer"></div>
<script>
customElements.define('x-s', class extends HTMLElement {
  static formAssociated = true;
  constructor() {
    super();
    const internals = this.attachInternals();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = \`<style>
      .track{position:relative;block-size:44px;background:#eee}
      input{all:unset;appearance:none;position:absolute;inset:0;box-sizing:border-box;inline-size:100%;block-size:100%;touch-action:pan-y}
      input::-webkit-slider-runnable-track{block-size:100%}
      input::-webkit-slider-thumb{appearance:none;inline-size:4px;block-size:100%}
      input::-moz-range-thumb{appearance:none;border:0;border-radius:0;background:transparent;inline-size:4px;block-size:44px}
    </style><label for="i"><slot name="label"></slot></label><div class="track"><input id="i" type="range"></div>\`;
    const input = this.input = root.querySelector('input');
    this.internals = internals;
    this.log = [];
    for (const type of ['input', 'change']) {
      input.addEventListener(type, (e) => this.log.push(type[0] + input.value));
    }
  }
  connectedCallback() {
    for (const a of ['min', 'max', 'step']) if (this.hasAttribute(a)) this.input.setAttribute(a, this.getAttribute(a));
    this.input.value = this.getAttribute('value') ?? '50';
  }
  formDisabledCallback(v) { this.input.disabled = v; this.formDisabled = v; }
});
const $ = (id) => document.getElementById(id);
$('clamp').input.addEventListener('input', () => { if ($('clamp').input.valueAsNumber > 60) $('clamp').input.value = '60'; });
$('revert').input.addEventListener('input', () => { $('revert').input.value = '50'; });
$('async').input.addEventListener('input', () => { const i = $('async').input; const v = i.value; i.value = '50'; requestAnimationFrame(() => { i.value = v; }); });
$('echo').input.addEventListener('input', () => { $('echo').input.value = $('echo').input.value; });
// Restores the value that a press changed when the browser takes the press for a scroll.
{
  const el = $('cancel');
  let start = '';
  el.input.addEventListener('pointerdown', () => { start = el.input.value; el.log.push('down' + start); });
  el.input.addEventListener('pointercancel', () => {
    el.log.push('cancel' + el.input.value);
    if (el.input.value !== start) { el.input.value = start; el.input.dispatchEvent(new Event('input', { bubbles: true, composed: true })); }
  });
}
window.events = [];
for (const type of ['input', 'change']) document.addEventListener(type, (e) => { if (e.target.id === 'plain') events.push(type + ':' + e.constructor.name + ':bubbles=' + e.bubbles + ',composed=' + e.composed + ',cancelable=' + e.cancelable); });
</script>`;

const browser = await TYPES[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
await page.setContent(HTML);
await page.waitForTimeout(100);

const box = async (id: string) =>
  page.evaluate((id) => {
    const r = (
      document.getElementById(id) as any
    ).input.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, id);
const read = (id: string) =>
  page.evaluate((id) => {
    const el = document.getElementById(id) as any;
    const log = el.log.join(' ');
    el.log.length = 0;
    return `${log || '-'} => ${el.input.value}`;
  }, id);
const line = (label: string, value: unknown) =>
  console.log(
    `  ${label.padEnd(40)} ${typeof value === 'string' ? value : JSON.stringify(value)}`,
  );

async function drag(id: string, from: number, ...to: number[]) {
  const b = await box(id);
  const y = b.y + b.h / 2;
  await page.mouse.move(b.x + from, y);
  await page.mouse.down();
  for (const x of to) {
    await page.mouse.move(b.x + x, y);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(40);
}

line('box', await box('plain'));
// Travel is 200px, so 1 unit is 2px and the thumb's centre for v is 2 + 2v.
await drag('plain', 2 + 2 * 20);
line('press at 20', await read('plain'));
line(
  'events at the document',
  await page.evaluate(() => [...new Set((window as any).events)]),
);
line(
  'focus after a press',
  await page.evaluate(() => {
    const el = document.getElementById('plain') as any;
    return {
      focused: document.activeElement === el,
      focusVisible: el.input.matches(':focus-visible'),
    };
  }),
);
await drag('plain', 2 + 2 * 20);
line('press on the thumb, no move', await read('plain'));
await drag('plain', 2 + 2 * 20 + 1, 2 + 2 * 21 + 1);
line('press on the thumb, move one unit', await read('plain'));
await drag('plain', 2 + 2 * 30, 2 + 2 * 80, 260, -15);
line('drag 30, 80, past the end, past the start', await read('plain'));
await drag(
  'clamp',
  2 + 2 * 50,
  2 + 2 * 55,
  2 + 2 * 70,
  2 + 2 * 80,
  2 + 2 * 40,
  2 + 2 * 90,
);
line('clamped to 60 in the handler', await read('clamp'));
await drag('revert', 2 + 2 * 20, 2 + 2 * 30, 2 + 2 * 80);
line('reverted to 50 in the handler', await read('revert'));
await drag('async', 2 + 2 * 20, 2 + 2 * 30, 2 + 2 * 80);
line('reverted, committed next frame', await read('async'));
await drag('echo', 2 + 2 * 20, 2 + 2 * 30, 2 + 2 * 80);
line('the same value written in the handler', await read('echo'));
await drag('signed', 2 + (200 * 55) / 110);
line('signed -55..55, press at the middle', await read('signed'));
await drag('rtl', 2 + 2 * 20);
line('dir=rtl, press at 20 from the left', await read('rtl'));
await drag('cssrtl', 2 + 2 * 20);
line('direction:rtl, press at 20 from the left', await read('cssrtl'));
await drag('off', 2 + 2 * 20);
line(
  'in a disabled fieldset',
  `${await read('off')} formDisabled=${await page.evaluate(() => (document.getElementById('off') as any).formDisabled)} matches=${await page.evaluate(() => document.getElementById('off')!.matches(':disabled'))}`,
);
for (const [id, keys] of [
  [
    'plain',
    [
      'ArrowRight',
      'ArrowLeft',
      'ArrowUp',
      'ArrowDown',
      'PageUp',
      'PageDown',
      'End',
      'Home',
    ],
  ],
  [
    'rtl',
    [
      'ArrowRight',
      'ArrowLeft',
      'ArrowUp',
      'ArrowDown',
      'PageUp',
      'PageDown',
      'End',
      'Home',
    ],
  ],
  ['cssrtl', ['ArrowRight', 'ArrowLeft']],
  ['signed', ['ArrowRight', 'PageUp', 'Home', 'PageUp']],
  [
    'frac',
    [
      'ArrowRight',
      'ArrowRight',
      'ArrowRight',
      'ArrowRight',
      'ArrowRight',
      'ArrowRight',
      'ArrowRight',
    ],
  ],
  ['revert', ['ArrowRight', 'ArrowRight']],
] as const) {
  await page.evaluate((id) => {
    const el = document.getElementById(id) as any;
    if (id === 'plain' || id.endsWith('rtl')) el.input.value = '50';
    el.focus();
  }, id);
  for (const key of keys) {
    await page.keyboard.press(key);
    line(`${id} ${key}`, await read(id));
  }
}
await page.keyboard.press('Tab');
line(
  'focus-visible from the keyboard',
  await page.evaluate(() => {
    const el = document.activeElement as any;
    return `${el.id} ${el.input?.matches(':focus-visible')}`;
  }),
);
await page.locator('#labtext').click();
line(
  'a click on the slotted label focuses',
  await page.evaluate(() => document.activeElement!.id),
);
line(
  'value set before max',
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.type = 'range';
    i.value = '200';
    i.max = '300';
    const dirty = i.value;
    const j = document.createElement('input');
    j.type = 'range';
    j.setAttribute('value', '200');
    j.max = '300';
    const k = document.createElement('input');
    k.type = 'range';
    k.min = '-55';
    k.max = '55';
    const n = document.createElement('input');
    n.type = 'range';
    n.value = '12.7';
    return `property then max: ${dirty}; attribute then max: ${j.value}; -55..55 default: ${k.value}; step 1, 12.7: ${n.value}`;
  }),
);

if (ENGINE === 'chromium') {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 400, height: 500 },
  });
  const touch = await context.newPage();
  await touch.setContent(HTML);
  const cdp = await context.newCDPSession(touch);
  const gesture = async (id: string, dx: number, dy: number) => {
    const b = await touch.evaluate((id) => {
      const r = (
        document.getElementById(id) as any
      ).input.getBoundingClientRect();
      return { x: r.x, y: r.y };
    }, id);
    const x = b.x + 44;
    const y = b.y + 22;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 10; i += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10 }],
      });
      await touch.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await touch.waitForTimeout(300);
    return touch.evaluate((id) => {
      const el = document.getElementById(id) as any;
      const r = `${el.log.join(' ') || '-'} => ${el.input.value}, scrollY ${Math.round(scrollY)}`;
      el.log.length = 0;
      el.input.value = '50';
      scrollTo(0, 0);
      return r;
    }, id);
  };
  line('touch: horizontal 60px from 21', await gesture('plain', 60, 0));
  line('touch: vertical 100px from 21', await gesture('plain', 0, -100));
  line(
    'touch: vertical, restored on pointercancel',
    await gesture('cancel', 0, -100),
  );
  line('touch: horizontal, the same element', await gesture('cancel', 60, 0));
}
await browser.close();
