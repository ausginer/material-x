// Run from the repository's root, with the sources committed or saved:
//   node .plan/aria-own-value-1/probes/mutations.mjs <engine,...> [name]
// Applies each mutation to the sources, builds core, runs the rows of the unit,
// and restores the sources and core's build.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const CORE = 'packages/core/src/';
const MX = 'packages/material-x/src/';
const ARIA = `${CORE}controllers/useARIA.ts`;
const LINKABLE = `${CORE}traits/linkable.ts`;
const SELECTABLE = `${CORE}traits/selectable.ts`;
const VALIDATABLE = `${CORE}traits/validatable.ts`;
const SWITCH = `${MX}button/SwitchCore.ts`;
const ITEM = `${MX}list/list-link-item.ts`;
const TEMPLATES = ['switch-button', 'switch-icon-button'].map(
  (name) => `${MX}button/${name}.tpl.html`,
);
const replaced = (from, to) => (source) => {
  if (source.split(from).length !== 2) throw Error(`not one match: ${from}`);
  return source.replace(from, () => to);
};
const base = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const onMain = (file) => () =>
  execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' });
const reverted = (...files) =>
  Object.fromEntries(files.map((file) => [file, onMain(file)]));
const keep = '    own.set(name, value);\n    sync(name);\n';
const mutations = {
  'no mutation': {},
  'main (the rows in core import a name it lacks)': reverted(
    ARIA,
    LINKABLE,
    SELECTABLE,
    VALIDATABLE,
    SWITCH,
    ITEM,
    ...TEMPLATES,
  ),
  'the own value is never given': {
    [ARIA]: replaced(' ?? own.get(name) ?? null', ''),
  },
  'setOwnARIA keeps the value and writes it straight': {
    [ARIA]: replaced(
      keep,
      '    own.set(name, value);\n    setAttribute(target, name, value);\n',
    ),
  },
  'setOwnARIA writes straight and keeps nothing': {
    [ARIA]: replaced(keep, '    setAttribute(target, name, value);\n'),
  },
  'the own value before the transformer': {
    [ARIA]: replaced(
      'transform(name, host.getAttribute(name)) ?? own.get(name) ?? null',
      'own.get(name) ?? transform(name, host.getAttribute(name))',
    ),
  },
  'setOwnARIA keeps the value and waits for the mirror': {
    [ARIA]: replaced(keep, '    own.set(name, value);\n'),
  },
  'linkable as on main': reverted(LINKABLE),
  'selectable as on main': reverted(SELECTABLE),
  'validatable as on main': reverted(VALIDATABLE),
  'list-link-item as on main': reverted(ITEM),
  'the switch and its templates as on main': reverted(SWITCH, ...TEMPLATES),
  'no call at the setup of the switch': {
    [SWITCH]: replaced("  setOwnARIA(target, 'aria-checked', 'false');\n", ''),
  },
  'the value in the templates, and no call at setup': {
    ...reverted(...TEMPLATES),
    [SWITCH]: replaced("  setOwnARIA(target, 'aria-checked', 'false');\n", ''),
  },
};
const run = (cwd, args, env = {}) => {
  const { stdout, stderr } = spawnSync('aube', ['exec', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1e8,
    env: { ...process.env, NO_COLOR: '1', ...env },
  });
  return stdout + stderr;
};
const [engines, only] = process.argv.slice(2);
try {
  for (const [name, files] of Object.entries(mutations)) {
    if (only && name !== only) continue;
    const sources = Object.keys(files).map((file) => [
      file,
      readFileSync(file, 'utf8'),
    ]);
    try {
      for (const [file, source] of sources)
        writeFileSync(file, files[file](source));
      run('packages/core', ['just', 'build']);
      for (const engine of engines.split(',')) {
        for (const [p, ...tests] of [
          ['core', 'useARIA', 'traits/linkable'],
          ['material-x', 'aria-own-value'],
        ]) {
          const out = run(
            `packages/${p}`,
            [
              'vitest',
              'run',
              '-c',
              'vitest.config.ts',
              '--project',
              'browser*',
              ...tests,
            ],
            { MX_TEST_ENGINES: engine },
          );
          console.log(
            `## ${name} | ${engine} | ${p} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? 'no result'}`,
          );
          for (const row of new Set(
            [...out.matchAll(/FAIL\s+(.*)/gu)].map((m) =>
              m[1].replace(/^.*?> /u, ''),
            ),
          ))
            console.log(`   ${row}`);
        }
      }
    } finally {
      for (const [file, source] of sources) writeFileSync(file, source);
    }
  }
} finally {
  run('packages/core', ['just', 'build']);
}
