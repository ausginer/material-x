import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import {
  type Api,
  checkCommit,
  checkConsumer,
  checkPack,
  checkRegistry,
  compareVersions,
  type Manifest,
  type Pack,
  type Packument,
  type Problem,
  type Registry,
  type Release,
  readPack,
  readTagRelease,
  REPOSITORY_URL,
} from './release-check.ts';

const REPOSITORY = 'owner/repo';

/** box-quad's manifest as its release plan intends it, packed. */
const BOX_QUAD_MANIFEST = {
  name: '@ydinjs/box-quad',
  version: '1.0.0',
  license: 'Apache-2.0',
  type: 'module',
  sideEffects: false,
  files: ['index.js', 'index.js.map', 'index.d.ts', 'CHANGELOG.md'],
  repository: {
    type: 'git',
    url: REPOSITORY_URL,
    directory: 'packages/box-quad',
  },
  publishConfig: { access: 'public' },
  exports: {
    '.': { types: './index.d.ts', default: './index.js' },
    './package.json': './package.json',
  },
  devDependencies: {
    'size-limit': '14.3.0',
    'size-limit-preset-rolldown': '0.1.0',
  },
};

const BOX_QUAD_FILES = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'index.d.ts',
  'index.js',
  'index.js.map',
  'package.json',
];

const CHANGELOG = '# Changelog\n\n## 1.0.0\n\nThe first release.\n';

const BOX_QUAD_RELEASE: Release = {
  name: '@ydinjs/box-quad',
  version: '1.0.0',
  directory: 'packages/box-quad',
  distTag: 'latest',
};

/** box-quad's intended pack, with one part replaced. */
function pack({
  files = BOX_QUAD_FILES,
  manifest = {},
  changelog = CHANGELOG,
}: Readonly<{
  files?: readonly string[];
  manifest?: Readonly<Record<string, unknown>>;
  changelog?: string | null;
}> = {}): Pack {
  return {
    files,
    manifest: { ...BOX_QUAD_MANIFEST, ...manifest },
    changelog,
  };
}

function packument(
  versions: readonly string[],
  latest = versions.at(-1),
): Packument {
  return {
    'dist-tags': latest ? { latest } : {},
    versions: Object.fromEntries(versions.map((version) => [version, {}])),
  };
}

/** A registry that knows only the documents given, and makes no request. */
function registry(
  documents: Readonly<Record<string, Packument>> = {},
): Registry {
  return async (name) => await Promise.resolve(documents[name] ?? null);
}

const checks = (problems: readonly Problem[]): string[] =>
  problems.map(({ check }) => check);

let root: string;

const run = async (
  command: string,
  args: readonly string[],
  cwd = root,
): Promise<string> =>
  await new Promise((resolve, reject) => {
    execFile(command, [...args], { cwd }, (error, stdout) => {
      if (error) {
        reject(
          new Error(`${command} ${args.join(' ')} failed`, { cause: error }),
        );
      } else {
        resolve(stdout.trim());
      }
    });
  });

async function writeFiles(
  directory: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  await Promise.all(
    Object.entries(files).map(async ([path, text]) => {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), text);
    }),
  );
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'release-check-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('compareVersions', () => {
  it('should order versions by their release numbers', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
  });

  it('should order a prerelease below its release', () => {
    expect(compareVersions('1.0.0-rc.1', '1.0.0')).toBeLessThan(0);
  });

  it('should order numeric prerelease identifiers numerically', () => {
    expect(compareVersions('1.0.0-rc.10', '1.0.0-rc.9')).toBeGreaterThan(0);
  });
});

