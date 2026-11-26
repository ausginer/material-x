// RF-142's feature proof: the implementer's runner (.plan/disabled-item-1/probes/mutate.mjs) with other mutations.
// RF-142: applies each mutation, runs sortable-list.browser and sortable-list.spec, and restores the sources.
// Run from packages/material-x: node ../../.plan/reviews/disabled-item-1/probes/mutations.mjs <engine> [name of one mutation]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const ITEM = 'src/list/sortable-item.ts';
const LIST = 'src/list/sortable-list.ts';
const TOKENS = 'src/list/styles/sortable/tokens.ts';
const source = Object.fromEntries(
  [ITEM, LIST, TOKENS].map((f) => [f, readFileSync(f, 'utf8')]),
);
const mutations = [
  ['no mutation'],
  ["aria-disabled isn't watched", ITEM, "    'aria-disabled',\n", ''],
  [
    'the state observer is never disconnected',
    ITEM,
    '      state.disconnect();\n',
    '',
  ],
  [
    'a disabled control keeps its description',
    ITEM,
    "claim(control, controlOwned, 'aria-description', description)",
    "claim(control, controlOwned, 'aria-description', DESCRIPTION)",
  ],
  [
    'a disabled handle keeps its description',
    ITEM,
    "claim(handle, handleOwned, 'aria-description', description)",
    "claim(handle, handleOwned, 'aria-description', DESCRIPTION)",
  ],
  [
    'a disabled handle keeps its touch-action',
    ITEM,
    "disabled ? null : 'none'",
    "'none'",
  ],
  [
    'a disabled handle loses its role',
    ITEM,
    "claim(handle, handleOwned, 'role', 'button')",
    "claim(handle, handleOwned, 'role', disabled ? null : 'button')",
  ],
  [
    'a disabled handle loses its name',
    ITEM,
    "'aria-label', 'Reorder'",
    "'aria-label', disabled ? null : 'Reorder'",
  ],
  [
    "the item's own value isn't written again",
    ITEM,
    'element.getAttribute(name) !== value',
    'false',
  ],
  [
    "a page's touch-action is removed",
    ITEM,
    "element!.style.touchAction === 'none'",
    'true',
  ],
  [
    'an item without a handle is admitted',
    LIST,
    'isDisabled(item) ? null',
    'isDisabled(item) && handleOf(item) ? null',
  ],
  [
    'an item with a handle is admitted',
    LIST,
    'isDisabled(item) ? null',
    'isDisabled(item) && !handleOf(item) ? null',
  ],
  [
    'a disabled item leaves the collection',
    LIST,
    'items: () => items,',
    'items: () => items.filter((i) => !isDisabled(i)),',
  ],
  [
    'a press whose item is disabled before the lift is canceled',
    LIST,
    '        dragged = item as ControlledElement;\n',
    '        dragged = item as ControlledElement;\n        if (isDisabled(item)) controller?.requestCancel();\n',
  ],
  [
    'a pending commit is refused when the item is disabled in its handler',
    LIST,
    '          return ReorderResolution.reject();\n        }\n',
    '          return ReorderResolution.reject();\n        }\n        if (isDisabled(request.item)) return ReorderResolution.reject();\n',
  ],
];
const out = `${tmpdir()}/disabled-item-${process.pid}.json`;
const restore = () => {
  for (const [f, text] of Object.entries(source)) writeFileSync(f, text);
};
try {
  for (const [name, file, from, to] of mutations) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    if (file) {
      if (source[file].split(from).length !== 2)
        throw new Error(`not one match: ${name}`);
      writeFileSync(
        file,
        source[file].replace(from, () => to),
      );
    }
    spawnSync(
      'aube',
      [
        'exec',
        '--',
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        'tests/list/sortable-list',
        '--reporter=json',
        `--outputFile=${out}`,
      ],
      {
        env: { ...process.env, MX_TEST_ENGINES: process.argv[2] },
      },
    );
    restore();
    const json = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
    rmSync(out, { force: true });
    console.log(
      `## ${name} | ${process.argv[2]} | ${json?.numTotalTests ? `${json.numPassedTests} passed, ${json.numFailedTests} failed` : 'no result'}`,
    );
    for (const test of json?.testResults.flatMap((f) => f.assertionResults) ??
      [])
      if (test.status === 'failed') console.log(`   ${test.fullName}`);
  }
} finally {
  restore();
}
