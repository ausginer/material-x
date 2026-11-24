// Value arithmetic, ownership and forms, against a native range.
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await open(
  '<style>mx-slider{inline-size:204px}</style><body></body>',
);
console.log(
  'fuzz',
  JSON.stringify(
    await page.evaluate(() => {
      const w = window as any;
      let seed = 7;
      const rnd = () =>
        (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
      const pick = (a: any[]) => a[Math.floor(rnd() * a.length)];
      const vals: any = {
        value: [-200, -18, 0, 0.35, 12.7, 50, 99.95, 210.5, 1e6, null],
        min: [-55, -1, 0, 0.05, 100, null],
        max: [-60, 1, 10, 55, 100, 300, null],
        step: [0.1, 0.3, 1, 7, 50, null, 0, -2],
      };
      let bad: any[] = [],
        n = 0;
      for (let i = 0; i < 1500; i++) {
        const s: any = document.createElement('mx-slider');
        document.body.append(s);
        const state: any = {
          value: undefined,
          attr: null,
          min: null,
          max: null,
          step: null,
        };
        const ops: any[] = [];
        for (let k = 0; k < 8; k++) {
          const name = pick([
            'value',
            'value',
            'min',
            'max',
            'step',
            'reset',
            'valueAttr',
          ]);
          if (name === 'valueAttr') {
            const v = pick(vals.value);
            ops.push(['@value', v]);
            v === null
              ? s.removeAttribute('value')
              : s.setAttribute('value', v);
            state.attr = v;
          } else if (name !== 'reset') {
            const v = pick(vals[name]);
            ops.push([name, v]);
            if (name !== 'value' && rnd() < 0.5) {
              v === null ? s.removeAttribute(name) : s.setAttribute(name, v);
            } else s[name] = v;
            state[name] = v;
          }
          const nat = document.createElement('input');
          nat.type = 'range';
          for (const a of ['min', 'max', 'step'])
            if (state[a] !== null) nat.setAttribute(a, state[a]);
          const want = state.value === undefined ? state.attr : state.value;
          nat.value = want === null ? '' : String(want);
          const lo = state.min ?? 0,
            hi = state.max ?? 100;
          const f = hi > lo ? (nat.valueAsNumber - lo) / (hi - lo) : 0;
          n++;
          if (
            s.value !== nat.valueAsNumber ||
            Math.abs(w.frac(s) - f) > 0.002
          ) {
            bad.push({
              ops: [...ops],
              got: s.value,
              want: nat.valueAsNumber,
              drawn: w.frac(s),
              f,
            });
            break;
          }
        }
        s.remove();
      }
      return { n, bad: bad.length, first: bad.slice(0, 2) };
    }),
  ),
);
console.log(
  'bounds text',
  JSON.stringify(
    await page.evaluate(() =>
      ['0x10', '+5', ' 5 ', '5.', 'Infinity', '1e2x', '.5', '-5', ''].map(
        (min) => {
          const s: any = document.createElement('mx-slider');
          s.setAttribute('min', min);
          s.setAttribute('value', '60');
          document.body.append(s);
          const n = document.createElement('input');
          n.type = 'range';
          n.setAttribute('min', min);
          n.value = '60';
          const r = [
            min,
            'min',
            s.min,
            'value',
            s.value,
            'nativeValue',
            n.valueAsNumber,
            'drawn',
            (window as any).frac(s),
            'natFrac',
            (() => {
              const m = n.cloneNode() as any;
              m.value = '-1e9';
              const lo = m.valueAsNumber;
              return +((60 - lo) / (100 - lo)).toFixed(4);
            })(),
          ];
          s.remove();
          return r.join(' ');
        },
      ),
    ),
    null,
    1,
  ),
);
console.log(
  'odd writes',
  JSON.stringify(
    await page.evaluate(() =>
      [NaN, Infinity, undefined, '42', '', 'x', true].map((v: any) => {
        const s: any = document.createElement('mx-slider');
        s.setAttribute('value', '30');
        document.body.append(s);
        let e = '';
        try {
          s.value = v;
        } catch (x: any) {
          e = x.message;
        }
        const r = `${String(v)} -> ${s.value} ${e}`;
        s.remove();
        return r;
      }),
    ),
  ),
);
console.log(
  'disabled',
  JSON.stringify(
    await page.evaluate(() => {
      const out: any = {};
      const w = window as any;
      const mk = () => document.createElement('mx-slider') as any;
      let s = mk();
      s.setAttribute('disabled', '');
      out.attrBeforeConnect = w.inp(s).disabled;
      document.body.append(s);
      out.attrThenConnect = w.inp(s).disabled;
      s.remove();
      s = mk();
      s.disabled = true;
      document.body.append(s);
      out.prop = w.inp(s).disabled;
      const c = s.cloneNode();
      document.body.append(c);
      out.clone = w.inp(c).disabled;
      s.remove();
      c.remove();
      const f = document.createElement('fieldset');
      f.disabled = true;
      document.body.append(f);
      s = mk();
      f.append(s);
      out.inFs = w.inp(s).disabled;
      document.body.append(s);
      out.movedOut = w.inp(s).disabled;
      f.append(s);
      out.back = w.inp(s).disabled;
      s.remove();
      out.removed = w.inp(s).disabled;
      document.body.append(s);
      out.reattached = w.inp(s).disabled;
      s.remove();
      f.innerHTML =
        '<legend><mx-slider></mx-slider></legend><mx-slider></mx-slider>';
      out.legend = [...f.querySelectorAll('mx-slider')].map(
        (x) => w.inp(x).disabled,
      );
      f.innerHTML = '<fieldset><mx-slider></mx-slider></fieldset>';
      out.nested = w.inp(f.querySelector('mx-slider')).disabled;
      f.disabled = false;
      out.nestedOff = w.inp(f.querySelector('mx-slider')).disabled;
      f.remove();
      return out;
    }),
  ),
);
console.log(
  'form',
  JSON.stringify(
    await page.evaluate(() => {
      const out: any = {};
      const form = document.createElement('form');
      document.body.append(form);
      form.innerHTML =
        '<mx-slider name="n" value="30" min="-10" max="10" step="0.5"></mx-slider>';
      const s: any = form.firstChild;
      out.init = new FormData(form).get('n');
      s.value = -3.3;
      out.set = new FormData(form).get('n');
      s.name = 'k';
      out.rename = [...new FormData(form)].join();
      s.max = 40;
      form.reset();
      out.reset = [s.value, new FormData(form).get('k')];
      s.remove();
      const out2 = new FormData(form).has('k');
      out.removed = out2;
      s.setAttribute('form', 'zz');
      form.id = 'zz';
      document.body.append(s);
      out.formAttr = new FormData(form).get('k');
      s.setCustomValidity('bad');
      out.validity = [
        s.matches(':invalid'),
        form.checkValidity(),
        s.validationMessage,
      ];
      s.disabled = true;
      out.disabledValidity = [s.willValidate, form.checkValidity()];
      s.disabled = false;
      let inv = 0;
      s.addEventListener('invalid', () => inv++);
      s.reportValidity();
      out.invalidEvents = inv;
      s.remove();
      form.remove();
      return out;
    }),
  ),
);
// upgrade with properties set before definition is core's; attributes only here.
// Keyboard in a form: implicit submission.
await page.evaluate(() => {
  document.body.innerHTML =
    '<form id=f><mx-slider id=s name=n></mx-slider><mx-text-field id=t></mx-text-field><input id=r type=range><button>go</button></form>';
  (window as any).sub = 0;
  document.forms[0]!.addEventListener('submit', (e) => {
    e.preventDefault();
    (window as any).sub++;
  });
});
for (const id of ['s', 't', 'r']) {
  await page.evaluate((i) => {
    (window as any).sub = 0;
    document.getElementById(i)!.focus();
  }, id);
  await page.keyboard.press('Enter');
  console.log(
    'Enter submits from',
    id,
    await page.evaluate(() => (window as any).sub),
  );
}
await browser.close();
