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
  code: number;
  stderr: string;
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
  prepare?(repo: string, temp: string): Promise<void>;
  /** A signal sent to the tool's process alone when its log has `after`. */
  interrupt?: Readonly<{ signal: NodeJS.Signals; after: string }>;
}>;

/**
 * Makes a repository from the fixture, runs `mutator run` on `file` there, and
 * reads what it left.
 */
async function mutate(
  file: MutationFile,
  {
    rebuildCommand = ['node', 'build.ts'],
    prepare,
    interrupt,
  }: MutateOptions = {},
): Promise<Result> {
  const root = await mkdtemp(join(tmpdir(), 'mutator-test-'));
  roots.push(root);
  const repo = join(root, 'repo');
  const temp = join(root, 'tmp');
  const log = join(root, 'log');
  const report = join(root, 'report.json');

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
    join(root, 'mutator.config.ts'),
    `export default ${JSON.stringify({
      setup: [
        ['ln', '-s', NODE_MODULES, 'node_modules'],
        ['node', 'build.ts'],
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
    join(root, 'mutations.ts'),
    `export default ${JSON.stringify(file)};\n`,
  );

  await prepare?.(repo, temp);
  const before = await stateOf(repo);
  const { code, stderr } = await new Promise<
    Readonly<{ code: number; stderr: string }>
  >((done) => {
    const child = execFile(
      process.execPath,
      [
        CLI,
        'run',
        join(root, 'mutations.ts'),
        '--config',
        join(root, 'mutator.config.ts'),
        '--report',
        report,
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

  return {
    code,
    stderr,
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
      const result = await mutate({
        runs: [{ dir: '.', tests: ['tests/dom'] }],
        engines: ['chromium'],
        mutations: [
          {
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
              fails: [
                {
                  file: 'tests/dom.browser.test.ts',
                  row: 'should hold its text',
                },
              ],
            },
          },
        ],
      });

      expect(outcomes(result)).toEqual([['chromium', 'as expected']]);
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
