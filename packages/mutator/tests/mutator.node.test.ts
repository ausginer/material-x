/**
 * `mutator`'s command line, run on a repository made from `fixture/` for each
 * test, with a config that selects four engines: `a`, `b` and `c`, which run
 * the fixture's node project and tell themselves apart by the environment, and
 * `chromium`, which runs its browser project.
 */
import { execFile } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Mutation, MutationFile } from '../src/format.ts';
import { differing, type Outcome, type Report } from '../src/report.ts';

const PACKAGE = resolve(import.meta.dirname, '..');
const CLI = join(PACKAGE, 'src/cli.ts');
const NODE_MODULES = resolve(PACKAGE, '../../node_modules');
const TEST_FILE = 'tests/math.node.test.ts';
const TIMEOUT = 120_000;

type Result = Readonly<{
  /** The repository that the run was invoked in. */
  repo: string;
  code: number;
  stderr: string;
  summary?: string;
  /** The processes whose working directory is in the row's directory. */
  processes: number;
  report?: Report;
  /** The builds that ran, by `fixture/build.ts`'s log. */
  builds: number;
  /** What a scratch copy left in the temporary directory. */
  leftovers: readonly string[];
  /** The repository's state after the run. */
  state: string;
}>;

const roots: string[] = [];

afterAll(async () => {
  await Promise.all(
    roots.map(async (root) => await rm(root, { recursive: true, force: true })),
  );
});

const git = async (cwd: string, args: readonly string[]): Promise<string> =>
  await new Promise((done, reject) => {
    execFile('git', [...args], { cwd }, (error, stdout) => {
      if (error) {
        reject(new Error(`git ${args.join(' ')} failed`, { cause: error }));
      } else {
        done(stdout);
      }
    });
  });

/** The repository's head, refs, worktrees and every changed or new file. */
const stateOf = async (repo: string): Promise<string> =>
  (
    await Promise.all(
      [
        ['rev-parse', 'HEAD'],
        ['for-each-ref'],
        ['worktree', 'list', '--porcelain'],
        ['status', '--porcelain', '--ignored'],
      ].map(async (args) => await git(repo, args)),
    )
  ).join('\n');

/** The environment of a run, without the outer Vitest's variables. */
function cleanEnv(extra: Readonly<Record<string, string>>): NodeJS.ProcessEnv {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith('VITEST') && name !== 'NODE_OPTIONS',
    ),
  );
  return { ...env, ...extra };
}

/** The processes whose working directory is under `dir`, read from `/proc`. */
async function processesIn(dir: string): Promise<number> {
  const cwds = await Promise.all(
    (await readdir('/proc'))
      .filter((entry) => /^\d+$/u.test(entry))
      .map(async (pid) => await readlink(`/proc/${pid}/cwd`).catch(() => '')),
  );
  return cwds.filter((cwd) => cwd.startsWith(dir)).length;
}

type MutateOptions = Readonly<{
  rebuildCommand?: readonly string[];
  /** A command that the setup runs after the fixture's own. */
  setup?: readonly string[];
  prepare?(repo: string, temp: string): Promise<void>;
  /** A signal sent to the tool's process alone when its log has `after`. */
  interrupt?: Readonly<{ signal: NodeJS.Signals; after: string }>;
  /**
   * What a second commit adds to the repository, after the fixture's: the file
   * and the config, and with `'runner'` also a copy of the tool's source, which
   * then runs. `prepare` runs after it.
   */
  commit?: 'file' | 'runner';
  /** Options added to the command line. */
  args?: readonly string[];
}>;

/**
 * Makes a repository from the fixture, runs `mutator run` on `file` there, and
 * reads what it left.
 */