describe('readTagRelease', () => {
  beforeEach(async () => {
    await writeFiles(root, {
      'package.json': JSON.stringify({ workspaces: ['packages/*'] }),
      'packages/box-quad/package.json': JSON.stringify({
        name: '@ydinjs/box-quad',
        version: '1.0.0',
      }),
      'packages/core/package.json': JSON.stringify({
        name: '@ydinjs/core',
        version: '1.1.0-rc.1',
      }),
    });
  });

  it('should read the package and the version that the tag names', async () => {
    expect(await readTagRelease(root, '@ydinjs/box-quad@1.0.0')).toEqual({
      release: BOX_QUAD_RELEASE,
      problems: [],
    });
  });

  it('should stage a prerelease under next', async () => {
    const { release } = await readTagRelease(root, '@ydinjs/core@1.1.0-rc.1');
    expect(release?.distTag).toBe('next');
  });

  it('should refuse a tag whose version differs from package.json', async () => {
    const { problems } = await readTagRelease(root, '@ydinjs/box-quad@1.0.1');
    expect(checks(problems)).toEqual(['version']);
  });

  it('should refuse a tag that names no workspace package', async () => {
    const { problems } = await readTagRelease(root, '@ydinjs/box@1.0.0');
    expect(checks(problems)).toEqual(['package']);
  });

  it('should refuse a tag that is not a package and a semver version', async () => {
    const { problems } = await readTagRelease(root, '@ydinjs/box-quad@1.0');
    expect(checks(problems)).toEqual(['tag']);
  });
});

describe('checkCommit', () => {
  let main: string;
  let branch: string;

  /** An API whose `verify` push runs at `commit` concluded as given. */
  const api =
    (commit: string, conclusions: ReadonlyArray<string | null>): Api =>
    async (path) =>
      await Promise.resolve({
        workflow_runs: path.includes(`head_sha=${commit}&`)
          ? conclusions.map((conclusion) => ({ conclusion }))
          : [],
      });

  beforeEach(async () => {
    await run('git', ['init', '-q', '-b', 'main']);
    await run('git', ['config', 'user.email', 'test@example.test']);
    await run('git', ['config', 'user.name', 'test']);
    await run('git', ['commit', '-q', '--allow-empty', '-m', 'main']);
    main = await run('git', ['rev-parse', 'HEAD']);
    await run('git', ['update-ref', 'refs/remotes/origin/main', main]);
    await run('git', ['switch', '-q', '-c', 'branch']);
    await run('git', ['commit', '-q', '--allow-empty', '-m', 'branch']);
    branch = await run('git', ['rev-parse', 'HEAD']);
  });

  const check = async (commit: string, runApi: Api): Promise<Problem[]> =>
    await checkCommit({
      cwd: root,
      commit,
      repository: REPOSITORY,
      api: runApi,
    });

  it('should accept a commit on main that verify passed', async () => {
    expect(await check(main, api(main, ['success']))).toEqual([]);
  });

  it('should refuse a commit not on main', async () => {
    expect(checks(await check(branch, api(branch, ['success'])))).toEqual([
      'main',
    ]);
  });

  it("should refuse a commit whose verify run didn't succeed", async () => {
    expect(checks(await check(main, api(main, ['failure', null])))).toEqual([
      'verify',
    ]);
  });

  it('should refuse a commit that verify never ran on', async () => {
    expect(checks(await check(main, api(main, [])))).toEqual(['verify']);
  });
});

