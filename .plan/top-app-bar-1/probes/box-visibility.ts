// What the row for reviewer-10 reads, with edits of the box that keep it from
// being drawn, from being hit, or neither.
//   node .plan/top-app-bar-1/probes/box-visibility.ts <packages> <chromium|firefox|webkit>
import {
  browser,
  ENGINE,
  open,
} from '../../reviews/top-app-bar-1/probes/recheck-2/lib.ts';

console.log(`# ${ENGINE} ${browser.version()}`);
for (const css of [
  '',
  'visibility: visible',
  'visibility: visible; opacity: 0',
  'visibility: visible; pointer-events: none',
  'visibility: visible; pointer-events: none; opacity: 0',
  'visibility: visible; background: none',
]) {
  const page = await open(
    '<!doctype html><style>body{margin:0}</style><mx-top-app-bar id=bar>T</mx-top-app-bar><button style="position:fixed;inset:0 auto auto 0;z-index:2;inline-size:20px;block-size:20px"></button><div style="height:3000px"></div>',
  );
  console.log(
    `${css || 'as built'} | ${await page.evaluate((edit) => {
      const { shadowRoot } = document.getElementById('bar')!;
      const box = shadowRoot!.querySelector<HTMLElement>('.scroll-start')!;
      box.style.cssText = edit;
      const hit = document.elementFromPoint(0.5, 0.5)!;
      return `hit ${hit.localName}, checkVisibility ${box.checkVisibility({ visibilityProperty: true, opacityProperty: true })}`;
    }, css)}`,
  );
  await page.context().close();
}
await browser.close();
