/**
 * The third recheck's own mutations of `@ydinjs/mutator`, on case H, the
 * owner's (a) and the color fix, run with the tool in Chromium, Firefox and
 * WebKit. The rows are node rows, so the engine only sets `MX_TEST_ENGINES` for
 * the run. Each mutation removes a mechanism of a change, or asks whether a row
 * sees it. The last two are probes: each changes a row to ask a question and is
 * predicted to survive, so _caught_ answers no.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ROWS = 'packages/mutator/tests/mutator.node.test.ts';
const RUN = 'packages/mutator/src/run.ts';
const VITEST = 'packages/mutator/src/vitest.ts';

const row = (name: string) => ({ file: ROWS, row: name });

const CASE_H = row(
  'should judge a run whose rows pass beside an unhandled error, and report the error',
);
const COLOR = row(
  "should read Vitest's error without colors when FORCE_COLOR is set",
);
const ONLY_SURVIVORS = row(
  'should refuse a file with only survivors whose run selects no test file, before any mutation',
);
const NO_FILE = row('should refuse a file whose run selects no test file');
const TWO_RUNS = row(
  'should name only the run that selects no test file, of two runs',
);

const file: MutationFile = {
  runs: [{ dir: 'packages/mutator', tests: ['tests/mutator.node.test.ts'] }],
  engines: ['chromium', 'firefox', 'webkit'],
  mutations: [
    // Case H: the error is kept in the report.
    {
      name: "a mutated run's error isn't kept",
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '...(mutated.runError ? { runError: mutated.runError } : {}),',
          replacement: '',
        },
      ],
      expect: { fails: [CASE_H] },
    },
    {
      name: "the unmutated run's error isn't kept",
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '...(runErrors.has(engine) ? { runError: runErrors.get(engine)! } : {}),',
          replacement: '',
        },
      ],
      expect: { fails: [CASE_H, COLOR] },
    },
    {
      name: "the reporter's banner isn't found",
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: 'const banner = UNHANDLED.exec(stderr);',
          replacement: 'const banner = null;',
        },
      ],
      // The unmutated run falls back to all of standard error, but the mutated
      // run fails a row, so only the banner gives its error.
      expect: { fails: [CASE_H] },
    },
    {
      name: 'the JSON report is named for every reporter',
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: '`--outputFile.json=${output}`',
          replacement: '`--outputFile=${output}`',
        },
      ],
      // Doubted: the dot reporter writes no file, so the option may read the
      // same for both.
      expect: {
        survives: 'the dot reporter writes no file, so the output is the same',
      },
    },
    // The owner's (a).
    {
      name: "a run that selects no test file isn't excused from the unexplained exit",
      group: 'mechanism',
      edits: [
        { file: VITEST, text: '      files === 0 ||\n', replacement: '' },
      ],
      // A doubt: `some` on an empty list is false, so such a run gets an error
      // and no failure, and is refused before the error is reported.
      expect: {
        survives:
          'a run with no test file has no listed file without a row, and is refused before its error is read',
      },
    },
    {
      name: "the refusal doesn't name the engine",
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '`${engine}: the run of ${tests.join',
          replacement: '`the run of ${tests.join',
        },
      ],
      expect: { fails: [NO_FILE, ONLY_SURVIVORS, TWO_RUNS] },
    },
    {
      name: 'a run is refused only when every run before it selects no test file',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '        if (result.files === 0) {',
          replacement: '        if (files === 0) {',
        },
      ],
      // The owner's (a), not (b): the second run is refused although the first
      // lists a test file.
      expect: { fails: [TWO_RUNS] },
    },
    // Probes.
    {
      name: 'probe: case H in the browser project',
      group: 'mechanism',
      edits: [
        {
          file: ROWS,
          text: '  const rows = join(repo, TEST_FILE);',
          replacement:
            "  const rows = join(repo, 'tests/dom.browser.test.ts');",
        },
        {
          file: ROWS,
          text: '      const result = await mutate(fileOf([CLAMP]), {\n        prepare: UNHANDLED_ROW,\n      });',
          replacement:
            '      const result = await mutate(browserFile([LABEL]), {\n        prepare: UNHANDLED_ROW,\n      });',
        },
        {
          file: ROWS,
          text: "        [['a', 'as expected']],\n      ]);\n      expect(leg!.runError)",
          replacement:
            "        [['chromium', 'as expected']],\n      ]);\n      expect(leg!.runError)",
        },
        {
          file: ROWS,
          text: "'- a, unmutated: Vitest printed",
          replacement: "'- chromium, unmutated: Vitest printed",
        },
      ],
      // The FORCE_COLOR row keeps the node project, whose test file no longer
      // has the unhandled row, so it fails; the case H row is the question.
      expect: { fails: [COLOR] },
    },
    {
      name: 'probe: failure messages have no colors with FORCE_COLOR',
      group: 'mechanism',
      edits: [
        {
          file: ROWS,
          text: "        prepare: UNHANDLED_ROW,\n        env: { FORCE_COLOR: '1' },\n      });\n\n      expect(result.code).toBe(0);",
          replacement:
            "        prepare: UNHANDLED_ROW,\n        env: { FORCE_COLOR: '1' },\n      });\n\n      expect(result.code).toBe(0);\n      expect(result.report!.legs[0]!.mutations[0]!.failed.length).toBeGreaterThan(0);\n      expect(JSON.stringify(result.report!.legs[0]!.mutations[0]!.messages)).not.toContain('\\\\u001b');\n      expect(result.summary).not.toContain('\\u001b');",
        },
      ],
      expect: {
        survives:
          "Vitest's JSON report gives failure messages without colors under FORCE_COLOR",
      },
    },
  ],
};

export default file;
