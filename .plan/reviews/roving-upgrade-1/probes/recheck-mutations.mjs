// The recheck's mutations of the choice, none of them in the implementer's table, each in a copy of the hook that a copy of the rows reads.
// Run from packages/core: node ../../.plan/reviews/roving-upgrade-1/probes/recheck-mutations.mjs <engine> [out dir for the mutants, as zz-roving-m<n>.ts of the model]
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const source = readFileSync('src/controllers/useRovingTabindex.ts', 'utf8');
const rows = readFileSync(
  'tests/controllers/useRovingTabindex.browser.test.ts',
  'utf8',
);
const CHOSEN = `      this.enabled.find((item) => item === focused) ??
      value.find((item) => item === this.#chosen);`;
const CANDIDATE = `      enabled.find((item) => item.value === this.#host.value) ??
      enabled.find((item) => item === this.#chosen) ??`;
const MUTATIONS = {
  none: [],
  'a read forgets the chosen item unless it is focused': [
    CHOSEN,
    '      this.enabled.find((item) => item === focused);',
  ],
  'a read prefers the former choice to the focused item': [
    CHOSEN,
    `      value.find((item) => item === this.#chosen) ??
      this.enabled.find((item) => item === focused);`,
  ],
  'a disabled item that is focused at a read is recorded (settled)': [
    'this.enabled.find((item) => item === focused)',
    'focused',
  ],
  'a focused item is the choice only while it is focused (the ruling’s current)':
    [
      [CHOSEN, '      value.find((item) => item === this.#chosen);'],
      [
        CANDIDATE,
        CANDIDATE.replace(
          '      enabled.find((item) => item === this.#chosen) ??',
          `      enabled.find((item) => item === this.focused) ??
      enabled.find((item) => item === this.#chosen) ??`,
        ),
      ],
    ],
  'the chosen item is preferred to the value': [
    CANDIDATE,
    `      enabled.find((item) => item === this.#chosen) ??
      enabled.find((item) => item.value === this.#host.value) ??`,
  ],
  'a disabled chosen item is still the choice': [
    'enabled.find((item) => item === this.#chosen) ??',
    'this.#chosen ??',
  ],
  'focus does not move the tab stop at once': [
    '    this.#chosen = item;\n    this.setTabStop(item);',
    '    this.#chosen = item;',
  ],
  'a change of the value forgets the chosen item': [
    '      select();\n    },',
    '      items.value = [];\n      read(host.shadowRoot!.querySelector<HTMLSlotElement>(slotSelector)!.assignedNodes());\n    },',
  ],
  'a change of the value does not choose again': [
    '      select();\n    },',
    '    },',
  ],
  'the first choice is the only one that focus makes': [
    '    this.#chosen = item;\n    this.setTabStop(item);',
    '    this.#chosen ??= item;\n    this.setTabStop(item);',
  ],
  'a definition adds the item and does not choose again': [
    'read(current);',
    'items.value = current.filter(isItem);',
  ],
  'a definition forgets the chosen item': [
    'read(current);',
    'items.value = []; read(current);',
  ],
  'a definition of an item that does not take the tab stop chooses the late item':
    [
      'read(current);',
      'read(current); if (isItem(node)) items.setTabStop(node);',
    ],
  'a definition keeps the tab stop of an item that matches no value': [
    'read(current);',
    'const stop = items.tabbable; items.value = current.filter(isItem); if (stop && stop.value !== host.value) items.setTabStop(stop); else select();',
  ],
  'a definition leaves a stop that focus moved off the value': [
    'read(current);',
    'const { focused } = items; read(current); if (focused) items.choose(focused);',
  ],
  'only the last wait of a slot change reads': [
    'if (current.includes(node)) {',
    'if (current.at(-1) === node) {',
  ],
  'the upgrade of a node that the read does not wait for': [
    "        !node.matches(':defined')\n",
    "        node === nodes.find((n) => n instanceof HTMLElement && !n.matches(':defined'))\n",
  ],
  'disabled items are focusable choices': [
    'isItem(node) && !node.disabled && items.contains(node)',
    'isItem(node) && items.contains(node)',
  ],
};
let index = -1;
for (const [name, pairs] of Object.entries(MUTATIONS)) {
  let mutant = source;
  for (const [from, to] of Array.isArray(pairs[0])
    ? pairs
    : pairs.length
      ? [pairs]
      : []) {
    if (mutant.split(from).length !== 2)
      throw new Error(`${name}: not one match`);
    mutant = mutant.replace(from, () => to);
  }
  if (process.argv[3]) {
    writeFileSync(
      `${process.argv[3]}/zz-roving-m${(index += 1)}.ts`,
      `// @ts-nocheck\n${mutant}`,
    );
    console.log(`m${index}: ${name}`);
    continue;
  }
  writeFileSync('src/controllers/zz-mutant.ts', `// @ts-nocheck\n${mutant}`);
  writeFileSync(
    'tests/controllers/zz-mutant.browser.test.ts',
    rows.replace(
      'controllers/useRovingTabindex.ts',
      'controllers/zz-mutant.ts',
    ),
  );
  const { stdout } = spawnSync(
    'aube',
    [
      'exec',
      'vitest',
      'run',
      '-c',
      'vitest.config.ts',
      'tests/controllers/zz-mutant.browser.test.ts',
    ],
    {
      env: { ...process.env, MX_TEST_ENGINES: process.argv[2], NO_COLOR: '1' },
      encoding: 'utf8',
    },
  );
  console.log(`${name}: ${/Tests\s+(.*)/u.exec(stdout)?.[1]}`);
  for (const [, row] of stdout.matchAll(/FAIL\s+.*> (.*)/gu))
    console.log(`   ${row}`);
}
if (process.argv[3]) process.exit();
rmSync('src/controllers/zz-mutant.ts');
rmSync('tests/controllers/zz-mutant.browser.test.ts');