async function mutate(
  file: MutationFile,
  {
    rebuildCommand = ['node', 'build.ts'],
    setup,
    prepare,
    interrupt,
    commit,
    args = [],
  }: MutateOptions = {},
): Promise<Result> {
  const root = await mkdtemp(join(tmpdir(), 'mutator-test-'));
  roots.push(root);
  const repo = join(root, 'repo');
  const temp = join(root, 'tmp');
  const log = join(root, 'log');
  const report = join(root, 'report.json');
  const summary = join(root, 'summary.md');
  const files = commit ? repo : root;
  const cli = commit === 'runner' ? join(repo, 'tool/src/cli.ts') : CLI;

  await cp(join(PACKAGE, 'fixture'), repo, { recursive: true });
  await mkdir(temp);
  await git(repo, ['init', '-q']);
  await git(repo, ['add', '-A']);
  await git(repo, [
    '-c',
    'user.name=fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'fixture',
  ]);
  await writeFile(
    join(files, 'mutator.config.ts'),
    `export default ${JSON.stringify({
      setup: [
        ['ln', '-s', NODE_MODULES, 'node_modules'],
        ['node', 'build.ts'],
        ...(setup ? [setup] : []),
      ],
      engines: {
        a: { env: { FIXTURE_ENGINE: 'a' } },
        b: { env: { FIXTURE_ENGINE: 'b' } },
        c: { env: { FIXTURE_ENGINE: 'c' } },
        chromium: { env: { FIXTURE_ENGINE: 'chromium' } },
      },
      rebuilds: [{ files: 'built/**', command: rebuildCommand }],
    })};\n`,
  );
  await writeFile(
    join(files, 'mutations.ts'),
    `export default ${JSON.stringify(file)};\n`,
  );

  if (commit) {
    if (commit === 'runner') {
      await cp(join(PACKAGE, 'src'), join(repo, 'tool/src'), {
        recursive: true,
      });
    }

    await git(repo, ['add', '-A']);
    await git(repo, [
      '-c',
      'user.name=fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'the file',
    ]);
  }

  await prepare?.(repo, temp);
  const before = await stateOf(repo);
  const { code, stderr } = await new Promise<
    Readonly<{ code: number; stderr: string }>
  >((done) => {
    const child = execFile(
      process.execPath,
      [
        cli,
        'run',
        join(files, 'mutations.ts'),
        '--config',
        join(files, 'mutator.config.ts'),
        '--report',
        report,
        '--summary',
        summary,
        ...args,
      ],
      { cwd: repo, env: cleanEnv({ TMPDIR: temp, FIXTURE_LOG: log }) },
      (error, _stdout, err) => {
        done({
          code: (error as { code?: number } | null)?.code ?? 0,
          stderr: err,
        });
      },
    );
    let seen = '';

    if (interrupt) {
      child.stderr!.on('data', (chunk: unknown) => {
        seen += String(chunk);

        if (seen.includes(interrupt.after)) {
          seen = '';
          child.kill(interrupt.signal);
        }
      });
    }
  });
  const after = await stateOf(repo);
  const read = async (path: string): Promise<string | undefined> =>
    await readFile(path, 'utf8').catch(() => undefined);
  const reportText = await read(report);
  const summaryText = await read(summary);

  return {
    repo,
    code,
    stderr,
    ...(summaryText ? { summary: summaryText } : {}),
    processes: await processesIn(root),
    ...(reportText ? { report: JSON.parse(reportText) as Report } : {}),
    builds: ((await read(log)) ?? '').split('\n').filter(Boolean).length,
    leftovers: await readdir(temp),
    state: before === after ? 'unchanged' : after,
  };
}

const fileOf = (
  mutations: readonly Mutation[],
  engines: readonly string[] = ['a'],
): MutationFile => ({
  runs: [{ dir: '.', tests: ['tests/math'] }],
  engines,
  mutations,
});

const CLAMP: Mutation = {
  name: 'clamp ignores its low bound',
  group: 'mechanism',
  edits: [
    { file: 'src/math.ts', text: 'Math.max(value, low)', replacement: 'value' },
  ],
  expect: { fails: [{ file: TEST_FILE, row: 'should clamp low' }] },
};

const GREET: Mutation = {
  name: "a's greeting changes",
  group: 'engine',
  edits: [{ file: 'src/math.ts', text: "'hello, a'", replacement: "'hi, a'" }],
  expect: { fails: [{ file: TEST_FILE, row: 'should greet' }] },
};

/** Breaks the parse of `src/math.ts`, so the node project's test file doesn't load. */
const UNLOADABLE: Mutation['edits'] = [
  {
    file: 'src/math.ts',
    text: 'export function add(',
    replacement: 'export function add(;',
  },
];

const LABEL: Mutation = {
  name: 'a label loses its text',
  group: 'mechanism',
  edits: [
    {
      file: 'src/dom.ts',
      text: 'element.textContent = text;',
      replacement: '',
    },
  ],
  expect: {
    fails: [{ file: 'tests/dom.browser.test.ts', row: 'should hold its text' }],
  },
};

