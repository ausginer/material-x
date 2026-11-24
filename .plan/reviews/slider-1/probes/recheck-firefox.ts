// Touch, a second finger, a pen and a mouse in Firefox by its own synthesized events through Marionette, on the built slider and a bare range.
// node recheck-firefox.ts <packages> firefox
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { firefox } from 'playwright';
import { code, browser } from './lib.ts';
await browser.close();

const dir = await mkdtemp(join(tmpdir(), 'recheck-ff-'));
await writeFile(
  join(dir, 'user.js'),
  'user_pref("marionette.port", 2833);\nuser_pref("dom.w3c_touch_events.enabled", 1);\n',
);
const proc = spawn(
  firefox.executablePath(),
  [
    '--marionette',
    '--remote-allow-system-access',
    '-headless',
    '-no-remote',
    '-profile',
    dir,
  ],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
  },
);
await new Promise<void>((resolve) => {
  const on = (d: Buffer) => {
    if (d.toString().includes('Listening on port')) resolve();
  };
  proc.stdout.on('data', on);
  proc.stderr.on('data', on);
});
const sock = createConnection(2833, '127.0.0.1');
let buf = Buffer.alloc(0);
const pending = new Map<number, (v: [unknown, any]) => void>();
sock.on('data', (d: Buffer) => {
  buf = Buffer.concat([buf, d]);
  for (;;) {
    const colon = buf.indexOf(':');
    if (colon < 0) return;
    const len = Number(buf.subarray(0, colon).toString());
    if (buf.length < colon + 1 + len) return;
    const msg = JSON.parse(buf.subarray(colon + 1, colon + 1 + len).toString());
    buf = buf.subarray(colon + 1 + len);
    if (Array.isArray(msg)) pending.get(msg[1])?.([msg[2], msg[3]]);
  }
});
let seq = 0;
const send = (name: string, params: object = {}) =>
  new Promise<any>((resolve, reject) => {
    const id = ++seq;
    pending.set(id, ([err, res]) =>
      err
        ? reject(new Error(JSON.stringify(err).slice(0, 400)))
        : resolve(
            res && typeof res === 'object' && 'value' in res ? res.value : res,
          ),
    );
    const s = JSON.stringify([0, id, name, params]);
    sock.write(`${Buffer.byteLength(s)}:${s}`);
  });
