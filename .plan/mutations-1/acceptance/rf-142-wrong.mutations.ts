/**
 * RD-65's acceptance, step 4: one mutation of `rf-142.mutations.ts` with a
 * wrong prediction. _A disabled control keeps its description_ fails the two
 * rows of the control's description, and this file predicts a row of the
 * handle's semantics too, which it doesn't fail. The run reports it _missed_
 * and fails.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ROWS = 'packages/material-x/tests/list/sortable-list.browser.test.ts';

const config: MutationFile = {
  runs: [{ dir: 'packages/material-x', tests: ['tests/list/sortable-list'] }],
  engines: ['chromium'],
  mutations: [
    {
      name: 'a disabled control keeps its description',
      group: 'mechanism',
      edits: [
        {
          file: 'packages/material-x/src/list/sortable-item.ts',
          text: "claim(control, controlOwned, 'aria-description', description)",
          replacement:
            "claim(control, controlOwned, 'aria-description', DESCRIPTION)",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should describe the control of an item without a handle only while it is enabled',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should describe the control of an item without a handle only while it is enabled',
          },
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle from the start',
          },
        ],
      },
    },
  ],
};

export default config;
