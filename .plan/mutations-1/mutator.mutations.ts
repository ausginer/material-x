/**
 * The implementer's mutations of `@ydinjs/mutator`'s own mechanisms, one for
 * each behavior that its node rows hold (RD-65 property 10), run with the tool
 * itself in Chromium. The rows are in one file, so each selector names a row of
 * `packages/mutator/tests/mutator.node.test.ts`.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ROWS = 'packages/mutator/tests/mutator.node.test.ts';
const RUN = 'packages/mutator/src/run.ts';
const REPORT = 'packages/mutator/src/report.ts';
const COPY = 'packages/mutator/src/copy.ts';

const config: MutationFile = {
  runs: [{ dir: 'packages/mutator', tests: ['tests/mutator.node.test.ts'] }],
  engines: ['chromium'],
  mutations: [
    {
      name: 'a stale edit runs',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '} else if (count !== 1) {',
          replacement: '} else if (count < 0) {',
        },
      ],
      expect: {
        fails: [{ file: ROWS, row: 'should refuse each stale edit by name' }],
      },
    },
    {
      name: 'a selector that covers no row runs',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '  if (empty.length > 0) {',
          replacement: '  if (empty.length < 0) {',
        },
      ],
      expect: {
        fails: [
          { file: ROWS, row: 'should refuse a selector that covers no row' },
        ],
      },
    },
    {
      name: 'the copy stays after a run',
      group: 'mechanism',
      edits: [
        { file: RUN, text: '    await copy.remove();\n', replacement: '' },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should leave the checkout and the temporary directory as they were after a run',
          },
          {
            file: ROWS,
            row: 'should leave them as they were after a run that fails midway',
          },
        ],
      },
    },
    {
      name: 'a mutation is not restored',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '        async (file) => await writeFile(join(dir, file), originals.get(file)!),',
          replacement: '        async () => {},',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should restore each mutation before the next one runs',
          },
        ],
      },
    },
    {
      name: 'a stale copy is kept',
      group: 'mechanism',
      edits: [
        {
          file: COPY,
          text: '      return path && pid && !alive(Number(pid)) ? path : undefined;',
          replacement: '      return undefined;',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should remove a locked copy whose process no longer runs',
          },
        ],
      },
    },
    {
      name: 'a void row is judged',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "voided.length > 0 ? 'void' : ",
          replacement: '',
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
      name: 'a survivor is never caught',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "failed.length === 0 ? 'as expected' : 'caught'",
          replacement: "'as expected'",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should read a survivor that fails rows as caught',
          },
        ],
      },
    },
    {
      name: 'engines never differ',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '  return sets.some((set) => set !== sets[0]);',
          replacement: '  return false;',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should flag a mutation that fails other rows in another engine',
          },
        ],
      },
    },
    {
      name: "an engine's own expectation doesn't account for a difference",
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '.some((result) => result.hasEngineExpectations)',
          replacement: '.some(() => false)',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should judge each engine by its own expectation',
          },
        ],
      },
    },
    {
      name: 'a row that one engine skips counts',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: 'ranIn.every((set) => set.has(key)),',
          replacement: 'true,',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should not flag a row that another engine skips',
          },
        ],
      },
    },
    {
      name: 'nothing rebuilds',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: 'files.some((file) => matchesGlob(file, pattern)),',
          replacement: 'false,',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'should rebuild after a matching edit and after its restore',
          },
        ],
      },
    },
    {
      name: 'every edit rebuilds',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: 'files.some((file) => matchesGlob(file, pattern)),',
          replacement: 'true,',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: "should not rebuild for an edit that doesn't match",
          },
        ],
      },
    },
    {
      name: "a row that doesn't run counts as passing",
      group: 'doubted',
      edits: [
        {
          file: REPORT,
          text: "after.get(rowKey(row))?.status !== 'passed',",
          replacement: "after.get(rowKey(row))?.status === 'failed',",
        },
      ],
      expect: {
        survives:
          "No fixture row's test file fails to load with a mutation, so no row sees a row that stops running. A mutation that breaks its file's import is then read as passing.",
      },
    },
  ],
};

export default config;
