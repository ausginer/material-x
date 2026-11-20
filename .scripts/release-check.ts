/**
 * The release workflow's checks of one `@ydinjs` package (`repo:RD-27`): the
 * release that a tag or a dispatched check names, the tagged commit, the
 * registry, the packed tarball, and the tarball as a consumer installs it.
 * Every failed check of a command is reported, each under its check's name,
 * and the command then exits non-zero.
 *
 * - `release --tag <tag> --commit <sha>`: steps 1 and 2 of the workflow's
 *   `prepare` job for a tag push. It reads a full-history checkout with
 *   `origin/main`, `GITHUB_REPOSITORY`, and a token that `gh` reads.
 * - `release --package <name>`: the same for a dispatched check, where `<name>`
 *   follows `@ydinjs/`. The version is the manifest's, and the commit isn't
 *   checked, because a check runs before the tag exists.
 * - `package --directory <dir> --tarball <file>`: steps 6 and 7, on the tarball
 *   that `aube pack` wrote. It writes `<file>.sha256` in `sha256sum`'s format.
 * - `local <name>`: what `just release-check` runs. It builds the package, runs
 *   its `size` script if it has one, packs it into a temporary directory, and
 *   runs `package` on the tarball.
 *
 * The registry is read over HTTPS from the endpoint that `npm view` reads, and
 * the Actions API through `gh`. It writes `name`, `directory`, `version`,
 * `dist-tag` and `sha256` to `GITHUB_OUTPUT`, and what it checked to
 * `GITHUB_STEP_SUMMARY`, when those are set.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFile,
  glob,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { type Api, ghApi } from './ci-scope.ts';

export type { Api };

const ROOT = fileURLToPath(new URL('../', import.meta.url));

const SCOPE = '@ydinjs/';

/** The URL that trusted publishing compares with the repository. */
export const REPOSITORY_URL = 'git+https://github.com/ausginer/material-x.git';

/** The files that every pack holds, whatever its manifest's `files` says. */
const REQUIRED_FILES: readonly string[] = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
];

/** A directory that holds sources, tests or records, at any depth. */
const EXCLUDED_DIRECTORIES: ReadonlySet<string> = new Set([
  'src',
  'tests',
  '.plan',
]);

const DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

export type CheckName =
  | 'tag'
  | 'package'
  | 'version'
  | 'main'
  | 'verify'
  | 'registry-version'
  | 'latest'
  | 'pack-required'
  | 'pack-files'
  | 'pack-excluded'
  | 'changelog'
  | 'repository-url'
  | 'repository-directory'
  | 'access'
  | 'private'
  | 'dependency'
  | 'consumer';

export type Problem = Readonly<{ check: CheckName; message: string }>;

export type Manifest = Readonly<{
  name?: string;
  version?: string;
  private?: boolean;
  files?: readonly string[];
  repository?: string | Readonly<{ url?: string; directory?: string }>;
  publishConfig?: Readonly<{ access?: string }>;
  scripts?: Readonly<Record<string, string>>;
  dependencies?: Readonly<Record<string, string>>;
  peerDependencies?: Readonly<Record<string, string>>;
  optionalDependencies?: Readonly<Record<string, string>>;
  exports?: string | Readonly<Record<string, unknown>>;
}>;

/** The registry's abbreviated document for one package name. */
export type Packument = Readonly<{
  'dist-tags': Readonly<Record<string, string>>;
  versions: Readonly<Record<string, unknown>>;
}>;

/** The registry's document for a name, or `null` if the name doesn't exist. */
export type Registry = (name: string) => Promise<Packument | null>;

export type DistTag = 'latest' | 'next';

export type Release = Readonly<{
  name: string;
  version: string;
  /** The package's directory, relative to the repository root. */
  directory: string;
  distTag: DistTag;
}>;

export type ReleaseResult = Readonly<{
  /** `null` when the package or its version can't be read. */
  release: Release | null;
  problems: readonly Problem[];
}>;

/** The tarball's paths, relative to its `package/` directory, and two of its files. */
export type Pack = Readonly<{
  files: readonly string[];
  manifest: Manifest;
  /** `null` when the pack holds no `CHANGELOG.md`. */
  changelog: string | null;
}>;