try {
  await new Promise((r) => setTimeout(r, 300));
  const session = await send('WebDriver:NewSession', { capabilities: {} });
  console.log(`# firefox ${session.capabilities?.browserVersion}`);
  const content = (script: string) =>
    send('WebDriver:ExecuteScript', { script, args: [] });

  type P = { id: number; x: number; y: number };
  const sys = (script: string) =>
    send('WebDriver:ExecuteScript', {
      sandbox: 'system',
      newSandbox: true,
      script,
      args: [],
    });
  const raw = async (type: string, pts: P[]) => {
    await sys(
      `window.synthesizeTouchEvent(${JSON.stringify(type)}, ${JSON.stringify(pts.map((p) => ({ identifier: p.id, offsetX: p.x, offsetY: p.y, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1, tiltX: 0, tiltY: 0, twist: 0 })))}, 0, {});`,
    );
    await new Promise((r) => setTimeout(r, 40));
  };
  const ONLY = process.argv[4];
  const run = async (
    kind: string,
    name: string,
    attrs: string,
    go: (t: any) => Promise<void>,
  ) => {
    if (ONLY && !name.includes(ONLY)) return;
    const file = join(dir, 'page.html');
    await writeFile(
      file,
      `<!doctype html><meta charset=utf-8><style>body{margin:0} mx-slider,#h{inline-size:204px;margin:60px 0 0 100px;display:block} input{appearance:none;block-size:44px}input::-moz-range-thumb{width:4px;height:44px;border:0}</style><form id=f><fieldset id=fs style="border:0;margin:0;padding:0">${kind === 'mx' ? `<mx-slider id=h name=n indicator ${attrs}></mx-slider>` : `<input id=h type=range name=n ${attrs}>`}</fieldset></form><script>${code.replaceAll('</script', '<\\/script')}</script><script>
      var log = [], h = document.getElementById('h'), f = document.getElementById('f'), fs = document.getElementById('fs'), mx = ${kind === 'mx'}, i = mx ? h.shadowRoot.querySelector('.input') : h;
      for (const t of ['input', 'change']) h.addEventListener(t, () => log.push(t + h.value + (h.matches(':disabled') ? '(disabled)' : '')));
      for (const t of ['pointerdown', 'pointercancel', 'pointerup']) i.addEventListener(t, (e) => log.push(t.replace('pointer', 'p.') + '(' + e.pointerType + (e.isPrimary ? '' : ' 2nd') + ')'));
      function mark(m) { log.push('-' + m + '[v' + h.value + ' in' + i.value + ' f' + new FormData(f).get('n') + (mx && h.matches(':state(pressed)') ? ' HELD' : '') + ']'); }
    </script>`,
    );
    await send('WebDriver:Navigate', { url: pathToFileURL(file).href });
    const b = JSON.parse(
      await content(
        'const r = i.getBoundingClientRect(); return JSON.stringify([r.left + 2, r.top + r.height / 2])',
      ),
    ) as [number, number];
    const at = (f: number, dy = 0, id = 0): P => ({
      id,
      x: b[0] + f * 200,
      y: b[1] + dy,
    });
    const js = (c: string) => content(c.replaceAll('\n', ' '));
    const mouse = async (
      type: string,
      p: P,
      src: number,
      button = 0,
      buttons = 1,
    ) => {
      await sys(
        `const u = window.windowUtils; const C = Ci.nsIDOMWindowUtils; window.synthesizeMouseEvent(${JSON.stringify(type)}, ${p.x}, ${p.y}, { identifier: ${src === 1 ? 'C.DEFAULT_MOUSE_POINTER_ID' : 7}, button: ${button}, buttons: ${buttons}, clickCount: 1, pressure: 0.5, inputSource: ${src} }, {});`,
      );
      await new Promise((r) => setTimeout(r, 40));
    };
    await go({
      raw,
      at,
      js,
      mark: (m: string) => js(`mark(${JSON.stringify(m)})`),
      mouse,
    });
    await new Promise((r) => setTimeout(r, 150));
    await js('mark("end")');
    console.log(
      `${kind} | ${name} | ${(JSON.parse(await content('return JSON.stringify(log)')) as string[]).join(' ')}`,
    );
  };
  for (const kind of ['mx', 'bare']) {
    for (const focused of [false, true])
      for (const last of ['touchend', 'touchcancel'])
        for (const [n, c] of [
          ['nothing', '1'],
          ['disabled', 'h.disabled=true'],
          ['fieldset disabled', 'fs.disabled=true'],
          ['removed', 'h.remove()'],
          ['moved', 'f.prepend(h)'],
          ['blurred', 'document.activeElement.blur()'],
          ['hidden', 'h.style.display="none"'],
          ['value=90', 'h.value=90'],
          ['value=30', 'h.value=30'],
          ['attribute=60', 'h.setAttribute("value","60")'],
          ['max=50', 'h.max=50'],
          ['reset', 'f.reset()'],
        ] as const) {
          if (kind === 'bare' && last === 'touchcancel') continue;
          await run(
            kind,
            `finger down at 70${focused ? ', focused' : ''}, ${n}, ${last}`,
            'value=30',
            async ({ raw, at, js, mark }) => {
              if (focused) await js('h.focus()');
              await raw('touchstart', [at(0.7)]);
              await js(c);
              await mark('did');
              await raw(last, [at(0.7)]);
            },
          );
        }
    await run(
      kind,
      'after a cancelled press, 30 set by a synthetic step',
      'value=30',
      async ({ raw, at, js, mark }) => {
        await raw('touchstart', [at(0.7)]);
        await raw('touchcancel', [at(0.7)]);
        await js('h.value=29');
        await mark('29');
        await js(
          'i.value=30; i.dispatchEvent(new Event("input",{bubbles:true,composed:true})); i.dispatchEvent(new Event("change",{bubbles:true}))',
        );
      },
    );
    for (const [n, c] of [
      ['body.append', 'document.body.append(h)'],
      ['f.append', 'f.append(h)'],
      ['f.prepend', 'f.prepend(h)'],
      ['fs.append', 'fs.append(h)'],
      ['fs.append after a spacer', 'fs.append(document.createElement("p"), h)'],
    ] as const)
      for (const at2 of [0.7, 0.2])
        await run(
          kind,
          `moved by ${n}, lifted at ${at2}`,
          'value=30',
          async ({ raw, at, js, mark }) => {
            await raw('touchstart', [at(0.7)]);
            await js(c + '; h.offsetWidth');
            await mark('did');
            await raw('touchend', [at(at2)]);
          },
        );
    await run(
      kind,
      'ownership: hidden while held, then attribute 60',
      'value=30',
      async ({ raw, at, js, mark }) => {
        await raw('touchstart', [at(0.7)]);
        await js('h.style.display="none"; h.offsetWidth');
        await raw('touchcancel', [at(0.7)]);
        await js('h.setAttribute("value","60")');
      },
    );
    for (const [n, before] of [
      ['no press', false],
      ['after a cancelled press', true],
    ] as const)
      await run(
        kind,
        `AT sets 30 by nsIAccessibleValue, ${n}`,
        'value=30',
        async ({ raw, at, js, mark }) => {
          await send('Marionette:SetContext', { value: 'chrome' });
          const acc = (set: string) =>
            send('WebDriver:ExecuteAsyncScript', {
              script: `const done = arguments[arguments.length - 1]; const svc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService); let n = 0; const tick = () => { let found; const walk = (a) => { if (!a) return; if (svc.getStringRole(a.role) === 'slider') found = a; for (let c = a.firstChild; c; c = c.nextSibling) walk(c); }; walk(svc.getAccessibleFor(gBrowser.selectedBrowser)); if (!found && n++ < 60) return setTimeout(tick, 100); if (!found) return done('none'); const v = found.QueryInterface(Ci.nsIAccessibleValue); ${set}; setTimeout(() => done(String(v.currentValue)), 200); }; tick();`,
              args: [],
            });
          console.log('   reads', await acc(''));
          await send('Marionette:SetContext', { value: 'content' });
          if (before) {
            await raw('touchstart', [at(0.7)]);
            await raw('touchcancel', [at(0.7)]);
          }
          await js('h.value=29');
          await mark('29');
          for (const x of [30, 31]) {
            await send('Marionette:SetContext', { value: 'chrome' });
            console.log('   set', x, '->', await acc(`v.currentValue = ${x}`));
            await send('Marionette:SetContext', { value: 'content' });
            await mark('AT' + x);
          }
        },
      );
    const two = (n: string, go: any) => run(kind, n, 'value=30', go);
    await two(
      'slide, 2nd touches and lifts, 1st moves, lifts',
      async ({ raw, at, mark }: any) => {
        await raw('touchstart', [at(0.5)]);
        await raw('touchmove', [at(0.6)]);
        await raw('touchmove', [at(0.65)]);
        await raw('touchstart', [at(0.65), at(0.9, 0, 1)]);
        await mark('2 down');
        await raw('touchend', [at(0.9, 0, 1)]);
        await mark('2 up');
        await raw('touchmove', [at(0.75)]);
        await mark('moved');
        await raw('touchend', [at(0.75)]);
      },
    );
    await two(
      'held, 2nd touches and lifts, 1st lifts',
      async ({ raw, at, mark }: any) => {
        await raw('touchstart', [at(0.5)]);
        await raw('touchstart', [at(0.5), at(0.9, 0, 1)]);
        await mark('2 down');
        await raw('touchend', [at(0.9, 0, 1)]);
        await mark('2 up');
        await raw('touchend', [at(0.5)]);
      },
    );
    await two(
      'held, 2nd touches and lifts, 1st cancelled',
      async ({ raw, at, mark }: any) => {
        await raw('touchstart', [at(0.5)]);
        await raw('touchstart', [at(0.5), at(0.9, 0, 1)]);
        await raw('touchend', [at(0.9, 0, 1)]);
        await mark('2 up');
        await raw('touchcancel', [at(0.5)]);
      },
    );
    await two(
      'slide, 2nd touches, both cancelled',
      async ({ raw, at, mark }: any) => {
        await raw('touchstart', [at(0.5)]);
        await raw('touchmove', [at(0.6)]);
        await raw('touchmove', [at(0.65)]);
        await raw('touchstart', [at(0.65), at(0.9, 0, 1)]);
        await raw('touchcancel', [at(0.65), at(0.9, 0, 1)]);
      },
    );
    await two(
      'slide, 2nd touches and lifts, 1st cancelled',
      async ({ raw, at, mark }: any) => {
        await raw('touchstart', [at(0.5)]);
        await raw('touchmove', [at(0.6)]);
        await raw('touchmove', [at(0.65)]);
        await raw('touchstart', [at(0.65), at(0.9, 0, 1)]);
        await raw('touchend', [at(0.9, 0, 1)]);
        await mark('2 up');
        await raw('touchcancel', [at(0.65)]);
      },
    );
    for (const [n, src] of [
      ['pen', 2],
      ['mouse', 1],
    ] as const) {
      await run(
        kind,
        `${n}: press, rest, release`,
        'value=30',
        async ({ mouse, at, mark }) => {
          await mouse('mousemove', at(0.7), src, 0, 0);
          await mouse('mousedown', at(0.7), src);
          await mark('down');
          await mouse('mouseup', at(0.7), src, 0, 0);
        },
      );
      await run(kind, `${n}: drag`, 'value=30', async ({ mouse, at, mark }) => {
        await mouse('mousemove', at(0.5), src, 0, 0);
        await mouse('mousedown', at(0.5), src);
        for (const f of [0.6, 0.7]) await mouse('mousemove', at(f), src);
        await mark('moved');
        await mouse('mouseup', at(0.7), src, 0, 0);
      });
      await run(
        kind,
        `${n}: disabled while down`,
        'value=30',
        async ({ mouse, at, mark, js }) => {
          await mouse('mousedown', at(0.7), src);
          await js('h.disabled=true');
          await mark('did');
          await mouse('mouseup', at(0.7), src, 0, 0);
        },
      );
      await run(
        kind,
        `${n}: right button`,
        'value=30',
        async ({ mouse, at, mark }) => {
          await mouse('mousedown', at(0.7), src, 2, 2);
          await mark('down');
          await mouse('mouseup', at(0.7), src, 2, 0);
        },
      );
    }
  }
  await send('WebDriver:DeleteSession').catch(() => {});
} finally {
  sock.end();
  proc.kill();
  await rm(dir, { recursive: true, force: true });
}
