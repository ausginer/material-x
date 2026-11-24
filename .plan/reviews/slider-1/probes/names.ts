// Names that the committed probe does not read.
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const CASES: [string, string, string?][] = [
  [
    'aria-label="" + label for',
    '<label for=s>L</label><mx-slider id=s aria-label=""></mx-slider>',
  ],
  [
    'native: aria-label="" + label for',
    '<label for=s>L</label><input type=range id=s aria-label="">',
  ],
  [
    'aria-label=" " + label for',
    '<label for=s>L</label><mx-slider id=s aria-label=" "></mx-slider>',
  ],
  [
    'labelledby missing id + label for',
    '<label for=s>L</label><mx-slider id=s aria-labelledby=nope></mx-slider>',
  ],
  [
    'labelledby missing id + slot',
    '<mx-slider id=s aria-labelledby=nope><span slot=label>S</span></mx-slider>',
  ],
  [
    'labelledby two ids',
    '<b id=x>X</b><b id=y>Y</b><mx-slider id=s aria-labelledby="y x"></mx-slider>',
  ],
  [
    'labelledby hidden element',
    '<b id=x hidden>X</b><mx-slider id=s aria-labelledby="x"></mx-slider>',
  ],
  [
    'two labels',
    '<label for=s>L1</label><label for=s>L2</label><mx-slider id=s></mx-slider>',
  ],
  [
    'wrapping label with more text',
    '<label>Before <mx-slider id=s></mx-slider> after</label>',
  ],
  [
    'empty slotted + label for',
    '<label for=s>L</label><mx-slider id=s><span slot=label></span></mx-slider>',
  ],
  [
    'element reference property',
    '<b id=x>X</b><mx-slider id=s></mx-slider>',
    's.ariaLabelledByElements=[x]',
  ],
  ['ariaLabel property', '<mx-slider id=s></mx-slider>', 's.ariaLabel="A"'],
  [
    'slot text changed later',
    '<mx-slider id=s><span slot=label id=x>S</span></mx-slider>',
    'x.textContent="T"',
  ],
  [
    'label text changed later',
    '<label for=s id=x>S</label><mx-slider id=s></mx-slider>',
    'x.textContent="T"',
  ],
  [
    'aria-label removed while out of the document',
    '<mx-slider id=s aria-label=A></mx-slider>',
    'const p=s.parentNode,e=s;e.remove();e.removeAttribute("aria-label");p.append(e)',
  ],
  [
    'text field: the same',
    '<mx-text-field id=s aria-label=A></mx-text-field>',
    'const p=s.parentNode,e=s;e.remove();e.removeAttribute("aria-label");p.append(e)',
  ],
  [
    'aria-labelledby removed while out',
    '<b id=x>X</b><mx-slider id=s aria-labelledby=x></mx-slider>',
    'const p=s.parentNode,e=s;e.remove();e.removeAttribute("aria-labelledby");p.append(e)',
  ],
  [
    'moved to another document place with the same reference',
    '<b id=x>X</b><mx-slider id=s aria-labelledby=x></mx-slider><p id=q></p>',
    'document.querySelector("p").append(document.querySelector("mx-slider"))',
  ],
  [
    'referenced element inserted later, then focus',
    '<mx-slider id=s aria-labelledby=x></mx-slider>',
    'const e=document.createElement("b");e.id="x";e.textContent="X";document.body.append(e);s.focus()',
  ],
  [
    'aria-description',
    '<mx-slider id=s aria-label=A aria-description=DD></mx-slider>',
  ],
  [
    'aria-invalid then error removed',
    '<mx-slider id=s aria-label=A aria-invalid=true></mx-slider>',
    's.error=true;s.error=false',
  ],
];
for (const [name, html, act] of CASES) {
  const page = await open(html);
  if (act) await page.evaluate(`{${act}}`);
  await page.waitForTimeout(60);
  const snap = await page.locator('body').ariaSnapshot();
  console.log(name, '|', snap.replace(/\n\s*/g, ' / '));
  if (/invalid|description/.test(name))
    console.log(
      '   ',
      await page.evaluate(() => {
        const i = (window as any).inp(document.getElementById('s'));
        return i.outerHTML;
      }),
    );
  if (/removed while/.test(name))
    console.log(
      '   ',
      await page.evaluate(() => {
        const s: any = document.getElementById('s');
        const i = s.shadowRoot.querySelector('.input');
        return [
          i.getAttribute('aria-label'),
          String(i.ariaLabelledByElements),
        ].join();
      }),
    );
  await page.context().close();
}
// In another shadow root, with references inside it.
{
  const page = await open('<div id=h></div>');
  await page.evaluate(() => {
    const r = document.getElementById('h')!.attachShadow({ mode: 'open' });
    r.innerHTML =
      '<b id=x>X</b><mx-slider id=s aria-labelledby=x></mx-slider><label for=t>L</label><mx-slider id=t></mx-slider>';
  });
  await page.waitForTimeout(50);
  console.log(
    'in a shadow root',
    JSON.stringify(
      await page.evaluate(() =>
        [
          ...document
            .getElementById('h')!
            .shadowRoot!.querySelectorAll('mx-slider'),
        ].map((s: any) =>
          s.shadowRoot
            .querySelector('.input')
            .ariaLabelledByElements?.map((e: any) => e.textContent),
        ),
      ),
    ),
  );
  await page.context().close();
}
// Hidden while held.
{
  const page = await open(
    '<style>body{margin:80px}</style><mx-slider id=s indicator></mx-slider>',
  );
  const b = (await page.locator('#s').boundingBox())!;
  await page.mouse.move(b.x + 100, b.y + 22);
  await page.mouse.down();
  await page.evaluate(() => {
    document.getElementById('s')!.style.display = 'none';
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.getElementById('s')!.style.display = '';
  });
  await page.waitForTimeout(500);
  console.log(
    'hidden while held, shown again: indicator',
    await page.evaluate(
      () =>
        getComputedStyle(
          (window as any).q(document.getElementById('s'), '.handle'),
          '::after',
        ).display,
    ),
  );
  await page.context().close();
}
await browser.close();