type Version = Readonly<{
  release: readonly number[];
  prerelease: readonly string[];
}>;

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-z-][\da-z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-z-][\da-z-]*))*))?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?$/iu;

function parseVersion(text: string): Version | null {
  const match = SEMVER.exec(text);

  return (
    match && {
      release: [Number(match[1]), Number(match[2]), Number(match[3])],
      prerelease: match[4]?.split('.') ?? [],
    }
  );
}

function compareIdentifiers(a: string, b: string): number {
  const isANumeric = /^\d+$/u.test(a);
  const isBNumeric = /^\d+$/u.test(b);

  if (isANumeric && isBNumeric) {
    return Number(a) - Number(b);
  }

  // A numeric identifier has lower precedence than an alphanumeric one.
  if (isANumeric !== isBNumeric) {
    return isANumeric ? -1 : 1;
  }

  return a.localeCompare(b, 'en');
}

/** Semver precedence: negative when `a` is lower, positive when higher. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  if (!left || !right) {
    throw new TypeError(`Not a semver version: ${left ? b : a}`);
  }

  for (let i = 0; i < 3; i++) {
    const difference = left.release[i]! - right.release[i]!;

    if (difference !== 0) {
      return difference;
    }
  }

  // A version without a prerelease part is higher than one with it.
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return right.prerelease.length - left.prerelease.length;
  }

  const length = Math.min(left.prerelease.length, right.prerelease.length);

  for (let i = 0; i < length; i++) {
    const difference = compareIdentifiers(
      left.prerelease[i]!,
      right.prerelease[i]!,
    );

    if (difference !== 0) {
      return difference;
    }
  }

  return left.prerelease.length - right.prerelease.length;
}

async function readJSON(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

export type WorkspacePackage = Readonly<{
  directory: string;
  manifest: Manifest;
}>;

/** The workspace package of the root's `workspaces` whose manifest has the name. */
export async function findWorkspacePackage(
  root: string,
  name: string,
): Promise<WorkspacePackage | null> {
  const { workspaces = [] } = (await readJSON(join(root, 'package.json'))) as {
    workspaces?: readonly string[];
  };

  const paths = await Array.fromAsync(
    glob(
      workspaces.map((pattern) => posix.join(pattern, 'package.json')),
      { cwd: root },
    ),
  );
  const packages = await Promise.all(
    paths.map(async (path) => ({
      directory: posix.dirname(path),
      manifest: (await readJSON(join(root, path))) as Manifest,
    })),
  );

  return packages.find(({ manifest }) => manifest.name === name) ?? null;
}

function toRelease(
  name: string,
  version: string,
  directory: string,
  parsed: Version,
): Release {
  return {
    name,
    version,
    directory,
    distTag: parsed.prerelease.length > 0 ? 'next' : 'latest',
  };
}

/**
 * Step 1 for a tag push: the package and the version that the tag
 * `@ydinjs/<name>@<version>` names, where the package is a workspace package
 * whose manifest has that version.
 */
export async function readTagRelease(
  root: string,
  tag: string,
): Promise<ReleaseResult> {
  const match = /^(@ydinjs\/[^@/]+)@(.+)$/u.exec(tag);
  const parsed = match && parseVersion(match[2]!);

  if (!match || !parsed) {
    return {
      release: null,
      problems: [
        {
          check: 'tag',
          message: `${tag} is not @ydinjs/<name>@<semver version>`,
        },
      ],
    };
  }

  const [, name, version] = match as unknown as readonly [
    string,
    string,
    string,
  ];
  const workspacePackage = await findWorkspacePackage(root, name);

  if (!workspacePackage) {
    return {
      release: null,
      problems: [
        {
          check: 'package',
          message: `no workspace package is named ${name}`,
        },
      ],
    };
  }

  const { directory, manifest } = workspacePackage;

  return {
    release: toRelease(name, version, directory, parsed),
    problems:
      manifest.version === version
        ? []
        : [
            {
              check: 'version',
              message: `the tag's version is ${version}, and ${directory}/package.json's is ${manifest.version}`,
            },
          ],
  };
}

