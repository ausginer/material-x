// The same variants in Firefox, whose touch events come from its own
// `synthesizeTouchEvent` through Marionette. Nothing here scrolls, so the cancel is
// sent and not the browser's.
//
// node held-press-firefox.ts <packages>
// Build the packages first.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { firefox } from 'playwright';
import { built, hold } from './held-press-variants.ts';

const dir = await mkdtemp(join(tmpdir(), 'slider-ff-'));
await writeFile(
  join(dir, 'user.js'),
  'user_pref("marionette.port", 2832);\nuser_pref("dom.w3c_touch_events.enabled", 1);\n',
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
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
await new Promise<void>((resolve) => {
  const on = (d: Buffer) => {
    if (d.toString().includes('Listening on port')) resolve();
  };
  proc.stdout.on('data', on);
  proc.stderr.on('data', on);
});
const sock = createConnection(2832, '127.0.0.1');
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
  const touch = async (type: string, x: number, y: number) => {
    await send('WebDriver:ExecuteScript', {
      sandbox: 'system',
      newSandbox: true,
      script: `const w = window; if (!w.synthesizeTouchEvent) throw new Error(Object.getOwnPropertyNames(w.__proto__).concat(Object.getOwnPropertyNames(w), Object.getOwnPropertyNames(w.windowUtils.__proto__)).filter((n) => /synth|touch/i.test(n)).join()); w.synthesizeTouchEvent(${JSON.stringify(type)}, [{ identifier: 0, offsetX: ${x}, offsetY: ${y}, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1, tiltX: 0, tiltY: 0, twist: 0 }], 0, {});`,
      args: [],
    });
    await new Promise((r) => setTimeout(r, 40));
  };
  for (const [label, code] of [
    ['built', built],
    ['holds the press', hold],
  ] as const) {
    console.log(`## ${label}`);
    type At = (f: number) => [number, number];
    const run = async (
      name: string,
      attrs: string,
      go: (at: At) => Promise<void>,
      read = 's.value',
    ) => {
      const file = join(dir, 'page.html');
      await writeFile(
        file,
        `<!doctype html><meta charset=utf-8><style>body{margin:0} mx-slider{inline-size:204px;margin:60px 0 0 100px}</style><mx-slider id=s ${attrs}></mx-slider><script>${code.replaceAll('</script', '<\\/script')}</script><script>
        window.log = [];
        const input = s.shadowRoot.querySelector('.input');
        for (const t of ['input', 'change']) s.addEventListener(t, () => log.push(t + s.value));
        for (const t of ['pointerdown', 'pointermove', 'pointercancel', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'touchcancel'])
          input.addEventListener(t, (e) => log.push(t.replace('pointer', 'p.').replace('touch', 't.') + (e.pointerType && e.pointerType !== 'touch' ? '(' + e.pointerType + ')' : '')));
      </script>`,
      );
      await send('WebDriver:Navigate', { url: pathToFileURL(file).href });
      const b = JSON.parse(
        await content(
          'const r = s.shadowRoot.querySelector(".input").getBoundingClientRect(); return JSON.stringify([r.left + 2, r.top + r.height / 2])',
        ),
      ) as [number, number];
      await go((f) => [b[0] + f * 200, b[1]]);
      await new Promise((r) => setTimeout(r, 100));
      const log = JSON.parse(
        await content('return JSON.stringify(log)'),
      ) as string[];
      console.log(
        `${name} | ${log.join(' ')} | ${JSON.stringify(await content(`return ${read}`))}`,
      );
    };
    const go =
      (f: number, moves: Array<[number, number]>, last: string | null) =>
      async (at: At) => {
        const [x, y] = at(f);
        await touch('touchstart', x, y);
        let p: [number, number] = [x, y];
        for (const [dx, dy] of moves) {
          p = [x + dx, y + dy];
          await touch('touchmove', ...p);
        }
        if (last) await touch(last, ...p);
      };
    const during = (js: string, last: string) => async (at: At) => {
      await go(0.7, [], null)(at);
      await content(js);
      await touch(last, ...at(0.7));
    };
    await run('tap', 'value=30', go(0.7, [], 'touchend'));
    await run(
      'drag',
      'value=30',
      go(
        0.7,
        [
          [10, 0],
          [20, 0],
        ],
        'touchend',
      ),
    );
    await run(
      'drag from the handle, step 25',
      'value=50 step=25',
      go(
        0.5,
        [
          [20, 0],
          [50, 0],
        ],
        'touchend',
      ),
    );
    await run('press, cancel', 'value=30', go(0.7, [], 'touchcancel'));
    await run(
      'press, vertical move, cancel',
      'value=30',
      go(0.7, [[0, -8]], 'touchcancel'),
    );
    await run(
      'press on the handle, cancel',
      'value=30',
      go(0.3, [], 'touchcancel'),
    );
    await run(
      'slide, cancel',
      'value=30',
      go(
        0.7,
        [
          [10, 0],
          [20, 0],
        ],
        'touchcancel',
      ),
    );
    await run(
      'press, cancel, then the attribute is 60',
      'value=30',
      async (at) => {
        await go(0.7, [], 'touchcancel')(at);
        await content('s.setAttribute("value", "60")');
      },
    );
    await run(
      'script sets 90 during',
      'value=30',
      during('s.value = 90', 'touchcancel'),
    );
    await run(
      'script sets 90 during a tap',
      'value=30',
      during('s.value = 90', 'touchend'),
    );
    await run(
      'moved in the DOM during',
      'value=30',
      during('document.body.append(s)', 'touchend'),
      '[s.value, s.shadowRoot.querySelector(".input").value]',
    );
  }
  await send('WebDriver:DeleteSession').catch(() => {});
} finally {
  sock.end();
  proc.kill();
  await rm(dir, { recursive: true, force: true });
}