describe('checkRegistry', () => {
  it("should accept a name that isn't on the registry", async () => {
    expect(await checkRegistry(BOX_QUAD_RELEASE, registry())).toEqual([]);
  });

  it('should accept a version above the registry latest', async () => {
    const known = registry({ '@ydinjs/box-quad': packument(['0.9.0']) });
    expect(await checkRegistry(BOX_QUAD_RELEASE, known)).toEqual([]);
  });

  it('should refuse a version already on the registry', async () => {
    const known = registry({ '@ydinjs/box-quad': packument(['1.0.0']) });
    expect(checks(await checkRegistry(BOX_QUAD_RELEASE, known))).toEqual([
      'registry-version',
    ]);
  });

  it("should refuse a latest version below the registry's", async () => {
    const known = registry({ '@ydinjs/box-quad': packument(['1.2.0']) });
    expect(checks(await checkRegistry(BOX_QUAD_RELEASE, known))).toEqual([
      'latest',
    ]);
  });

  // Build metadata doesn't take part in precedence, so `1.0.0+build.1` is
  // equal to `1.0.0`, and the registry's version index doesn't hold it.
  it("should refuse a latest version equal to the registry's by precedence", async () => {
    const known = registry({ '@ydinjs/box-quad': packument(['1.0.0']) });
    const release: Release = { ...BOX_QUAD_RELEASE, version: '1.0.0+build.1' };
    expect(checks(await checkRegistry(release, known))).toEqual(['latest']);
  });

  it("should not compare a next version with the registry's latest", async () => {
    const known = registry({ '@ydinjs/box-quad': packument(['1.2.0']) });
    const release: Release = {
      ...BOX_QUAD_RELEASE,
      version: '1.0.0-rc.1',
      distTag: 'next',
    };
    expect(await checkRegistry(release, known)).toEqual([]);
  });
});

describe('checkPack', () => {
  const check = async (
    packed: Pack,
    known: Registry = registry(),
  ): Promise<string[]> =>
    checks(
      await checkPack(packed, {
        directory: 'packages/box-quad',
        version: '1.0.0',
        registry: known,
      }),
    );

  it("should accept box-quad's intended pack", async () => {
    expect(await check(pack())).toEqual([]);
  });

  it("should refuse a file outside the manifest's files", async () => {
    expect(
      await check(pack({ files: [...BOX_QUAD_FILES, 'Justfile'] })),
    ).toEqual(['pack-files']);
  });

  it('should refuse a path under src', async () => {
    expect(
      await check(
        pack({
          files: [...BOX_QUAD_FILES, 'src/index.ts'],
          manifest: { files: [...BOX_QUAD_MANIFEST.files, 'src'] },
        }),
      ),
    ).toEqual(['pack-excluded']);
  });

  it('should refuse a test file', async () => {
    expect(
      await check(
        pack({
          files: [...BOX_QUAD_FILES, 'index.node.test.js'],
          manifest: { files: [...BOX_QUAD_MANIFEST.files, '*.js'] },
        }),
      ),
    ).toEqual(['pack-excluded']);
  });

  it('should refuse a pack without LICENSE', async () => {
    expect(
      await check(
        pack({ files: BOX_QUAD_FILES.filter((path) => path !== 'LICENSE') }),
      ),
    ).toEqual(['pack-required']);
  });

  it('should refuse a pack without CHANGELOG.md', async () => {
    expect(
      await check(
        pack({
          files: BOX_QUAD_FILES.filter((path) => path !== 'CHANGELOG.md'),
          changelog: null,
        }),
      ),
    ).toEqual(['pack-required']);
  });

  it('should refuse a changelog with no section for the version', async () => {
    expect(
      await check(pack({ changelog: '# Changelog\n\n## 1.0.0-rc.1\n' })),
    ).toEqual(['changelog']);
  });

  it('should accept a changelog heading that names the version in brackets', async () => {
    expect(
      await check(pack({ changelog: '## [1.0.0] - 2026-11-21\n' })),
    ).toEqual([]);
  });

  it('should refuse a repository.url that differs', async () => {
    expect(
      await check(
        pack({
          manifest: {
            repository: {
              ...BOX_QUAD_MANIFEST.repository,
              url: 'https://github.com/ausginer/material-x',
            },
          },
        }),
      ),
    ).toEqual(['repository-url']);
  });

  it('should refuse a repository.directory that names another directory', async () => {
    expect(
      await check(
        pack({
          manifest: {
            repository: {
              ...BOX_QUAD_MANIFEST.repository,
              directory: 'packages/core',
            },
          },
        }),
      ),
    ).toEqual(['repository-directory']);
  });

  it('should refuse a manifest without public access', async () => {
    expect(await check(pack({ manifest: { publishConfig: {} } }))).toEqual([
      'access',
    ]);
  });

  it('should refuse private: true', async () => {
    expect(await check(pack({ manifest: { private: true } }))).toEqual([
      'private',
    ]);
  });

  it("should refuse an @ydinjs dependency that isn't published", async () => {
    const known = registry({ '@ydinjs/core': packument(['1.0.0']) });
    expect(
      await check(
        pack({ manifest: { dependencies: { '@ydinjs/core': '1.1.0' } } }),
        known,
      ),
    ).toEqual(['dependency']);
  });

  it('should refuse an @ydinjs dependency that is a range', async () => {
    const known = registry({ '@ydinjs/core': packument(['1.0.0']) });
    expect(
      await check(
        pack({ manifest: { dependencies: { '@ydinjs/core': '^1.0.0' } } }),
        known,
      ),
    ).toEqual(['dependency']);
  });

  it('should accept an @ydinjs dependency that is published', async () => {
    const known = registry({ '@ydinjs/core': packument(['1.0.0']) });
    expect(
      await check(
        pack({ manifest: { dependencies: { '@ydinjs/core': '1.0.0' } } }),
        known,
      ),
    ).toEqual([]);
  });
});

