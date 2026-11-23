// Probe for the slider plan: the drawn handle against the pointer, in both
// directions and at both ends; the pressed and focus states read through
// `:has()`; pressed while the pointer is outside; and what `:disabled` reads
// inside `formDisabledCallback`. Track ends are read from the two parts as
// elements, because a pseudo-element has no rect.
//
// node drawing.ts <chromium|firefox|webkit>
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.argv[2] as 'chromium' | 'firefox' | 'webkit';
const HTML = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;padding:20px} x-s{display:block;inline-size:204px;margin-block:20px}</style>
<x-s id="ltr"></x-s><x-s id="rtl" dir="rtl"></x-s><x-s id="css" style="direction:rtl"></x-s>
<fieldset id="fs"><x-s id="dis"></x-s></fieldset>
<script>
customElements.define('x-s', class extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['disabled'];
  constructor() {
    super();
    this.attachInternals();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = \`<style>
      .track{position:relative;block-size:44px;--_w:4px;--_c:calc(2px + var(--_f,0)*(100% - 4px))}
      .track:has(.input:active){--_w:2px}
      .track:has(.input:focus-visible){--_w:2px}
      .input{all:unset;appearance:none;position:absolute;inset:0;inline-size:100%;block-size:100%;touch-action:pan-y}
      .input::-webkit-slider-runnable-track{block-size:100%}
      .input::-webkit-slider-thumb{appearance:none;inline-size:4px;block-size:100%}
      .input::-moz-range-thumb{appearance:none;border:0;inline-size:4px;block-size:44px;background:transparent}
      .handle,.active,.inactive{position:absolute;pointer-events:none}
      .handle{inset-block:0;inline-size:var(--_w);inset-inline-start:calc(var(--_c) - var(--_w)/2)}
      .active{inset-block:14px;inset-inline:0 calc(100% - var(--_c) + var(--_w)/2 + 6px)}
      .inactive{inset-block:14px;inset-inline:calc(var(--_c) + var(--_w)/2 + 6px) 0}
    </style><div class="track"><input class="input" type="range"><i class="active"></i><i class="inactive"></i><b class="handle"></b></div>\`;
    this.input = root.querySelector('input');
    const draw = this.draw = () => root.querySelector('.track').style.setProperty('--_f', (this.input.valueAsNumber - this.input.min) / (this.input.max - this.input.min));
    this.input.min = 0; this.input.max = 100;
    this.input.addEventListener('input', draw);
    draw();
  }
  formDisabledCallback(value) { (window.seen ??= []).push(value + '/' + this.matches(':disabled')); this.input.disabled = this.matches(':disabled'); }
});
</script>`;
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent(HTML);
const rects = (id: string) =>
  page.evaluate((id) => {
    const el = document.getElementById(id) as any;
    const o = el.getBoundingClientRect().left;
    const r = (c: string) => {
      const b = el.shadowRoot.querySelector('.' + c).getBoundingClientRect();
      return `${c} ${+(b.left - o).toFixed(2)}..${+(b.right - o).toFixed(2)}`;
    };
    return `value ${el.input.value}: ${r('active')}, ${r('handle')}, ${r('inactive')}`;
  }, id);
for (const id of ['ltr', 'rtl', 'css']) {
  for (const v of [0, 1, 50, 100]) {
    await page.evaluate(
      ([id, v]) => {
        const el = document.getElementById(id as string) as any;
        el.input.value = v;
        el.draw();
      },
      [id, v],
    );
    console.log(`  ${id} set ${v}`.padEnd(26), await rects(id));
  }
  const b = (await page.locator(`#${id}`).boundingBox())!;
  await page.mouse.move(b.x + 62, b.y + 22);
  await page.mouse.down();
  console.log(`  ${id} pressed at 62`.padEnd(26), await rects(id));
  await page.mouse.move(b.x + 400, b.y + 200);
  await page.waitForTimeout(50);
  console.log(`  ${id} held outside`.padEnd(26), await rects(id));
  await page.mouse.up();
  console.log(`  ${id} released`.padEnd(26), await rects(id));
}
await page.keyboard.press('Tab');
await page.keyboard.press('Shift+Tab');
console.log('  css keyboard focus'.padEnd(26), await rects('css'));
await page.evaluate(() => {
  (document.getElementById('fs') as any).disabled = true;
});
await page.evaluate(() => {
  (document.getElementById('fs') as any).disabled = false;
});
await page.evaluate(() => {
  document.getElementById('dis')!.setAttribute('disabled', '');
});
console.log(
  '  formDisabled arg/:disabled',
  await page.evaluate(
    () =>
      `${(window as any).seen} input.disabled=${(document.getElementById('dis') as any).input.disabled}`,
  ),
);
await browser.close();