/** Stops the fixture's browser project from starting its browser. */
const NO_BROWSER = {
  file: 'vitest.config.ts',
  text: "launchOptions: { channel: 'chromium' }",
  replacement: "launchOptions: { executablePath: '/nonexistent/chrome' }",
} as const;

const browserFile = (mutations: readonly Mutation[]): MutationFile => ({
  runs: [{ dir: '.', tests: ['tests/dom'] }],
  engines: ['chromium'],
  mutations,
});

/** The summary's lines for a row without a verdict, and its first reason. */
const unrunLines = (result: Result): string => {
  const [mutation] = result.report!.legs[0]!.mutations;
  const [key] = mutation!.voided;
  return `- void, did not run: ${key}\n    - ${mutation!.unrun[key!]![0]}\n`;
};

const outcomes = ({
  report,
}: Result): ReadonlyArray<readonly [string, Outcome]> =>
  report!.legs.flatMap(({ engine, mutations }) =>
    mutations.map(({ outcome }) => [engine, outcome] as const),
  );

describe('mutator run, refusals', () => {
  it(
    'should refuse each stale edit by name before anything runs',
    async () => {
      const result = await mutate(
        fileOf([
          {
            ...CLAMP,
            name: 'none',
            edits: [{ file: 'src/math.ts', text: 'absent', replacement: '' }],
          },
          {
            ...CLAMP,
            name: 'two',
            edits: [{ file: 'src/math.ts', text: 'return', replacement: '' }],
          },
        ]),
      );

      expect([result.code, result.builds, result.report]).toEqual([
        2,
        0,
        undefined,
      ]);
      expect(result.stderr).toContain(
        'none: in src/math.ts, the text occurs 0 times',
      );
      expect(result.stderr).toContain(
        'two: in src/math.ts, the text occurs 4 times',
      );
    },
    TIMEOUT,
  );

  it(
    'should refuse a selector that covers no row before any mutation runs',
    async () => {
      const result = await mutate(
        fileOf([
          {
            name: 'built value',
            group: 'other',
            edits: [{ file: 'built/value.ts', text: '2', replacement: '3' }],
            expect: { fails: [{ file: TEST_FILE, row: 'should not exist' }] },
          },
        ]),
      );

      expect([result.code, result.builds]).toEqual([2, 1]);
      expect(result.stderr).toContain(
        'built value, a: tests/math.node.test.ts > should not exist covers no row that ran',
      );
    },
    TIMEOUT,
  );

  it(
    'should refuse a file whose run selects no test file, by its selector',
    async () => {
      const result = await mutate({
        ...fileOf([CLAMP]),
        runs: [{ dir: '.', tests: ['tests/nothing'] }],
      });

      expect([result.code, result.report]).toEqual([2, undefined]);
      expect(result.stderr).toContain(
        'clamp ignores its low bound, a: tests/math.node.test.ts > should clamp low covers no row that ran',
      );
    },
    TIMEOUT,
  );
});

