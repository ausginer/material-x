// The built mx-slider, and two variants of its handlers, for held-press.ts and
// held-press-firefox.ts. Build the packages first.
import { join } from 'node:path';
import { rolldown } from 'rolldown';

const PACKAGES = process.argv[2]!;
const build = await rolldown({
  input: join(PACKAGES, 'material-x/slider/slider.js'),
  platform: 'browser',
});
const { output } = await build.generate({
  format: 'iife',
  name: 'slider',
  exports: 'named',
});
export const built = output.map((c) => ('code' in c ? c.code : '')).join('\n');

// The handlers on the input, replaced in the built code. The private fields
// keep their names in the bundle, because the package isn't mangled.
const start = built.indexOf('let pressedValue');
const end = built.indexOf('}, input);', start);
if (start < 0 || end < 0) throw new Error('the built handlers were not found');
const swap = (body: string) =>
  built.slice(0, start) + body + built.slice(end + '}, input);'.length);
export const restoreOwner = swap(`
  let before, pressed;
  useEvents(this, {
    input: () => { this.#requested = input.valueAsNumber; this.#sync(); },
    change: () => { this.dispatchEvent(new Event('change', { bubbles: true })); },
    pointerdown: () => { before = this.#requested; pressed = input.value; },
    pointercancel: () => {
      this.#requested = before; this.#write();
    },
  }, input);`);
const HOLD = `
  // idle | pressed (no move yet) | held (its input is kept back) | cancelled
  let state = 'idle';
  let start = '';
  let slid = false;
  const release = () => {
    if (state !== 'held') return;
    state = 'idle';
    if (input.value !== this.shown$) input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  };
  const commit = () => { slid = false; this.dispatchEvent(new Event('change', { bubbles: true })); };
  useConnected(this, () => { if (state === 'held') { this.#write(); state = 'idle'; } });
  useEvents(this, {
    input: (event) => {
      if (state === 'pressed') { state = 'held'; event.stopImmediatePropagation(); return; }
      // Firefox puts its own value back.
      if (state === 'cancelled' && input.value === start) { event.stopImmediatePropagation(); this.#write(); return; }
      state = 'idle';
      slid = true;
      this.#requested = input.valueAsNumber; this.#sync();
    },
    change: () => {
      if (state === 'cancelled') return;
      release();
      commit();
    },
    pointerdown: (e) => {
      if (!e.isPrimary) return;
      state = e.pointerType === 'touch' ? 'pressed' : 'idle'; start = input.value; slid = false;
    },
    pointermove: () => { if (state === 'pressed') state = 'idle'; },
    pointerup: () => { release(); if (state !== 'cancelled') state = 'idle'; },
    pointercancel: (e) => {
      if (!e.isPrimary) return;
      if (state === 'held') this.#write();
      state = 'cancelled';
      if (slid) commit();
    },
  }, input);`;
export const hold = swap(HOLD)
  .replace(/#sync\(\) \{/u, '#sync() { this.shown$ = this.#input.value;')
  .replace(
    /get value\(\) \{\s*return this\.#input\.valueAsNumber/u,
    'get value() { return Number(this.shown$)',
  );
// The places of the built code that the variant replaces, beside the handlers.
if (!hold.includes('Number(this.shown$)') || !hold.includes('{ this.shown$ ='))
  throw new Error('not replaced');
