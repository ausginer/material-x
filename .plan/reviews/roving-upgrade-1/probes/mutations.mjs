// Mutations of the hook's memory that the implementer's table doesn't have, each in a copy of the hook that a copy of the rows reads.
// Run from packages/core: node ../../.plan/reviews/roving-upgrade-1/probes/mutations.mjs <engine>
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const source = readFileSync('src/controllers/useRovingTabindex.ts', 'utf8');
const rows = readFileSync(
  'tests/controllers/useRovingTabindex.browser.test.ts',
  'utf8',
);
const MUTATIONS = {
  none: [],
  'a match of the value keeps the default choice': [
    '      chosenBy = undefined;\n    } else',
    '    } else',
  ],
  'a read keeps the moved state': [
    '    items.setTabStop(target);\n    isMoved = false;',
    '    items.setTabStop(target);',
  ],
  'the join reads the nodes of its own slot change': [
    'items.value = current.filter(isItem);',
    'items.value = nodes.filter(isItem);',
  ],
  'the join selects without its nodes': [
    '      select(nodes);\n    }\n  };',
    '      select();\n    }\n  };',
  ],
  'each read is a default choice': ['else if (target !== active)', 'else'],
  'a node that is no item joins': [
    '            if (isItem(node)) {',
    '            if (node) {',
  ],
  'the value change drops the default choice': [
    '      select();\n    },',
    '      chosenBy = undefined;\n      select();\n    },',
  ],
  'the moved tab stop is the first item': [
    'items.setTabStop(tabbable);',
    'items.setTabStop(items.enabled[0]);',
  ],
};
for (const [name, [from, to]] of Object.entries(MUTATIONS)) {
  if (from && source.split(from).length !== 2) {
    console.log(`${name}: no one match`);
    continue;
  }
  writeFileSync(
    'src/controllers/zz-mutant.ts',
    `// @ts-nocheck\n${from ? source.replace(from, () => to) : source}`,
  );
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
}
rmSync('src/controllers/zz-mutant.ts');
rmSync('tests/controllers/zz-mutant.browser.test.ts');