/** Step 1 for a dispatched check: the package's manifest version. */
export async function readPackageRelease(
  root: string,
  name: string,
): Promise<ReleaseResult> {
  const workspacePackage = await findWorkspacePackage(root, name);

  if (!workspacePackage) {
    return {
      release: null,
      problems: [
        {
          check: 'package',
          message: `no workspace package is named ${name}`,
        },
      ],
    };
  }

  const {
    directory,
    manifest: { version = '' },
  } = workspacePackage;
  const parsed = parseVersion(version);

  if (!parsed) {
    return {
      release: null,
      problems: [
        {
          check: 'version',
          message: `${directory}/package.json's version ${version} is not a semver version`,
        },
      ],
    };
  }

  return { release: toRelease(name, version, directory, parsed), problems: [] };
}

type WorkflowRuns = Readonly<{
  workflow_runs: ReadonlyArray<Readonly<{ conclusion: string | null }>>;
}>;

export type CommitOptions = Readonly<{
  /** The full-history checkout that `git` reads. */
  cwd: string;
  commit: string;
  repository: string;
  api: Api;
}>;

/**
 * Step 2's commit checks: the commit is reachable from `origin/main`, and a
 * `verify` run for a push to `main` at that commit concluded `success`. A
 * reduced run counts (`repo:RD-15`).
 */
export async function checkCommit({
  cwd,
  commit,
  repository,
  api,
}: CommitOptions): Promise<Problem[]> {
  const problems: Problem[] = [];

  const code = await new Promise<number>((resolve) => {
    execFile(
      'git',
      ['merge-base', '--is-ancestor', commit, 'origin/main'],
      { cwd },
      (error) => {
        resolve(error ? (typeof error.code === 'number' ? error.code : -1) : 0);
      },
    );
  });

  // Exit status 1 is the answer _no_; any other failure is no answer.
  if (code === 1) {
    problems.push({
      check: 'main',
      message: `${commit} is not reachable from origin/main`,
    });
  } else if (code !== 0) {
    throw new Error(`git merge-base --is-ancestor exited with ${code}`);
  }

  const { workflow_runs: runs } = (await api(
    `repos/${repository}/actions/workflows/verify.yml/runs?event=push&branch=main&head_sha=${commit}&per_page=100`,
  )) as WorkflowRuns;

  if (!runs.some((run) => run.conclusion === 'success')) {
    problems.push({
      check: 'verify',
      message: `no verify run for a push to main at ${commit} concluded success (${runs.map((run) => run.conclusion ?? 'running').join(', ') || 'no run'})`,
    });
  }

  return problems;
}

/**
 * Step 2's registry checks: the version isn't on the registry, and a `latest`
 * version is greater than the registry's `latest`. A staged version doesn't
 * appear to an anonymous read; staging it again fails at the stage itself.
 */
export async function checkRegistry(
  { name, version, distTag }: Release,
  registry: Registry,
): Promise<Problem[]> {
  const packument = await registry(name);

  if (!packument) {
    return [];
  }

  if (Object.hasOwn(packument.versions, version)) {
    return [
      {
        check: 'registry-version',
        message: `${name}@${version} is already on the registry`,
      },
    ];
  }

  const { latest } = packument['dist-tags'];

  if (distTag === 'latest' && latest && compareVersions(version, latest) <= 0) {
    return [
      {
        check: 'latest',
        message: `${version} is not greater than the registry's latest ${latest}`,
      },
    ];
  }

  return [];
}

/** Whether the manifest's `files` entries include the path, as npm reads them. */
function isListed(path: string, files: readonly string[]): boolean {
  let isIncluded = false;

  for (const entry of files) {
    const isNegated = entry.startsWith('!');
    const pattern = posix
      .normalize(isNegated ? entry.slice(1) : entry)
      .replace(/^\.\/|\/$/gu, '');

    if (
      posix.matchesGlob(path, pattern) ||
      posix.matchesGlob(path, `${pattern}/**`)
    ) {
      isIncluded = !isNegated;
    }
  }

  return isIncluded;
}

