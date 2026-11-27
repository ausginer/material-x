/**
 * The feature proof's witnesses of four `@ydinjs/mutator` node rows that the
 * implementer's file (`.plan/mutations-1/mutator.mutations.ts`) leaves without
 * one: as expected, missed, a survivor read as expected, and `--workdir`. Run
 * with the tool at `9a65f1a89`, in Chromium.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ROWS = 'packages/mutator/tests/mutator.node.test.ts';
const RUN = 'packages/mutator/src/run.ts';
const REPORT = 'packages/mutator/src/report.ts';

const config: MutationFile = {
  runs: [{ dir: 'packages/mutator', tests: ['tests/mutator.node.test.ts'] }],
  engines: ['chromium'],
  mutations: [
    {
      name: 'a selected row that passes is never missed',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '(key) => !voided.includes(key) && !failedSet.has(key),',
          replacement: '() => false,',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should read a selected row that passes as missed',
          },
        ],
      },
    },
    {
      name: 'nothing is read as expected',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "missed.length > 0 ? 'missed' : 'as expected',",
          replacement: "'missed',",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should read a mutation that fails every selected row as expected',
          },
        ],
      },
    },
    {
      name: 'a survivor is always caught',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "outcome: failed.length === 0 ? 'as expected' : 'caught',",
          replacement: "outcome: 'caught',",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should read a survivor that fails no row as expected',
          },
        ],
      },
    },
    {
      name: '--workdir is ignored',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '  const copy: Copy = options.workdir\n',
          replacement: '  const copy: Copy = false\n',
        },
      ],
      expect: {
        survives:
          "The row reads the outcome, the invoking checkout and the temporary directory's listing, and a copy in place of the workdir leaves the same three",
      },
    },
  ],
};

export default config;
