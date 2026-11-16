// Runs `baselines.yml`'s `propose` steps, read from the workflow file, against
// each case of the handoff's `RF-38` witness, in a scratch directory that it
// removes afterwards. `gh` is a stub that logs its arguments; the remote is a
// local bare repository reached through `file://`.
//
//   node .plan/ci-verification-1/checks/propose-witness.ts

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { parse } from 'yaml';

const run = promisify(execFile);

type Step = Readonly<{ name?: string; run?: string }>;
type Case = Readonly<{
  name: string;
  // Files of the recorded commit: content, or a symbolic link's target.
  commit: Readonly<Record<string, string | { link: string }>>;
  // Artifact entries under `tree/`: content, or a symbolic link's target.
  artifact: Readonly<Record<string, Buffer | { link: string }>>;
}>;

const workflow = parse(
  await readFile('.github/workflows/baselines.yml', 'utf8'),
);
const steps: readonly Step[] = workflow.jobs.propose.steps;
const accept = steps.find(
  (step) => step.name === 'Accept only baseline PNG files',
)!.run!;
const propose = steps.find((step) => step.name === 'Propose')!.run!;

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (text: string): Buffer =>
  Buffer.concat([signature, Buffer.from(text)]);
const baseline = 'packages/x/tests/__screenshots__/a.png';

const root = await mkdtemp(join(tmpdir(), 'propose-witness-'));
const marker = join(root, 'PAYLOAD-RAN');
// reviewer-1's payload: a git configuration whose `core.fsmonitor` runs a command.
const payload = `[core]\n\tfsmonitor = "echo PAYLOAD-RAN >&2; touch ${marker}; false"\n`;

const cases: readonly Case[] = [
  {
    name: '1a. symbolic link at an accepted path to .git/config; the payload as reviewer-1 sent it',
    commit: { [baseline]: { link: '../../../../.git/config' } },
    artifact: { [baseline]: Buffer.from(payload) },
  },
  {
    name: '1b. symbolic link at an accepted path to .git/config; the payload behind a PNG signature',
    commit: { [baseline]: { link: '../../../../.git/config' } },
    artifact: { [baseline]: png(`\n${payload}`) },
  },
  {
    name: '2. symbolic link at a directory component of an accepted path',
    commit: {
      'packages/x/tests/__screenshots__': { link: '../../../.git' },
      README: 'r\n',
    },
    artifact: { [baseline]: png('image') },
  },
  {
    name: "3. an artifact file that isn't a PNG",
    commit: { README: 'r\n' },
    artifact: { [baseline]: Buffer.from('not an image\n') },
  },
  {
    name: '4. an artifact entry that is itself a symbolic link, to a PNG outside the artifact',
    commit: { README: 'r\n' },
    artifact: { [baseline]: { link: join(root, 'outside.png') } },
  },
  {
    name: '5. one ordinary changed baseline',
    commit: { [baseline]: 'old', 'packages/x/src/index.ts': 'export {};\n' },
    artifact: { [baseline]: png('new image') },
  },
];

async function git(cwd: string, ...args: string[]): Promise<string> {
  return (await run('git', args, { cwd })).stdout.trim();
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
    .slice(0, 16);
}

async function exists(path: string): Promise<boolean> {
  return readdir(dirname(path)).then((names) =>
    names.includes(path.slice(dirname(path).length + 1)),
  );
}

await writeFile(join(root, 'outside.png'), png('outside'));
await mkdir(join(root, 'bin'));
await writeFile(join(root, 'bin/gh'), '#!/bin/sh\necho "gh $*" >> "$GH_LOG"\n');
await chmod(join(root, 'bin/gh'), 0o755);

// The configuration that `git init --bare --template=` writes, for comparison.
await run('git', [
  'init',
  '-q',
  '--bare',
  '--template=',
  join(root, 'reference.git'),
]);
const referenceConfig = await sha256(join(root, 'reference.git/config'));

console.log(
  `git ${(await run('git', ['--version'])).stdout.trim().replace('git version ', '')}`,
);
console.log(`reference bare config sha256: ${referenceConfig}`);

