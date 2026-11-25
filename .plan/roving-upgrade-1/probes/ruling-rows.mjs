// The three rows of reviewer-4 in a copy of core's file, against the head and the mutation that each is for, Chromium.
// Run from packages/core: node ../../.plan/roving-upgrade-1/probes/ruling-rows.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const H = 'src/controllers/zz-arch.ts',
  T = 'tests/controllers/zz-arch.browser.test.ts';
const src = readFileSync('src/controllers/useRovingTabindex.ts', 'utf8');
const anchor = "    it('should observe a custom slot selector when provided'";
const rows0 = readFileSync(
  'tests/controllers/useRovingTabindex.browser.test.ts',
  'utf8',
);
if (rows0.split(anchor).length !== 2) throw 1;
const add = `
it('NEW1 last of two focuses', async () => {
  const host = createHost();
  const [a,b,c,d] = ['a','b','c','d'].map((value)=>createItem({value}));
  await mountHost(host,a,b,c); b.focus(); c.focus(); c.blur(); host.prepend(d); await nextFrame();
  expectTabStop([d,a,b,c], c);
});
it('NEW2 focused in the task that adds it, over a former choice', async () => {
  const host = createHost();
  const [a,b,c] = ['a','b','c'].map((value)=>createItem({value}));
  await mountHost(host,a,b); b.focus(); host.append(c); c.focus(); await nextFrame();
  expectTabStop([a,b,c], c);
});
it('NEW3 disabled focused in the task that adds it', async () => {
  const host = createHost();
  const [a,b] = ['a','b'].map((value)=>createItem({value}));
  const c = createItem({value:'c', disabled:true});
  await mountHost(host,a,b); b.focus(); host.append(c); c.focus(); await nextFrame();
  expect(document.activeElement).toBe(c);
  expectTabStop([a,b,c], b);
});
`;
const CH = `      this.enabled.find((item) => item === focused) ??
      value.find((item) => item === this.#chosen);`;
const M = {
  none: ['x', 'x'],
  first: [
    '    this.#chosen = item;\n    this.setTabStop(item);',
    '    this.#chosen ??= item;\n    this.setTabStop(item);',
  ],
  former: [
    CH,
    `      value.find((item) => item === this.#chosen) ??
      this.enabled.find((item) => item === focused);`,
  ],
  settled: ['this.enabled.find((item) => item === focused)', 'focused'],
};
try {
  for (const [n, [f, t]] of Object.entries(M)) {
    if (n !== 'none' && src.split(f).length !== 2) throw new Error(n);
    writeFileSync(
      H,
      '// @ts-nocheck\n' + (n === 'none' ? src : src.replace(f, () => t)),
    );
    writeFileSync(
      T,
      rows0
        .replace('controllers/useRovingTabindex.ts', 'controllers/zz-arch.ts')
        .replace(anchor, () => add + anchor),
    );
    const { stdout, stderr } = spawnSync(
      'aube',
      ['exec', 'vitest', 'run', '-c', 'vitest.config.ts', T],
      {
        env: { ...process.env, MX_TEST_ENGINES: 'chromium', NO_COLOR: '1' },
        encoding: 'utf8',
      },
    );
    console.log(n, /Tests\s+(.*)/.exec(stdout)?.[1]);
    for (const [, r] of (stdout + stderr).matchAll(/FAIL\s+.*> (.*)/g))
      console.log('   ', r);
  }
} finally {
  rmSync(H, { force: true });
  rmSync(T, { force: true });
}