function isExcluded(path: string): boolean {
  const segments = path.split('/');

  return (
    segments
      .slice(0, -1)
      .some((segment) => EXCLUDED_DIRECTORIES.has(segment)) ||
    /\.test\.[^/]+$/u.test(path)
  );
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`);
}

export type PackOptions = Readonly<{
  /** The package's directory, relative to the repository root. */
  directory: string;
  version: string;
  registry: Registry;
}>;

/** Step 6: the listing, the packed manifest and the changelog. */
export async function checkPack(
  { files, manifest, changelog }: Pack,
  { directory, version, registry }: PackOptions,
): Promise<Problem[]> {
  const problems: Problem[] = [];

  for (const required of REQUIRED_FILES) {
    if (!files.includes(required)) {
      problems.push({
        check: 'pack-required',
        message: `the pack holds no ${required}`,
      });
    }
  }

  for (const path of files) {
    if (isExcluded(path)) {
      problems.push({
        check: 'pack-excluded',
        message: `${path} is a source, test or record file`,
      });
    } else if (
      !REQUIRED_FILES.includes(path) &&
      !isListed(path, manifest.files ?? [])
    ) {
      problems.push({
        check: 'pack-files',
        message: `${path} matches no entry of the manifest's files`,
      });
    }
  }

  const heading = new RegExp(
    `^#{1,6} .*(?<![\\w.-])${escapeRegExp(version)}(?![\\w-]|\\.\\w)`,
    'mu',
  );

  if (changelog !== null && !heading.test(changelog)) {
    problems.push({
      check: 'changelog',
      message: `CHANGELOG.md has no heading that names ${version}`,
    });
  }

  const { repository } = manifest;
  const url = typeof repository === 'string' ? repository : repository?.url;

  if (url !== REPOSITORY_URL) {
    problems.push({
      check: 'repository-url',
      message: `repository.url is ${url}, not ${REPOSITORY_URL}`,
    });
  }

  const repositoryDirectory =
    typeof repository === 'object' ? repository.directory : undefined;

  if (repositoryDirectory !== directory) {
    problems.push({
      check: 'repository-directory',
      message: `repository.directory is ${repositoryDirectory}, not ${directory}`,
    });
  }

  if (manifest.publishConfig?.access !== 'public') {
    problems.push({
      check: 'access',
      message: `publishConfig.access is ${manifest.publishConfig?.access}, not public`,
    });
  }

  if ('private' in manifest) {
    problems.push({
      check: 'private',
      message: `the manifest has private: ${manifest.private}`,
    });
  }

  const dependencies = DEPENDENCY_FIELDS.flatMap((field) =>
    Object.entries(manifest[field] ?? {})
      .filter(([name]) => name.startsWith(SCOPE))
      .map(([name, range]) => ({ field, name, range })),
  );
  const dependencyProblems = await Promise.all(
    dependencies.map(
      async ({ field, name, range }): Promise<Problem | null> => {
        if (!parseVersion(range)) {
          return {
            check: 'dependency',
            message: `${field}.${name} is ${range}, not an exact version`,
          };
        }

        return Object.hasOwn((await registry(name))?.versions ?? {}, range)
          ? null
          : {
              check: 'dependency',
              message: `${field}.${name} is ${range}, which is not on the registry`,
            };
      },
    ),
  );

  return [
    ...problems,
    ...dependencyProblems.filter((problem) => problem !== null),
  ];
}

type Output = Readonly<{ code: number; stdout: string; stderr: string }>;

/** Runs a command, and resolves with its exit status whatever it is. */
async function run(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<Output> {
  return await new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          code: error ? (typeof error.code === 'number' ? error.code : -1) : 0,
          stdout,
          stderr,
        });
      },
    );
  });
}

