/**
 * The workflow's witness of a stale edit (RD-65's unit): its one edit's text
 * occurs nowhere, so `mutations.yml`'s `plan` job refuses the file before any
 * leg runs a test. Dispatched on any commit that holds this file.
 */
import type { MutationFile } from '@ydinjs/mutator';

const config: MutationFile = {
  runs: [{ dir: 'packages/material-x', tests: ['tests/list/sortable-list'] }],
  engines: ['chromium', 'firefox', 'webkit'],
  mutations: [
    {
      name: 'an edit that no longer matches',
      group: 'other',
      edits: [
        {
          file: 'packages/material-x/src/list/sortable-item.ts',
          text: "    'aria-disabled-stale',\n",
          replacement: '',
        },
      ],
      expect: { survives: 'never run: the edit is stale' },
    },
  ],
};

export default config;
