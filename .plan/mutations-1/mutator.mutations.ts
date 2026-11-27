/**
 * The implementer's mutations of `@ydinjs/mutator`'s own mechanisms, one for
 * each behavior that its node rows hold (RD-65 property 10, RD-66), run with the
 * tool itself in Chromium. The rows are in one file, so each selector names a
 * row of `packages/mutator/tests/mutator.node.test.ts`. The three after RD-66's
 * comment are the feature proof's witnesses, with its predictions, read again
 * against the rows as they are now. The ones after the recheck's comment are the
 * witnesses of its findings, three of them the recheck's own mutations, and the
 * ones after the second recheck's comment are the witnesses of its findings, two
 * of them its own mutations, which it predicted to survive. The last two are the
 * witnesses of RD-66's ruling on a run with an unhandled error.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ROWS = 'packages/mutator/tests/mutator.node.test.ts';
const RUN = 'packages/mutator/src/run.ts';
const REPORT = 'packages/mutator/src/report.ts';
const COPY = 'packages/mutator/src/copy.ts';
const PROCESS = 'packages/mutator/src/process.ts';
const CLI = 'packages/mutator/src/cli.ts';
const VITEST = 'packages/mutator/src/vitest.ts';
const row = (name: string): Readonly<{ file: string; row: string }> => ({
  file: ROWS,
  row: name,
});

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
          text: "voided.length > 0 ? 'void' : missed",
          replacement: 'missed',
        },
      ],
      expect: {
        fails: [
          row("should not flag a row that doesn't run in another engine"),
          row('should read a selected row that fails unmutated as void'),
          row("should read a selected row that doesn't run as void"),
        ],
      },
    },
    {
      name: 'a survivor is never caught',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "failed.length > 0\n          ? 'caught'",
          replacement: "false\n          ? 'caught'",
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
          text: '.filter(([, result]) => result.engineReason === undefined)',
          replacement: '.filter(() => true)',
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
          text: 'verdicts.every((set) => set.has(key)),',
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
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "} else if (next?.status !== 'passed') {",
          replacement: '} else if (false) {',
        },
      ],
      expect: {
        fails: [
          row("should not flag a row that doesn't run in another engine"),
          row("should read a selected row that doesn't run as void"),
          row("should read a survivor whose rows don't run as void"),
        ],
      },
    },
    {
      name: "a row that doesn't run counts as failed",
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "    if (next?.status === 'failed') {\n      failedRows.push(next);",
          replacement:
            "    if (next?.status !== 'passed') {\n      failedRows.push(next ?? row);",
        },
      ],
      expect: {
        fails: [
          row("should not flag a row that doesn't run in another engine"),
          row("should read a selected row that doesn't run as void"),
          row("should read a survivor whose rows don't run as void"),
        ],
      },
    },
    {
      name: "one engine's own expectation accounts for every engine's difference",
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '.filter(([, result]) => result.engineReason === undefined)',
          replacement:
            '.filter(() => [...byEngine.values()].every((result) => result.engineReason === undefined))',
        },
      ],
      expect: {
        fails: [
          row(
            "should flag a difference between engines that another engine's own expectation doesn't explain",
          ),
        ],
      },
    },
    {
      name: "an engine's environment doesn't reach Vitest",
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '          config.engines[engine]!.env,',
          replacement: '          {},',
        },
      ],
      expect: {
        fails: [
          row("should not flag a row that doesn't run in another engine"),
          row('should run in a browser project'),
          row('should read a selected row that fails unmutated as void'),
          row('should judge each engine by its own expectation'),
          row('should flag a mutation that fails other rows in another engine'),
          row('should not flag a row that another engine skips'),
          row(
            "should flag a difference between engines that another engine's own expectation doesn't explain",
          ),
        ],
      },
    },
    {
      name: 'a signal stops nothing',
      group: 'mechanism',
      edits: [{ file: RUN, text: '    stop.abort();\n', replacement: '' }],
      expect: {
        fails: [
          row(
            'should wait for a command that a signal stops before it removes the copy',
          ),
          row(
            'should stop its Vitest and leave nothing after SIGTERM to the tool alone',
          ),
        ],
      },
    },
    {
      name: 'a stopped command is not waited for',
      group: 'mechanism',
      edits: [
        {
          file: PROCESS,
          text: '        failure = error;',
          replacement: '        reject(error);',
        },
      ],
      expect: {
        fails: [
          row(
            'should wait for a command that a signal stops before it removes the copy',
          ),
        ],
      },
    },
    {
      name: "a row that doesn't run in one engine is compared",
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '        .filter((key) => !(key in unrun)),\n',
          replacement: '',
        },
      ],
      expect: {
        fails: [
          row("should not flag a row that doesn't run in another engine"),
        ],
      },
    },
    // The feature proof's three (`reviewer-6`), at the rows of RD-66.
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
        fails: [row('should read a selected row that passes as missed')],
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
          row("should not flag a row that doesn't run in another engine"),
          row(
            'should leave the checkout and the temporary directory as they were after a run',
          ),
          row('should remove a locked copy whose process no longer runs'),
          row(
            'should read a mutation that fails every selected row as expected',
          ),
          row('should judge each engine by its own expectation'),
          row('should run in a browser project'),
          row('should restore each mutation before the next one runs'),
          row('should rebuild after a matching edit and after its restore'),
        ],
      },
    },
    {
      name: 'a survivor is always caught',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "failed.length > 0\n          ? 'caught'\n          : voided.length > 0\n            ? 'void'\n            : 'as expected',",
          replacement: "'caught',",
        },
      ],
      expect: {
        fails: [
          row('should read a survivor that fails no row as expected'),
          row('should judge each engine by its own expectation'),
          row("should read a survivor whose rows don't run as void"),
          row('should restore each mutation before the next one runs'),
        ],
      },
    },
    // The recheck's findings, `recheck-1` to `recheck-4`.
    {
      name: 'an engine that fails unmutated runs on',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: '      if (failure) {',
          replacement: '      if (false) {',
        },
      ],
      expect: {
        fails: [
          row(
            "should exit with 3, not refuse the file, when the unmutated run's browser doesn't start",
          ),
        ],
      },
    },
    {
      name: 'an engine that fails unmutated refuses the file',
      group: 'mechanism',
      edits: [
        {
          file: RUN,
          text: "throw new Error(`unmutated, ${engine}: ${failure.join('\\n')}`);",
          replacement: 'throw new Refusal(`unmutated, ${engine}`, failure);',
        },
      ],
      expect: {
        fails: [
          row(
            "should exit with 3, not refuse the file, when the unmutated run's browser doesn't start",
          ),
        ],
      },
    },
    {
      name: "Vitest's failure is not kept",
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: 'if (result.code === 0 || explained) {',
          replacement: 'if (true) {',
        },
      ],
      expect: {
        fails: [
          row(
            "should exit with 3, not refuse the file, when the unmutated run's browser doesn't start",
          ),
          row("should read a selected row whose browser doesn't start as void"),
        ],
      },
    },
    {
      name: "Vitest's failure is not a row's reason",
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '(errors[file] ?? failure ?? [',
          replacement: '(errors[file] ?? [',
        },
      ],
      expect: {
        fails: [
          row("should read a selected row whose browser doesn't start as void"),
        ],
      },
    },
    {
      name: "the file's commit is the code's commit",
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: '...(fileCommit ? { fileCommit } : {}),',
          replacement: 'fileCommit: commit,',
        },
      ],
      expect: {
        fails: [
          row(
            'should name the commit that holds the file, the config and the runner',
          ),
          row('should name no commit for a file that differs from its commit'),
          row(
            "should name no commit for a runner from another checkout than the file's",
          ),
        ],
      },
    },
    {
      name: "a modified file names its checkout's commit",
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: '  return changed\n    ? undefined',
          replacement: '  return false\n    ? undefined',
        },
      ],
      expect: {
        fails: [
          row('should name no commit for a file that differs from its commit'),
        ],
      },
    },
    {
      name: "the runner's checkout is not compared with the file's",
      group: 'mechanism',
      edits: [
        { file: CLI, text: '    import.meta.dirname,\n', replacement: '' },
      ],
      expect: {
        fails: [
          row(
            "should name no commit for a runner from another checkout than the file's",
          ),
        ],
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
        fails: [
          row("should read a selected row that doesn't run as void"),
          row('should read a survivor whose row the mutation skips as void'),
          row("should read a selected row whose browser doesn't start as void"),
        ],
      },
    },
    {
      name: 'a row that the mutation skips has a verdict',
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: "} else if (next?.status !== 'passed') {",
          replacement: '} else if (next === undefined) {',
        },
      ],
      expect: {
        fails: [
          row('should read a survivor whose row the mutation skips as void'),
        ],
      },
    },
    {
      name: 'options are read outside the failure handling',
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: 'async function main(): Promise<number> {\n  const { positionals, values } = parseArgs({',
          replacement: 'const { positionals, values } = parseArgs({',
        },
        {
          file: CLI,
          text: '  const [command, ...paths] = positionals;\n',
          replacement:
            '  const [command, ...paths] = positionals;\nasync function main(): Promise<number> {\n',
        },
      ],
      expect: {
        fails: [row('should exit with 3 on an unknown option')],
      },
    },
    // The second recheck's findings, `recheck2-1` and `recheck2-3`.
    {
      name: 'a run that selects no test file is a failure outside the tests',
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: '      report.testResults.length === 0 ||\n',
          replacement: '',
        },
        {
          file: VITEST,
          text: '    return report.testResults.some(',
          replacement: '    return report.testResults.every(',
        },
      ],
      expect: {
        fails: [
          row(
            'should refuse a file whose run selects no test file, by its selector',
          ),
        ],
      },
    },
    {
      name: "Vitest's unhandled errors aren't printed",
      group: 'mechanism',
      edits: [
        { file: VITEST, text: "        '--reporter=dot',\n", replacement: '' },
      ],
      expect: {
        fails: [
          row(
            'should judge a run whose rows pass beside an unhandled error, and report the error',
          ),
        ],
      },
    },
    {
      name: "the failure is read from Vitest's standard output",
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: 'const printed = lines(result.stderr);',
          replacement: 'const printed = lines(result.stdout);',
        },
      ],
      expect: {
        fails: [
          row(
            "should exit with 3, not refuse the file, when the unmutated run's browser doesn't start",
          ),
          row("should read a selected row whose browser doesn't start as void"),
        ],
      },
    },
    {
      name: "the reporter's banner is kept",
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: '|⎯|Vitest caught |This might cause ).*$/gmu',
          replacement: ').*$/gmu',
        },
      ],
      expect: {
        fails: [
          row("should read a selected row whose browser doesn't start as void"),
        ],
      },
    },
    {
      name: "the config isn't compared with the file's commit",
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: '    configPath,\n    import.meta.dirname,\n',
          replacement: '    import.meta.dirname,\n',
        },
      ],
      expect: {
        fails: [
          row(
            'should name no commit for a config that differs from its commit',
          ),
        ],
      },
    },
    {
      name: 'an ignored file names a commit',
      group: 'mechanism',
      edits: [
        {
          file: CLI,
          text: "'--porcelain', '--ignored', '--'",
          replacement: "'--porcelain', '--'",
        },
      ],
      expect: {
        fails: [
          row('should name no commit for a file that its checkout ignores'),
        ],
      },
    },
    // RD-66's note of 2026-11-27: a run whose rows ran beside an unhandled
    // error is judged, and the error is reported.
    {
      name: 'an unhandled error beside rows that ran is a failure outside the tests',
      group: 'mechanism',
      edits: [
        {
          file: VITEST,
          text: '        assertionResults.length === 0 && !message,',
          replacement: '        true,',
        },
      ],
      expect: {
        fails: [
          row(
            'should judge a run whose rows pass beside an unhandled error, and report the error',
          ),
        ],
      },
    },
    {
      name: "the summary doesn't name the unmutated run's error",
      group: 'mechanism',
      edits: [
        {
          file: REPORT,
          text: '    ...[...runErrors].flatMap(',
          replacement: '    ...[].flatMap(',
        },
      ],
      expect: {
        fails: [
          row(
            'should judge a run whose rows pass beside an unhandled error, and report the error',
          ),
        ],
      },
    },
  ],
};

export default config;