/** Runs a command, and rejects with its output unless it exits 0. */
async function runChecked(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<string> {
  const { code, stdout, stderr } = await run(command, args, cwd);

  if (code !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with ${code} in ${cwd}:\n${stdout}${stderr}`,
    );
  }

  return stdout;
}

/** Reads the listing, `package.json` and `CHANGELOG.md` of a tarball. */
export async function readPack(tarball: string): Promise<Pack> {
  const files = (await runChecked('tar', ['-tzf', tarball], dirname(tarball)))
    .split('\n')
    .filter((line) => line !== '' && !line.endsWith('/'))
    .map((line) => line.replace(/^package\//u, ''));
  const extract = async (path: string): Promise<string> =>
    await runChecked(
      'tar',
      ['-xzOf', tarball, `package/${path}`],
      dirname(tarball),
    );

  return {
    files,
    manifest: JSON.parse(await extract('package.json')) as Manifest,
    changelog: files.includes('CHANGELOG.md')
      ? await extract('CHANGELOG.md')
      : null,
  };
}

/**
 * The specifiers that import each module entry of the manifest's `exports`.
 * JSON entries and subpath patterns aren't modules a consumer can name.
 */
export function exportSpecifiers({ name = '', exports }: Manifest): string[] {
  const subpaths =
    exports != null &&
    typeof exports === 'object' &&
    Object.keys(exports).some((key) => key.startsWith('.'))
      ? Object.keys(exports)
      : ['.'];

  return subpaths
    .filter((subpath) => !subpath.endsWith('.json') && !subpath.includes('*'))
    .map((subpath) => (subpath === '.' ? name : `${name}${subpath.slice(1)}`));
}

/**
 * Step 7: installs the tarball into an empty project with aube, so that its
 * `@ydinjs` dependencies come from the registry as a consumer's do, and
 * type-checks a module that imports every export, with `skipLibCheck` off and
 * the DOM library. `workDirectory` must not exist, and is left for the caller
 * to remove.
 */
export async function checkConsumer(
  tarball: string,
  manifest: Manifest,
  workDirectory: string,
): Promise<Problem[]> {
  const name = manifest.name ?? '';

  await mkdir(workDirectory);
  await writeFile(
    join(workDirectory, 'package.json'),
    `${JSON.stringify({
      name: 'release-consumer',
      private: true,
      type: 'module',
      dependencies: { [name]: `file:${tarball}` },
    })}\n`,
  );

  const install = await run(
    'aube',
    ['install', '--ignore-scripts'],
    workDirectory,
  );

  if (install.code !== 0) {
    return [
      {
        check: 'consumer',
        message: `aube install of the tarball failed:\n${install.stdout}${install.stderr}`,
      },
    ];
  }

  await writeFile(
    join(workDirectory, 'index.ts'),
    exportSpecifiers(manifest)
      .map(
        (specifier, index) =>
          `export * as entry${index} from ${JSON.stringify(specifier)};\n`,
      )
      .join(''),
  );
  await writeFile(
    join(workDirectory, 'tsconfig.json'),
    `${JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        types: [],
        noEmit: true,
        target: 'esnext',
        module: 'nodenext',
        moduleResolution: 'nodenext',
        lib: ['esnext', 'dom', 'dom.iterable'],
      },
      files: ['index.ts'],
    })}\n`,
  );

  const typecheck = await run(
    join(ROOT, 'node_modules/.bin/tsc'),
    ['-p', 'tsconfig.json'],
    workDirectory,
  );

  return typecheck.code === 0
    ? []
    : [
        {
          check: 'consumer',
          message: `the exports don't type-check as a consumer imports them:\n${typecheck.stdout}${typecheck.stderr}`,
        },
      ];
}

/** The registry's abbreviated document, from the endpoint `npm view` reads. */
async function fetchPackument(name: string): Promise<Packument | null> {
  const response = await fetch(
    `https://registry.npmjs.org/${name.replace('/', '%2f')}`,
    { headers: { accept: 'application/vnd.npm.install-v1+json' } },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`The registry answered ${response.status} for ${name}`);
  }

  return (await response.json()) as Packument;
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

async function writeOutputs(
  values: Readonly<Record<string, string>>,
): Promise<void> {
  const { GITHUB_OUTPUT } = process.env;

  if (GITHUB_OUTPUT) {
    await appendFile(
      GITHUB_OUTPUT,
      Object.entries(values)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    );
  }
}

async function writeSummary(markdown: string): Promise<void> {
  const { GITHUB_STEP_SUMMARY } = process.env;

  process.stdout.write(markdown);

  if (GITHUB_STEP_SUMMARY) {
    await appendFile(GITHUB_STEP_SUMMARY, markdown);
  }
}

/** Steps 6 and 7 on a packed tarball, and its sha256 once they pass. */
async function checkTarball(
  directory: string,
  tarball: string,
  version: string | undefined,
): Promise<Problem[]> {
  const pack = await readPack(tarball);
  const workDirectory = await mkdtemp(join(tmpdir(), 'release-consumer-'));

  try {
    const problems = [
      ...(await checkPack(pack, {
        directory,
        version: version ?? pack.manifest.version ?? '',
        registry: fetchPackument,
      })),
      ...(await checkConsumer(
        tarball,
        pack.manifest,
        join(workDirectory, 'project'),
      )),
    ];

    if (problems.length > 0) {
      return problems;
    }
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }

  const hash = await sha256(tarball);
  await writeFile(`${tarball}.sha256`, `${hash}  ${basename(tarball)}\n`);
  await writeOutputs({ sha256: hash, tarball: basename(tarball) });
  await writeSummary(
    [
      `### ${pack.manifest.name}@${pack.manifest.version}`,
      '',
      `- tarball: \`${basename(tarball)}\``,
      `- sha256: \`${hash}\``,
      '',
      ...pack.files.map((path) => `- \`${path}\``),
      '',
    ].join('\n'),
  );

  return [];
}