describe('mutator run, failures outside the tests', () => {
  it(
    'should exit with 3 on an unknown option',
    async () => {
      const result = await mutate(fileOf([CLAMP]), {
        args: ['--workdir', '.'],
      });

      expect([result.code, result.report]).toEqual([3, undefined]);
      expect(result.stderr).toContain("Unknown option '--workdir'");
    },
    TIMEOUT,
  );

  it(
    "should exit with 3, not refuse the file, when the unmutated run's browser doesn't start",
    async () => {
      const result = await mutate(browserFile([LABEL]), {
        prepare: async (repo) => {
          const config = join(repo, NO_BROWSER.file);
          await writeFile(
            config,
            (await readFile(config, 'utf8')).replace(
              NO_BROWSER.text,
              NO_BROWSER.replacement,
            ),
          );
          await git(repo, [
            '-c',
            'user.name=fixture',
            '-c',
            'user.email=fixture@example.invalid',
            'commit',
            '-qam',
            'no browser',
          ]);
        },
      });

      expect([result.code, result.report]).toEqual([3, undefined]);
      expect(result.stderr).toContain(
        'unmutated, chromium: Vitest exited with 1 and reported no failed row:',
      );
      expect(result.stderr).toContain('Failed to launch chromium');
      expect(result.stderr).not.toContain('JSON report written');
    },
    TIMEOUT,
  );

  it(
    "should give Vitest's unhandled error as the reason when every row of the unmutated run passes",
    async () => {
      const result = await mutate(fileOf([CLAMP]), {
        prepare: async (repo) => {
          const rows = join(repo, TEST_FILE);
          await writeFile(
            rows,
            `${await readFile(rows, 'utf8')}\nit('should pass and leave a rejection unhandled', () => {\n  void Promise.reject(new Error('left unhandled'));\n});\n`,
          );
          await git(repo, [
            '-c',
            'user.name=fixture',
            '-c',
            'user.email=fixture@example.invalid',
            'commit',
            '-qam',
            'an unhandled rejection',
          ]);
        },
      });

      expect([result.code, result.report]).toEqual([3, undefined]);
      expect(result.stderr).toContain(
        'unmutated, a: Vitest exited with 1 and reported no failed row:',
      );
      expect(result.stderr).toContain('Error: left unhandled');
      expect(result.stderr).not.toContain('JSON report written');
    },
    TIMEOUT,
  );
});

describe('mutator run, the invoking checkout', () => {
  it(
    'should leave the checkout and the temporary directory as they were after a run',
    async () => {
      const result = await mutate(fileOf([CLAMP]));

      expect([result.code, result.state, result.leftovers]).toEqual([
        0,
        'unchanged',
        [],
      ]);
    },
    TIMEOUT,
  );

  it(
    'should leave them as they were after a run that fails midway',
    async () => {
      const result = await mutate(
        fileOf([
          CLAMP,
          {
            ...CLAMP,
            name: 'built value',
            edits: [{ file: 'built/value.ts', text: '2', replacement: '3' }],
          },
        ]),
        { rebuildCommand: ['node', '-e', 'process.exit(1)'] },
      );

      expect([result.code, result.state, result.leftovers]).toEqual([
        3,
        'unchanged',
        [],
      ]);
    },
    TIMEOUT,
  );

  it(
    'should stop its Vitest and leave nothing after SIGTERM to the tool alone',
    async () => {
      const result = await mutate(fileOf([CLAMP]), {
        interrupt: { signal: 'SIGTERM', after: `${CLAMP.name}, a` },
      });

      expect([
        result.code,
        result.report,
        result.state,
        result.leftovers,
        result.processes,
      ]).toEqual([143, undefined, 'unchanged', [], 0]);
    },
    TIMEOUT,
  );

  it(
    'should wait for a command that a signal stops before it removes the copy',
    async () => {
      // Once it prints its line, SIGTERM makes it write into the copy half a
      // second later, recreating the copy's directory if it is gone. It ends by
      // itself after 5 s.
      const lingering = [
        'node',
        '-e',
        [
          "const { mkdirSync, writeFileSync } = require('node:fs');",
          "const { join } = require('node:path');",
          'const dir = process.cwd();',
          "process.on('SIGTERM', () => setTimeout(() => {",
          '  mkdirSync(dir, { recursive: true });',
          "  writeFileSync(join(dir, 'late'), '');",
          '  process.exit(1);',
          '}, 500));',
          'setTimeout(() => process.exit(0), 5000);',
          "console.log('lingering');",
        ].join('\n'),
      ];
      const result = await mutate(fileOf([CLAMP]), {
        setup: lingering,
        interrupt: { signal: 'SIGTERM', after: 'lingering\n' },
      });

      expect([
        result.code,
        result.state,
        result.leftovers,
        result.processes,
      ]).toEqual([143, 'unchanged', [], 0]);
    },
    TIMEOUT,
  );
});

describe('mutator run, a copy that an earlier run left', () => {
  it(
    'should remove a locked copy whose process no longer runs',
    async () => {
      let stale = '';
      const result = await mutate(fileOf([CLAMP]), {
        prepare: async (repo, temp) => {
          // The process of a run that was killed: one that has exited.
          const pid = await new Promise<number>((done) => {
            const child = execFile('true', () => {
              done(child.pid!);
            });
          });
          stale = join(temp, 'mutator-stale', 'copy');
          await git(repo, [
            'worktree',
            'add',
            '--quiet',
            '--detach',
            '--lock',
            '--reason',
            `mutator ${pid}`,
            stale,
            'HEAD',
          ]);
        },
      });

      expect([result.code, result.leftovers]).toEqual([0, []]);
      expect(result.state).not.toContain(stale);
    },
    TIMEOUT,
  );
});

