// Probe for RF-68's re-ruling: does `:host:has(.x:popover-open)` match, in each engine? A
// static `:host:has(.y)`, a fresh popover and a `.w:has()` inside the tree are
// the controls.
//
// node host-has-popover.ts
import { firefox, chromium, webkit } from 'playwright';
for (const type of [firefox, chromium, webkit]) {
  const b = await type.launch();
  const p = await b.newPage();
  await p.setContent(`<div id="h"></div>`);
  const r = await p.evaluate(async () => {
    const h = document.getElementById('h')!;
    const root = h.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:block;height:50px} :host:has(.x:popover-open){display:contents} :host:has(.y){outline:3px solid red}</style><div class="x">x</div><span class="y"></span>`;
    const x = root.querySelector<HTMLElement>('.x')!;
    const out: Record<string, unknown> = {
      staticHas: getComputedStyle(h).outlineWidth,
    };
    x.popover = 'manual';
    x.showPopover();
    out.sync = getComputedStyle(h).display;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    out.frames = getComputedStyle(h).display;
    out.matchesDirect = root.querySelector('.x:popover-open')
      ? 'x is :popover-open'
      : 'no';
    const fresh = document.createElement('div');
    document.body.append(fresh);
    const r2 = fresh.attachShadow({ mode: 'open' });
    r2.innerHTML = `<style>:host{display:block} :host:has(.x:popover-open){display:contents}</style><div class="x" popover="manual">x</div>`;
    r2.querySelector<HTMLElement>('.x')!.showPopover();
    out.freshSync = getComputedStyle(fresh).display;
    const host3 = document.createElement('div');
    document.body.append(host3);
    const r3 = host3.attachShadow({ mode: 'open' });
    r3.innerHTML = `<style>:host{display:block} .w:has(.x:popover-open){display:contents}</style><div class="w"><div class="x" popover="manual">x</div></div>`;
    r3.querySelector<HTMLElement>('.x')!.showPopover();
    out.innerHasSync = getComputedStyle(r3.querySelector('.w')!).display;
    return out;
  });
  console.log(b.browserType().name(), b.version(), JSON.stringify(r));
  await b.close();
}
