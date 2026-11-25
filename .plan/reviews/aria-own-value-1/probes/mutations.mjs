// Mutations beyond the implementer's. Run from the repository's root, with the
// sources committed: node <this file> <engine,...>
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const ARIA = 'packages/core/src/controllers/useARIA.ts';
const LINK = 'packages/core/src/traits/linkable.ts';
const VAL = 'packages/core/src/traits/validatable.ts';
const ITEM = 'packages/material-x/src/list/list-link-item.ts';
const SWITCH = 'packages/material-x/src/button/SwitchCore.ts';
const keep = '    own.set(name, value);\n    sync(name);\n';

const M = {
  'an empty host value counts as none': [
    ARIA,
    'transform(name, host.getAttribute(name)) ?? own.get(name) ?? null',
    '(transform(name, host.getAttribute(name)) || own.get(name)) ?? null',
  ],
  'an empty own value counts as none': [
    ARIA,
    'own.get(name) ?? null',
    '(own.get(name) || null)',
  ],
  'the own value of null is not kept': [
    ARIA,
    '    own.set(name, value);',
    '    if (value != null) own.set(name, value);',
  ],
  'one Map for all targets': [
    ARIA,
    '  const own = new Map<string, string | null>();\n\n',
    '',
    'const ownWriters',
    'const own = new Map<string, string | null>();\nconst ownWriters',
  ],
  'one value for all names': [
    ARIA,
    'own.set(name, value)',
    "own.set('', value)",
    'own.get(name)',
    "own.get('')",
  ],
  'the write comes before the keeping': [
    ARIA,
    keep,
    '    sync(name);\n    own.set(name, value);\n',
  ],
  'the host is read without the transformer in setOwnARIA': [
    ARIA,
    keep,
    '    own.set(name, value);\n    setAttribute(target, name, host.getAttribute(name) ?? value);\n',
  ],
  'the own value only while connected': [
    ARIA,
    '?? own.get(name) ?? null',
    '?? (host.isConnected ? own.get(name) : null) ?? null',
  ],
  'a connect skips the own value': [
    ARIA,
    '    ]).forEach(sync);',
    '    ]).forEach((name) => { if (name?.startsWith("aria-")) setAttribute(target, name, transform(name, host.getAttribute(name))); });',
  ],
  'kept only from the first connect': [
    ARIA,
    '  ownWriters.set(target, (name, value) => {\n    own.set(name, value);\n    sync(name);\n  });\n',
    '',
    '  useConnected(host, () => {',
    '  useConnected(host, () => {\n    ownWriters.set(target, (name, value) => {\n      own.set(name, value);\n      sync(name);\n    });',
  ],
  'linkable: no own value goes on re-enable': [
    LINK,
    "setOwnARIA(target, 'aria-disabled', null);\n",
    '',
  ],
  'linkable: restores the host value itself': [
    LINK,
    "setOwnARIA(target, 'aria-disabled', null);",
    "setOwnARIA(target, 'aria-disabled', host.getAttribute('aria-disabled'));",
  ],
  'validatable: required has no own value': [
    VAL,
    "required: (_, value) => setOwnARIA(target, 'aria-required', present(value)),",
    "required: (_, value) => value == null ? target.removeAttribute('aria-required') : target.setAttribute('aria-required', 'true'),",
  ],
  'list-link-item: false in place of none': [
    ITEM,
    "value ? 'page' : null",
    "value ? 'page' : 'false'",
  ],
  'switch: no call at setup': [
    SWITCH,
    "  setOwnARIA(target, 'aria-checked', 'false');\n",
    '',
  ],
};
const run = (cwd, args, env = {}) => {
  const r = spawnSync('aube', ['exec', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1e8,
    env: { ...process.env, NO_COLOR: '1', ...env },
  });
  return r.stdout + r.stderr;
};
try {
  for (const [name, [file, ...edits]] of Object.entries(M)) {
    const good = readFileSync(file, 'utf8');
    try {
      let text = good;
      for (let i = 0; i < edits.length; i += 2) {
        if (text.split(edits[i]).length !== 2)
          throw Error(`${name}: not one match: ${edits[i]}`);
        text = text.replace(edits[i], () => edits[i + 1]);
      }
      writeFileSync(file, text);
      run('packages/core', ['just', 'build']);
      for (const e of process.argv[2].split(','))
        for (const [p, ...t] of [
          ['core', 'useARIA', 'traits/'],
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
              ...t,
            ],
            { MX_TEST_ENGINES: e },
          );
          console.log(
            `## ${name} | ${e} | ${p} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? 'no result'}`,
          );
        }
    } finally {
      writeFileSync(file, good);
    }
  }
} finally {
  run('packages/core', ['just', 'build']);
}