describe('mutator run, outcomes', () => {
  it(
    'should read a mutation that fails every selected row as expected',
    async () => {
      expect(outcomes(await mutate(fileOf([CLAMP])))).toEqual([
        ['a', 'as expected'],
      ]);
    },
    TIMEOUT,
  );

  it(
    'should read a selected row that passes as missed and fail the run',
    async () => {
      const result = await mutate(
        fileOf([
          {
            ...CLAMP,
            expect: {
              fails: [
                { file: TEST_FILE, row: 'should clamp low' },
                { file: TEST_FILE, row: 'should clamp high' },
              ],
            },
          },
        ]),
      );

      expect([result.code, outcomes(result)]).toEqual([1, [['a', 'missed']]]);
      expect(result.report!.legs[0]!.mutations[0]!.missed).toEqual([
        'tests/math.node.test.ts > clamp should clamp high',
      ]);
    },
    TIMEOUT,
  );

  it(
    'should read a survivor that fails rows as caught',
    async () => {
      const result = await mutate(
        fileOf([
          { ...CLAMP, expect: { survives: 'no row reads the low bound' } },
        ]),
      );

      expect([result.code, outcomes(result)]).toEqual([1, [['a', 'caught']]]);
    },
    TIMEOUT,
  );

  it(
    'should read a survivor that fails no row as expected',
    async () => {
      const result = await mutate(
        fileOf([
          {
            name: 'unused returns another text',
            group: 'doubted',
            edits: [
              { file: 'src/math.ts', text: "'unused'", replacement: "'other'" },
            ],
            expect: { survives: 'no row calls it' },
          },
        ]),
      );

      expect(outcomes(result)).toEqual([['a', 'as expected']]);
    },
    TIMEOUT,
  );

  it(
    'should read a selected row that fails unmutated as void',
    async () => {
      const result = await mutate(
        fileOf(
          [
            {
              ...CLAMP,
              expect: {
                fails: [
                  { file: TEST_FILE, row: 'should clamp low' },
                  { file: TEST_FILE, row: 'should be a' },
                ],
              },
            },
          ],
          ['b'],
        ),
      );

      expect([result.code, outcomes(result)]).toEqual([1, [['b', 'void']]]);
    },
    TIMEOUT,
  );

  it(
    "should read a selected row that doesn't run as void, with its file's reason",
    async () => {
      const result = await mutate(
        fileOf([{ ...CLAMP, name: 'math does not load', edits: UNLOADABLE }]),
      );
      const [mutation] = result.report!.legs[0]!.mutations;

      expect([result.code, outcomes(result), mutation!.failed]).toEqual([
        1,
        [['a', 'void']],
        [],
      ]);
      expect(mutation!.voided).toEqual([
        'tests/math.node.test.ts > clamp should clamp low',
      ]);
      expect(mutation!.unrun[mutation!.voided[0]!]!.join('\n')).toContain(
        'src/math.ts',
      );
      expect(result.summary).toContain(unrunLines(result));
    },
    TIMEOUT,
  );

  it(
    "should read a survivor whose rows don't run as void",
    async () => {
      const result = await mutate(
        fileOf([
          {
            name: 'math does not load',
            group: 'other',
            edits: UNLOADABLE,
            expect: { survives: 'no row reads the parse' },
          },
        ]),
      );

      expect([result.code, outcomes(result)]).toEqual([1, [['a', 'void']]]);
      expect(result.report!.legs[0]!.mutations[0]!.voided).toHaveLength(7);
    },
    TIMEOUT,
  );

  it(
    'should read a survivor whose row the mutation skips as void',
    async () => {
      const result = await mutate(
        fileOf([
          {
            name: 'clamp low is skipped',
            group: 'other',
            edits: [
              {
                file: TEST_FILE,
                text: "it('should clamp low'",
                replacement: "it.skip('should clamp low'",
              },
            ],
            expect: { survives: 'a skipped row reads nothing' },
          },
        ]),
      );

      expect([
        result.code,
        outcomes(result),
        result.report!.legs[0]!.mutations[0]!.unrun,
      ]).toEqual([
        1,
        [['a', 'void']],
        {
          'tests/math.node.test.ts > clamp should clamp low': [
            'the row was skipped',
          ],
        },
      ]);
      expect(result.summary).toContain(unrunLines(result));
    },
    TIMEOUT,
  );

  it(
    "should read a selected row whose browser doesn't start as void, with Vitest's output",
    async () => {
      const result = await mutate(
        browserFile([
          { ...LABEL, name: 'the browser does not start', edits: [NO_BROWSER] },
        ]),
      );
      const [mutation] = result.report!.legs[0]!.mutations;

      expect([result.code, outcomes(result)]).toEqual([
        1,
        [['chromium', 'void']],
      ]);
      expect(mutation!.unrun[mutation!.voided[0]!]!.slice(0, 2)).toEqual([
        'Vitest exited with 1 and reported no failed row:',
        expect.stringContaining('Failed to launch chromium'),
      ]);
      expect(result.summary).toContain(unrunLines(result));
    },
    TIMEOUT,
  );

  it(
    'should judge each engine by its own expectation when it gives one',
    async () => {
      const result = await mutate(
        fileOf(
          [
            {
              ...GREET,
              byEngine: {
                b: {
                  expect: { survives: "b doesn't greet a" },
                  reason: 'the branch runs in a',
                },
              },
            },
          ],
          ['a', 'b'],
        ),
      );

      expect([
        result.code,
        outcomes(result),
        differing([result.report!]),
      ]).toEqual([
        0,
        [
          ['a', 'as expected'],
          ['b', 'as expected'],
        ],
        [],
      ]);
    },
    TIMEOUT,
  );

  it(
    'should run in a browser project',
    async () => {
      expect(outcomes(await mutate(browserFile([LABEL])))).toEqual([
        ['chromium', 'as expected'],
      ]);
    },
    TIMEOUT,
  );
});