async function checkRelease(
  tag: string | undefined,
  commit: string | undefined,
  packageName: string | undefined,
): Promise<Problem[]> {
  const { release, problems } = tag
    ? await readTagRelease(ROOT, tag)
    : await readPackageRelease(ROOT, `${SCOPE}${packageName}`);

  if (!release) {
    return [...problems];
  }

  const { GITHUB_REPOSITORY } = process.env;

  if (tag && (!commit || !GITHUB_REPOSITORY)) {
    throw new Error('A tag needs --commit and GITHUB_REPOSITORY');
  }

  const all = [
    ...problems,
    ...(tag
      ? await checkCommit({
          cwd: ROOT,
          commit: commit!,
          repository: GITHUB_REPOSITORY!,
          api: ghApi,
        })
      : []),
    ...(await checkRegistry(release, fetchPackument)),
  ];

  if (all.length === 0) {
    await writeOutputs({
      name: release.name,
      directory: release.directory,
      version: release.version,
      'dist-tag': release.distTag,
    });
    await writeSummary(
      `**${release.name}@${release.version}**, from \`${release.directory}\`, has the dist-tag \`${release.distTag}\`.\n\n`,
    );
  }

  return all;
}

async function checkLocal(name: string): Promise<Problem[]> {
  const workspacePackage = await findWorkspacePackage(ROOT, `${SCOPE}${name}`);

  if (!workspacePackage) {
    return [
      { check: 'package', message: `no workspace package is named ${name}` },
    ];
  }

  const { directory, manifest } = workspacePackage;
  const cwd = join(ROOT, directory);

  await runChecked(
    'aube',
    [
      'exec',
      '--',
      'nx',
      'run-many',
      '-t',
      'build',
      `--projects=${manifest.name}`,
      '--skipNxCache',
    ],
    ROOT,
  );

  if (manifest.scripts?.['size']) {
    await runChecked('aube', ['run', 'size'], cwd);
  }

  const packDirectory = await mkdtemp(join(tmpdir(), 'release-pack-'));

  try {
    const [{ filename }] = JSON.parse(
      await runChecked(
        'aube',
        [
          'pack',
          '--ignore-scripts',
          '--json',
          '--pack-destination',
          packDirectory,
        ],
        cwd,
      ),
    ) as [Readonly<{ filename: string }>];

    return await checkTarball(directory, filename, manifest.version);
  } finally {
    await rm(packDirectory, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const {
    positionals: [command, name],
    values,
  } = parseArgs({
    allowPositionals: true,
    options: {
      tag: { type: 'string' },
      commit: { type: 'string' },
      package: { type: 'string' },
      directory: { type: 'string' },
      tarball: { type: 'string' },
    },
  });

  let problems: readonly Problem[];

  if (command === 'release' && (values.tag || values.package)) {
    problems = await checkRelease(values.tag, values.commit, values.package);
  } else if (command === 'package' && values.directory && values.tarball) {
    problems = await checkTarball(values.directory, values.tarball, undefined);
  } else if (command === 'local' && name) {
    problems = await checkLocal(name);
  } else {
    throw new Error(
      'usage: release-check.ts release (--tag <tag> --commit <sha> | --package <name>) | package --directory <dir> --tarball <file> | local <name>',
    );
  }

  if (problems.length > 0) {
    for (const { check, message } of problems) {
      process.stdout.write(
        `::error title=release-check ${check}::${message.replaceAll('\n', '%0A')}\n`,
      );
    }

    await writeSummary(
      `**The release check failed:**\n\n${problems.map(({ check, message }) => `- \`${check}\`: ${message.split('\n')[0]}`).join('\n')}\n`,
    );
    process.exitCode = 1;
  }
}