for (const [index, testCase] of cases.entries()) {
  const dir = join(root, `case-${index}`);
  const work = join(dir, 'work');
  const runner = join(dir, 'runner');
  const proposal = join(runner, 'proposal');
  await mkdir(work, { recursive: true });
  await mkdir(join(dir, 'workspace'));
  await mkdir(proposal, { recursive: true });

  await git(work, 'init', '-q', '-b', 'ci/x');
  for (const [path, content] of Object.entries(testCase.commit)) {
    await mkdir(dirname(join(work, path)), { recursive: true });
    await (typeof content === 'string'
      ? writeFile(join(work, path), content)
      : symlink(content.link, join(work, path)));
  }
  await git(work, 'add', '-A');
  await git(
    work,
    '-c',
    'user.name=t',
    '-c',
    'user.email=t@t',
    'commit',
    '-qm',
    'recorded',
  );
  const sha = await git(work, 'rev-parse', 'HEAD');
  await run('git', ['clone', '-q', '--bare', work, join(dir, 'origin.git')]);
  const refsBefore = await git(join(dir, 'origin.git'), 'for-each-ref');

  await writeFile(
    join(proposal, 'files.txt'),
    `${Object.keys(testCase.artifact).join('\n')}\n`,
  );
  await writeFile(
    join(proposal, 'environment.txt'),
    'image=ubuntu24 0\nprocessor=p\nchromium=0\n',
  );
  for (const [path, content] of Object.entries(testCase.artifact)) {
    const file = join(proposal, 'tree', path);
    await mkdir(dirname(file), { recursive: true });
    await (Buffer.isBuffer(content)
      ? writeFile(file, content)
      : symlink(content.link, file));
  }

  const env = {
    ...process.env,
    PATH: `${join(root, 'bin')}:${process.env.PATH}`,
    GH_LOG: join(dir, 'gh.log'),
    GH_TOKEN: 'token',
    GH_REPO: 'owner/repo',
    GITHUB_SERVER_URL: `file://${dir}`,
    GITHUB_REPOSITORY: 'origin.git',
    GITHUB_STEP_SUMMARY: join(dir, 'summary.md'),
    RUNNER_TEMP: runner,
    RUN_URL: 'https://example.invalid/run',
    SHA: sha,
    TARGET: 'ci/x',
  };

  console.log(`\n## ${testCase.name}`);
  // The shell GitHub's log shows for a `run` step with no `shell`: `bash -e {0}`.
  for (const [name, script] of [
    ['Accept only baseline PNG files', accept],
    ['Propose', propose],
  ]) {
    const result = await run('bash', ['-e', '-c', script], {
      cwd: join(dir, 'workspace'),
      env,
    }).then(
      ({ stdout, stderr }) => ({ code: 0, output: stdout + stderr }),
      (error: { code: number; stdout: string; stderr: string }) => ({
        code: error.code,
        output: error.stdout + error.stderr,
      }),
    );
    console.log(`step "${name}": exit ${result.code}`);
    for (const line of result.output.trim().split('\n').filter(Boolean)) {
      console.log(`  | ${line}`);
    }
    if (result.code !== 0) {
      break;
    }
  }

  const repo = join(runner, 'repo.git');
  const repoExists = await exists(repo);
  console.log(`job git directory exists: ${repoExists}`);
  if (repoExists) {
    console.log(
      `  config sha256: ${await sha256(join(repo, 'config'))} (reference ${referenceConfig})`,
    );
    console.log(
      `  hooks directory: ${(await exists(join(repo, 'hooks'))) ? 'present' : 'absent'}`,
    );
  }
  console.log(`payload marker exists: ${await exists(marker)}`);
  console.log(
    `gh calls: ${(await exists(env.GH_LOG)) ? (await readFile(env.GH_LOG, 'utf8')).trim().replaceAll('\n', ' | ') : 'none'}`,
  );
  const refsAfter = await git(join(dir, 'origin.git'), 'for-each-ref');
  console.log(`origin refs changed: ${refsAfter !== refsBefore}`);

  const proposed = refsAfter.includes('refs/heads/baselines/ci/x');
  if (proposed) {
    const origin = join(dir, 'origin.git');
    console.log(
      `  baselines/ci/x parents: ${await git(origin, 'log', '-1', '--format=%P', 'baselines/ci/x')} (recorded ${sha})`,
    );
    console.log(
      `  commit: ${await git(origin, 'log', '-1', '--format=%an <%ae> %s', 'baselines/ci/x')}`,
    );
    console.log(
      `  entries changed:\n    ${(await git(origin, 'diff-tree', '-r', '--no-commit-id', 'baselines/ci/x')).replaceAll('\n', '\n    ')}`,
    );
    const blob = await run(
      'git',
      ['cat-file', 'blob', `baselines/ci/x:${baseline}`],
      {
        cwd: origin,
        encoding: 'buffer',
      },
    );
    console.log(
      `  blob equals the artifact file: ${blob.stdout.equals(testCase.artifact[baseline] as Buffer)}`,
    );
  }
}

await rm(root, { recursive: true, force: true });
console.log(`\nscratch directory removed: ${!(await exists(root))}`);