describe('mutator run, engines', () => {
  it(
    'should flag a mutation that fails other rows in another engine',
    async () => {
      const result = await mutate(fileOf([GREET], ['a', 'b']));

      expect([result.code, differing([result.report!])]).toEqual([
        1,
        [GREET.name],
      ]);
    },
    TIMEOUT,
  );

  it(
    "should flag a difference between engines that another engine's own expectation doesn't explain",
    async () => {
      const name = "c's greeting changes";
      const result = await mutate(
        fileOf(
          [
            {
              name,
              group: 'engine',
              edits: [
                {
                  file: 'src/math.ts',
                  text: "return engine === 'a'",
                  replacement: "return engine === 'c' ? 'hi' : engine === 'a'",
                },
              ],
              expect: { fails: [{ file: TEST_FILE, row: 'should greet' }] },
              byEngine: {
                a: {
                  expect: { survives: "a's branch is unchanged" },
                  reason: 'the edit takes another branch in a',
                },
              },
            },
          ],
          ['a', 'b', 'c'],
        ),
      );

      expect([result.code, differing([result.report!])]).toEqual([1, [name]]);
    },
    TIMEOUT,
  );

  it(
    'should not flag a row that another engine skips',
    async () => {
      const result = await mutate(
        fileOf(
          [
            {
              name: 'add subtracts',
              group: 'mechanism',
              edits: [
                { file: 'src/math.ts', text: 'a + b', replacement: 'a - b' },
              ],
              expect: { fails: [{ file: TEST_FILE, row: 'should add' }] },
            },
          ],
          ['a', 'b'],
        ),
      );

      expect(
        result.report!.legs.map(({ mutations }) => mutations[0]!.failed.length),
      ).toEqual([2, 1]);
      expect(differing([result.report!])).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    "should not flag a row that doesn't run in another engine",
    async () => {
      const result = await mutate(
        fileOf(
          [
            {
              ...CLAMP,
              edits: [
                ...CLAMP.edits,
                {
                  file: TEST_FILE,
                  text: "const engine = process.env['FIXTURE_ENGINE'] ?? 'a';",
                  replacement:
                    "const engine = process.env['FIXTURE_ENGINE'] ?? 'a';\nif (engine === 'b') throw new Error('b does not load');",
                },
              ],
            },
          ],
          ['a', 'b'],
        ),
      );

      expect(outcomes(result)).toEqual([
        ['a', 'as expected'],
        ['b', 'void'],
      ]);
      expect(differing([result.report!])).toEqual([]);
    },
    TIMEOUT,
  );
});

describe('mutator run, restore', () => {
  it(
    'should restore each mutation before the next one runs',
    async () => {
      const result = await mutate(
        fileOf([
          CLAMP,
          {
            name: 'unused returns another text',
            group: 'doubted',
            edits: [
              { file: 'src/math.ts', text: "'unused'", replacement: "'other'" },
            ],
            expect: { survives: 'no row calls it' },
          },
        ]),
      );

      expect(outcomes(result)).toEqual([
        ['a', 'as expected'],
        ['a', 'as expected'],
      ]);
    },
    TIMEOUT,
  );
});

describe('mutator run, rebuilds', () => {
  it(
    'should rebuild after a matching edit and after its restore',
    async () => {
      const result = await mutate(
        fileOf([
          {
            name: 'the built value changes',
            group: 'other',
            edits: [{ file: 'built/value.ts', text: '2', replacement: '3' }],
            expect: {
              fails: [{ file: TEST_FILE, row: 'should read the built value' }],
            },
          },
        ]),
      );

      expect([result.builds, outcomes(result)]).toEqual([
        3,
        [['a', 'as expected']],
      ]);
    },
    TIMEOUT,
  );

  it(
    "should not rebuild for an edit that doesn't match",
    async () => {
      expect((await mutate(fileOf([CLAMP]))).builds).toBe(1);
    },
    TIMEOUT,
  );
});

describe('mutator run, the summary', () => {
  it(
    'should name the commit that holds the file, the config and the runner, apart from the code',
    async () => {
      const result = await mutate(fileOf([CLAMP]), {
        commit: 'runner',
        args: ['--ref', 'HEAD~1'],
      });
      const [code, file] = (
        await git(result.repo, ['rev-parse', 'HEAD~1', 'HEAD'])
      )
        .trim()
        .split('\n');

      expect([result.code, result.report!.fileCommit]).toEqual([0, file]);
      expect(result.summary).toContain(
        `The code at ${code}, the file and the runner at ${file}, in a.`,
      );
    },
    TIMEOUT,
  );

  it(
    'should name no commit for a file that differs from its commit',
    async () => {
      const result = await mutate(fileOf([CLAMP]), {
        commit: 'runner',
        prepare: async (repo) => {
          await writeFile(
            join(repo, 'mutations.ts'),
            `export default ${JSON.stringify(fileOf([{ ...CLAMP, name: 'changed' }]))};\n`,
          );
        },
      });

      expect([result.code, result.report!.fileCommit]).toEqual([0, undefined]);
      expect(result.summary).toContain(
        'the file and the runner at no commit that holds them as they ran,',
      );
    },
    TIMEOUT,
  );

  it(
    'should name no commit for a config that differs from its commit',
    async () => {
      const result = await mutate(fileOf([CLAMP]), {
        commit: 'runner',
        prepare: async (repo) => {
          const config = join(repo, 'mutator.config.ts');
          await writeFile(
            config,
            `${await readFile(config, 'utf8')}// modified\n`,
          );
        },
      });

      expect([result.code, result.report!.fileCommit]).toEqual([0, undefined]);
    },
    TIMEOUT,
  );

  it(
    'should name no commit for a file that its checkout ignores',
    async () => {
      const result = await mutate(fileOf([CLAMP]), {
        commit: 'runner',
        prepare: async (repo) => {
          await git(repo, ['rm', '-q', '--cached', 'mutations.ts']);
          await writeFile(join(repo, '.git/info/exclude'), 'mutations.ts\n');
          await git(repo, [
            '-c',
            'user.name=fixture',
            '-c',
            'user.email=fixture@example.invalid',
            'commit',
            '-qm',
            'the file ignored',
          ]);
        },
      });

      expect([result.code, result.report!.fileCommit]).toEqual([0, undefined]);
    },
    TIMEOUT,
  );

  it(
    "should name no commit for a runner from another checkout than the file's",
    async () => {
      const result = await mutate(fileOf([CLAMP]), { commit: 'file' });

      expect([result.code, result.report!.fileCommit]).toEqual([0, undefined]);
    },
    TIMEOUT,
  );
});
