/**
 * The recheck's own mutations of `@ydinjs/mutator` after RD-66, run with the
 * tool in Chromium, Firefox and WebKit. The rows are node rows, so the engine
 * only sets `MX_TEST_ENGINES` for the run. Each mutation removes the mechanism
 * of a remediation, or asks whether a row sees it.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ROWS = 'packages/mutator/tests/mutator.node.test.ts';
const CLI = 'packages/mutator/src/cli.ts';
const RUN = 'packages/mutator/src/run.ts';
const REPORT = 'packages/mutator/src/report.ts';
const VITEST = 'packages/mutator/src/vitest.ts';

const file: MutationFile = {
  runs: [{ dir: 'packages/mutator', tests: ['tests/mutator.node.test.ts'] }],
  engines: ['chromium', 'firefox', 'webkit'],
  mutations: [
    {
      name: 'the mutations are applied in the invoking checkout',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: 'await withMutation(copy.dir, config, mutation, signal, log, async () => {',
          replacement:
            'await withMutation(root, config, mutation, signal, log, async () => {',
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
      name: "Vitest doesn't get the signal",
      group: 'mechanism',
      edits: [
        { file: VITEST, text: '{ env, signal },', replacement: '{ env },' },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should stop its Vitest and leave nothing after SIGTERM to the tool alone',
          },
        ],
      },
    },
    {
      name: 'a signal exits with 130',
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: '? 128 + constants.signals[error.signal]',
          replacement: '? 130',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should stop its Vitest and leave nothing after SIGTERM to the tool alone',
          },
        ],
      },
    },
    {
      name: "the file's commit is the code's commit",
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: '...(source.code === 0 ? { fileCommit: fileCommit! } : {}),',
          replacement: '...(source.code === 0 ? { fileCommit: commit } : {}),',
        },
      ],
      expect: {
        survives:
          "Each row's mutation file is outside any repository, so no row has a file commit",
      },
    },
    {
      name: "the summary gives no reason for a row that didn't run",
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '? [`  - void, did not run: ${key}`, ...reason(key)]',
          replacement: '? [`  - void, did not run: ${key}`]',
        },
      ],
      expect: {
        survives: 'The rows read the JSON report and never the summary',
      },
    },
    {
      name: 'a row that the mutation skips has a verdict',
      group: 'doubted',
      edits: [
        {
          file: REPORT,
          text: "} else if (next?.status !== 'passed') {",
          replacement: '} else if (next === undefined) {',
        },
      ],
      expect: {
        survives:
          'No row is read with a mutation that skips a row that ran unmutated',
      },
    },
  ],
};

export default file;
