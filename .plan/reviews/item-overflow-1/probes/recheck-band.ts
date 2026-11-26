// RF-139 recheck. Copied to packages/material-x/tests/list/zz-recheck-band.browser.test.ts
// for a run, one engine at a time, and removed after it. It reports by
// throwing, because this config hides console output. Reads, in the
// rows' own font, how far the two children of nearly half are from 41 and 49%.
import { it } from 'vitest';
import '../../src/button/button.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import { nextFrame } from '../browser.ts';

async function item(tag: string, html: string, width: number) {
  const frame = document.createElement('div');
  frame.style.cssText = `inline-size: ${width}px;`;
  frame.innerHTML = `<mx-list><${tag}>Label${html}</${tag}></mx-list>`;
  document.body.append(frame);
  await nextFrame();
  const element = frame.querySelector<HTMLElement>(tag)!;
  const box =
    element.shadowRoot!.querySelector<HTMLElement>('.host') ?? element;
  const style = getComputedStyle(box);
  const content =
    box.getBoundingClientRect().width -
    Number.parseFloat(style.paddingInlineStart) -
    Number.parseFloat(style.paddingInlineEnd);
  const child = element.querySelector('[slot="trail"]')!;
  const inner = child.shadowRoot?.querySelector('.host') ?? child;
  const width_ = inner.getBoundingClientRect().width;
  frame.remove();
  return { content, width: width_ };
}

it('reads the band', async () => {
  const out: string[] = [];
  for (const tag of [
    'mx-list-item',
    'mx-list-button-item',
    'mx-list-link-item',
  ])
    for (const [name, html] of [
      ['text', '<span slot="trail">Some text of nearly half</span>'],
      ['button', '<mx-button slot="trail">Send it to them</mx-button>'],
    ] as const) {
      const own = await item(tag, html, 1000);
      const at = await item(tag, html, 300);
      const share = own.width / at.content;
      out.push(
        `${tag} ${name}: own ${own.width.toFixed(2)}px of ${at.content.toFixed(2)}px = ${(share * 100).toFixed(2)}%; to 41% ${(own.width - 0.41 * at.content).toFixed(2)}px, to 49% ${(0.49 * at.content - own.width).toFixed(2)}px; at 300 ${at.width.toFixed(2)}px`,
      );
    }
  throw new Error(`BAND ${navigator.userAgent} || ${out.join(' || ')}`);
});
