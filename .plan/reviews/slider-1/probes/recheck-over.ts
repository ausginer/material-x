// Scrollable overflow and place of the shown value indicator. Each case compares the page and every ancestor with `indicator` set and unset, with keyboard focus.
// Prints only what differs or leaves the track, and the count of the cases.
// node recheck-over.ts <packages> <engine>
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const TEXTS: Record<string, string> = {
  number: '',
  million: 'max=1000000',
  long: 'valuetext="A long value text that is longer than most sliders are wide"',
  word: 'valuetext="Averylongvaluetextwithoutasinglebreakinit"',
  arabic: 'valuetext="قيمة طويلة جدا للمنزلق هنا"',
  cjk: 'valuetext="値値値値値値値値値値値値値値値値"',
  nbsp: 'valuetext="1 000 000 000 000 km"',
  emoji: 'valuetext="👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦"',
};
const BOXES: Record<string, (s: string) => string> = {
  'page, full width': (s) =>
    `<style>body{margin:0}</style><div style="height:120px"></div>${s}`,
  'page, 16 px gutter': (s) =>
    `<style>body{margin:16px}</style><div style="height:120px"></div>${s}`,
  'overflow auto': (s) =>
    `<div style="overflow:auto;inline-size:204px;padding-block-start:120px">${s}</div>`,
  'overflow-y scroll, 300 high': (s) =>
    `<div style="overflow-y:auto;inline-size:220px;block-size:300px"><div style="block-size:150px"></div>${s}<div style="block-size:600px"></div></div>`,
  'overflow-y, the slider last': (s) =>
    `<div style="overflow-y:auto;inline-size:220px;block-size:300px"><div style="block-size:600px"></div>${s}</div>`,
  'overflow-y, the slider first, no padding': (s) =>
    `<div style="overflow-y:auto;inline-size:220px;block-size:300px">${s}<div style="block-size:600px"></div></div>`,
  'column-reverse, the slider on top': (s) =>
    `<div style="overflow-y:auto;inline-size:220px;block-size:300px;display:flex;flex-direction:column-reverse"><div style="block-size:400px;flex:none"></div>${s}</div>`,
  'row, flex 1': (s) =>
    `<div style="overflow:auto;inline-size:204px;padding-block-start:120px;display:flex"><b>L</b><div style="flex:1;min-inline-size:0">${s}</div></div>`,
  'nowrap and indent': (s) =>
    `<div style="overflow:auto;inline-size:204px;padding-block-start:120px;white-space:nowrap;text-indent:30px;word-spacing:9px;text-transform:uppercase;text-align:end;letter-spacing:4px">${s}</div>`,
  pre: (s) =>
    `<div style="overflow:auto;inline-size:204px;padding-block-start:120px;white-space:pre;word-break:keep-all;line-break:strict;hyphens:manual;overflow-wrap:normal;text-wrap:nowrap">${s}</div>`,
  '24 px': (s) =>
    `<div style="overflow:auto;inline-size:24px;padding-block-start:600px">${s}</div>`,
  '40 px': (s) =>
    `<div style="overflow:auto;inline-size:40px;padding-block-start:600px">${s}</div>`,
  '80 px': (s) =>
    `<div style="overflow:auto;inline-size:80px;padding-block-start:400px">${s}</div>`,
  '20 px (the limit)': (s) =>
    `<div style="overflow:auto;inline-size:20px;padding-block-start:900px">${s}</div>`,
  'zoom 1.37': (s) =>
    `<div style="overflow:auto;inline-size:204px;padding-block-start:120px;zoom:1.37">${s}</div>`,
  'fractional width': (s) =>
    `<div style="overflow:auto;inline-size:187.37px;padding-block-start:120px">${s}</div>`,
  'transformed sheet': (s) =>
    `<div style="overflow:auto;inline-size:204px;padding-block-start:120px;transform:translateX(37.3px)">${s}</div>`,
};
let n = 0,
  bad = 0;
const page = await open('', { viewport: { width: 320, height: 600 } });
for (const [bn, box] of Object.entries(BOXES))
  for (const outer of ['ltr', 'rtl'])
    for (const inner of ['ltr', 'rtl'])
      for (const [tn, t] of Object.entries(TEXTS))
        for (const f of [0, 0.03, 0.5, 0.97, 1]) {
          const r = await page.evaluate(
            async ([html, outer, f]) => {
              const w = window as any;
              document.documentElement.dir = outer as string;
              document.body.innerHTML = html as string;
              const s = document.querySelector('mx-slider') as any;
              s.value = (f as number) * (s.max ?? 100);
              const read = () => {
                const o: any[] = [
                  document.documentElement.scrollWidth -
                    document.documentElement.clientWidth,
                  document.documentElement.scrollHeight,
                ];
                for (
                  let e = s.parentElement;
                  e && e !== document.body;
                  e = e.parentElement
                )
                  o.push(e.scrollWidth - e.clientWidth, e.scrollHeight);
                return o.join();
              };
              const hidden = read();
              s.indicator = true;
              s.shadowRoot
                .querySelector('.input')
                .focus({ focusVisible: true, preventScroll: true });
              const ind = w.q(s, '.indicator');
              const shown = getComputedStyle(ind).display;
              const now = read();
              const tr = w.q(s, '.track').getBoundingClientRect(),
                x = w.q(s, '.text').getBoundingClientRect(),
                h = w.q(s, '.handle').getBoundingClientRect();
              const T = w.q(s, '.text');
              const inner = T.scrollWidth - T.clientWidth;
              const off = x.left + x.width / 2 - (h.left + h.width / 2);
              const c = h.left + h.width / 2;
              const fits =
                c - x.width / 2 >= tr.left - 0.01 &&
                c + x.width / 2 <= tr.right + 0.01;
              return {
                hidden,
                now,
                shown,
                out: [
                  +(tr.left - x.left).toFixed(2),
                  +(x.right - tr.right).toFixed(2),
                ],
                off: +off.toFixed(2),
                fits,
                inner,
                gap: +(h.top - x.bottom).toFixed(2),
              };
            },
            [
              box(`<mx-slider id=s dir=${inner} ${t}></mx-slider>`),
              outer,
              f,
            ] as const,
          );
          n++;
          const why = [
            r.shown !== 'flex' && 'not shown',
            r.hidden !== r.now && `overflow ${r.hidden} -> ${r.now}`,
            (r.out[0]! > 0.1 || r.out[1]! > 0.1) &&
              `out of the track by ${r.out}`,
            r.fits && Math.abs(r.off) > 0.1 && `off centre by ${r.off}`,
            r.inner > 0 && `text overflows its box by ${r.inner}`,
          ].filter(Boolean);
          if (why.length) {
            bad++;
            console.log(
              `${bn} | outer ${outer}, slider ${inner} | ${tn} | ${f} | ${why.join('; ')}`,
            );
          }
        }
console.log(`${n} cases, ${bad} differ`);
await browser.close();
