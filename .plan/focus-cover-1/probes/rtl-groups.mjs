// Run from packages/material-x, with the package built:
//   node ../../.plan/reviews/focus-cover-1/probes/bundle.mjs <bundle>
//   node ../../.plan/focus-cover-1/probes/rtl-groups.mjs <engine> <bundle>
// RF-134's required property on the built groups, with `dir` on the group and on
// an ancestor: each member's corners in the visual order, what the arrow keys
// reach, and which side a standard group's press widens into.
import { open } from '../../reviews/focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const boxes = (tag) =>
  page.evaluate((t) => {
    const root =
      t === 'mx-split-button' ? document.querySelector(t).shadowRoot : document;
    return [
      ...root.querySelectorAll('mx-button,mx-switch-button,mx-icon-button'),
    ]
      .map((e, i) => {
        const h = e.shadowRoot.querySelector('.host');
        const b = h.getBoundingClientRect();
        const c = getComputedStyle(h);
        return {
          i,
          x: b.x,
          w: b.width,
          r: `left ${c.borderTopLeftRadius} right ${c.borderTopRightRadius}`,
        };
      })
      .sort((a, b) => a.x - b.x);
  }, tag);
const wrap = (where, html) => {
  if (where === 'ancestor') return `<div dir=rtl>${html('')}</div>`;
  return html(where === 'group' ? 'dir=rtl' : '');
};
for (const where of ['ltr', 'group', 'ancestor']) {
  for (const [name, html, tag] of [
    [
      'connected',
      (d) =>
        `<mx-connected-button-group ${d} color=tonal><mx-button>One</mx-button><mx-button>Two</mx-button><mx-button>Three</mx-button></mx-connected-button-group>`,
      'g',
    ],
    [
      'split',
      (d) => `<mx-split-button ${d} color=tonal>Save</mx-split-button>`,
      'mx-split-button',
    ],
  ]) {
    await load(wrap(where, html));
    console.log(
      `${where} | ${name}, from the left | ${(await boxes(tag)).map((b) => `#${b.i + 1} ${b.r}`).join(' | ')}`,
    );
  }
  for (const group of ['mx-connected-button-group', 'mx-button-group']) {
    await load(
      wrap(
        where,
        (d) =>
          `<${group} ${d} color=tonal><mx-switch-button value=a>One</mx-switch-button><mx-switch-button value=b>Two</mx-switch-button><mx-switch-button value=c>Three</mx-switch-button></${group}>`,
      ),
    );
    const reached = [];
    for (const key of ['ArrowRight', 'ArrowLeft']) {
      await page.evaluate(() => document.querySelector('#before').focus());
      await page.evaluate(() =>
        document.querySelectorAll('mx-switch-button')[1].focus(),
      );
      await page.keyboard.press(key);
      reached.push(
        await page.evaluate((k) => {
          const all = [...document.querySelectorAll('mx-switch-button')];
          const at = (e) =>
            e.shadowRoot.querySelector('.host').getBoundingClientRect().x;
          const now = document.activeElement;
          const side =
            at(now) > at(all[1])
              ? 'right'
              : at(now) < at(all[1])
                ? 'left'
                : 'stays';
          return `${k} goes ${side} (#${all.indexOf(now) + 1})`;
        }, key),
      );
    }
    console.log(`${where} | ${group} | ${reached.join(', ')}`);
  }
  await load(
    wrap(
      where,
      (d) =>
        `<mx-button-group ${d} color=tonal><mx-button>One</mx-button><mx-button>Two</mx-button><mx-button>Three</mx-button></mx-button-group>`,
    ),
  );
  const rest = await boxes('g');
  const first = rest.find((b) => b.i === 0);
  await page.mouse.move(
    first.x + first.w / 2,
    await page.evaluate(
      () =>
        document
          .querySelector('mx-button')
          .shadowRoot.querySelector('.host')
          .getBoundingClientRect().y + 10,
    ),
  );
  await page.mouse.down();
  await page.waitForTimeout(300);
  const held = await boxes('g');
  await page.mouse.up();
  console.log(
    `${where} | standard, the first member pressed, from the left | ${held.map((b, j) => `#${b.i + 1} width ${rest[j].w.toFixed(1)} to ${b.w.toFixed(1)}, left edge ${(b.x - rest[j].x).toFixed(1)}`).join(' | ')}`,
  );
}
await browser.close();