/** box-quad's intended pack, written as a tarball. */
async function packBoxQuad(
  manifest: Readonly<Record<string, unknown>> = BOX_QUAD_MANIFEST,
): Promise<string> {
  await writeFiles(join(root, 'pack'), {
    'package/CHANGELOG.md': CHANGELOG,
    'package/LICENSE': 'Apache License\n',
    'package/README.md': '# @ydinjs/box-quad\n',
    'package/index.d.ts':
      'export type Box = Readonly<{ width: number }>;\nexport declare function area(box: Box): number;\n',
    'package/index.js': 'export function area(box) {\n  return box.width;\n}\n',
    'package/index.js.map': '{}\n',
    'package/package.json': `${JSON.stringify(manifest, null, 2)}\n`,
  });

  const tarball = join(root, 'ydinjs-box-quad-1.0.0.tgz');
  await run('tar', ['-czf', tarball, '-C', join(root, 'pack'), 'package']);

  return tarball;
}

describe('readPack', () => {
  it("should read box-quad's intended pack, which passes the pack checks", async () => {
    const packed = await readPack(await packBoxQuad());

    expect(
      await checkPack(packed, {
        directory: 'packages/box-quad',
        version: '1.0.0',
        registry: registry(),
      }),
    ).toEqual([]);
  });
});

describe('checkConsumer', () => {
  const { npm_config_registry: registryBefore } = process.env;

  // An address that refuses connections: an install that reaches for the
  // registry fails instead of making a request.
  beforeAll(() => {
    process.env['npm_config_registry'] = 'http://127.0.0.1:9/';
  });

  afterAll(() => {
    if (registryBefore === undefined) {
      delete process.env['npm_config_registry'];
    } else {
      process.env['npm_config_registry'] = registryBefore;
    }
  });

  it("should type-check box-quad's intended pack as a consumer imports it", async () => {
    const tarball = await packBoxQuad();

    expect(
      await checkConsumer(
        tarball,
        BOX_QUAD_MANIFEST as Manifest,
        join(root, 'consumer'),
      ),
    ).toEqual([]);
  });

  it('should refuse an export whose declarations are missing', async () => {
    const manifest = {
      ...BOX_QUAD_MANIFEST,
      exports: {
        ...BOX_QUAD_MANIFEST.exports,
        './extra.js': { types: './extra.d.ts', default: './extra.js' },
      },
    };
    const tarball = await packBoxQuad(manifest);

    expect(
      checks(
        await checkConsumer(
          tarball,
          manifest as Manifest,
          join(root, 'consumer'),
        ),
      ),
    ).toEqual(['consumer']);
  });
});
