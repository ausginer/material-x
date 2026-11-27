/**
 * The second recheck's own mutations of `@ydinjs/mutator`, on the fixes of the
 * recheck's findings, run with the tool in Chromium, Firefox and WebKit. The
 * rows are node rows, so the engine only sets `MX_TEST_ENGINES` for the run.
 * Each mutation removes a mechanism of a fix, or asks whether a row sees it.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ROWS = 'packages/mutator/tests/mutator.node.test.ts';
const CLI = 'packages/mutator/src/cli.ts';
const VITEST = 'packages/mutator/src/vitest.ts';

const file: MutationFile = {
  runs: [{ dir: 'packages/mutator', tests: ['tests/mutator.node.test.ts'] }],
  engines: ['chromium', 'firefox', 'webkit'],
  mutations: [
    {
      name: 'a run that fails a row is a failure outside the tests',
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: 'return result.code === 0 || reported',
          replacement: 'return result.code === 0',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should read a selected row that fails unmutated as void',
          },
        ],
      },
    },
    {
      name: "the failure is read from Vitest's standard output",
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: '(result.stderr || result.stdout)',
          replacement: '(result.stdout)',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: "should exit with 3, not refuse the file, when the unmutated run's browser doesn't start",
          },
          {
            file: ROWS,
            row: "should read a selected row whose browser doesn't start as void, with Vitest's output",
          },
        ],
      },
    },
    {
      name: 'an unknown option is accepted',
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: 'allowPositionals: true,',
          replacement: 'allowPositionals: true,\n    strict: false,',
        },
      ],
      expect: {
        fails: [{ file: ROWS, row: 'should exit with 3 on an unknown option' }],
      },
    },
    {
      name: "the config isn't compared with the file's commit",
      group: 'doubted',
      edits: [
        {
          file: CLI,
          text: '    configPath,\n    import.meta.dirname,\n',
          replacement: '    import.meta.dirname,\n',
        },
      ],
      expect: {
        survives:
          'no row modifies the config alone after its commit; probe P3, case C, reads it',
      },
    },
    {
      name: 'an ignored file names a commit',
      group: 'doubted',
      edits: [
        {
          file: CLI,
          text: "'--porcelain', '--ignored', '--'",
          replacement: "'--porcelain', '--'",
        },
      ],
      expect: { survives: 'no row runs a file that its checkout ignores' },
    },
  ],
};

export default file;
