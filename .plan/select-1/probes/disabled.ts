// Probe for the select plan: a form-associated host with tabindex="0" that is
// its own control. Does its own `disabled`, or a disabled fieldset, take its
// focus, its click and its key events, with no code of the component's?
//
// node disabled.ts <chromium|firefox|webkit>
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.argv[2]!;
const launcher = { chromium, firefox, webkit }[ENGINE]!;

const HTML = `<!doctype html><meta charset="utf-8">
<style>x-c { display: block; inline-size: 100px; block-size: 40px; background: #ddd; }</style>
<button id="before">before</button>
<x-c id="plain"></x-c>
<x-c id="own" disabled></x-c>
<fieldset disabled><x-c id="fieldset"></x-c></fieldset>
<button id="after">after</button>
<script>
customElements.define('x-c', class extends HTMLElement {
  static formAssociated = true;
  constructor() { super(); this.i = this.attachInternals(); this.log = []; this.disabledArg = 'none'; }
  connectedCallback() {
    this.tabIndex = 0;
    for (const t of ['click', 'keydown', 'pointerdown']) this.addEventListener(t, () => this.log.push(t));
  }
  formDisabledCallback(d) { this.disabledArg = String(d); }
});
window.read = () => ['plain', 'own', 'fieldset'].map((id) => {
  const el = document.getElementById(id);
  document.activeElement?.blur?.();
  el.focus();
  const focused = document.activeElement === el;
  return id + ': :disabled=' + el.matches(':disabled') + ' focus()=' + focused + ' formDisabledCallback=' + el.disabledArg;
}).join('\\n  ');
window.logs = () => ['plain', 'own', 'fieldset'].map((id) => id + ' [' + document.getElementById(id).log.join(' ') + ']').join(', ');
</script>`;

const dir = await mkdtemp(join(tmpdir(), 'select-disabled-'));
const file = join(dir, 'index.html');
await writeFile(file, HTML);
const browser = await launcher.launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage();
await page.goto(pathToFileURL(file).href);
console.log(`  ${await page.evaluate(() => (window as any).read())}`);
await page.focus('#before');
const order: string[] = [];
for (let n = 0; n < 3; n++) {
  await page.keyboard.press('Tab');
  order.push(await page.evaluate(() => document.activeElement?.id ?? ''));
}
console.log(`  Tab from #before: ${order.join(' -> ')}`);
for (const id of ['plain', 'own', 'fieldset']) await page.click(`#${id}`);
await page.keyboard.press('Space');
console.log(
  `  after a click on each and Space: ${await page.evaluate(() => (window as any).logs())}`,
);
await browser.close();
await rm(dir, { recursive: true });
