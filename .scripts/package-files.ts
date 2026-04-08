import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import type { UserConfig } from 'tsdown';

export type PackageFiles = Readonly<{
  runtime?: readonly string[];
  typeOnly?: readonly string[];
  clean?: Readonly<{
    extras?: readonly string[];
  }>;
}>;

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  );
}

function isPackageFiles(value: unknown): value is PackageFiles {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const runtime = 'runtime' in value ? value.runtime : undefined;
  const typeOnly = 'typeOnly' in value ? value.typeOnly : undefined;
  const clean = 'clean' in value ? value.clean : undefined;

  return (
    (runtime == null || isStringArray(runtime)) &&
    (typeOnly == null || isStringArray(typeOnly)) &&
    (clean == null ||
      (typeof clean === 'object' &&
        ('extras' in clean
          ? clean.extras == null || isStringArray(clean.extras)
          : true)))
  );
}

function normalizeEntryPath(path: string): string {
  return posix
    .normalize(path)
    .replace(/^\.?\//u, '')
    .replace(/(?:\.d)?\.(?:t|j)s$/u, '');
}

function toRuntimeEntrypoints({
  runtime = [],
  typeOnly = [],
}: PackageFiles): string[] {
  return [...runtime, ...typeOnly].map(normalizeEntryPath);
}

export async function readPackageFiles(
  packageRoot: string,
): Promise<PackageFiles> {
  const filesUrl = pathToFileURL(resolve(packageRoot, 'files.json'));
  const { default: files } = await import(filesUrl.href, {
    with: { type: 'json' },
  });

  if (!isPackageFiles(files)) {
    throw new TypeError(`Invalid files.json in ${packageRoot}`);
  }

  return files;
}

export function packageFilesToTsdownEntries(files: PackageFiles): string[] {
  return toRuntimeEntrypoints(files).map(
    (entrypoint) => `src/${entrypoint}.ts`,
  );
}

export function packageFilesToCustomExports(
  files: PackageFiles,
): UserConfig['exports'] {
  return {
    customExports() {
      const runtime = new Set((files.runtime ?? []).map(normalizeEntryPath));
      const typeOnly = new Set((files.typeOnly ?? []).map(normalizeEntryPath));

      return Object.fromEntries(
        [...runtime, ...typeOnly, 'package.json'].map((entrypoint) => {
          if (entrypoint === 'package.json') {
            return ['./package.json', './package.json'];
          }

          return [
            `./${entrypoint}.js`,
            {
              types: `./${entrypoint}.d.ts`,
              ...(runtime.has(entrypoint)
                ? { default: `./${entrypoint}.js` }
                : {}),
            },
          ];
        }),
      );
    },
  };
}

export function packageFilesToCleanPathspecs(
  files: PackageFiles,
): readonly string[] {
  const pathspecs = new Set(files.clean?.extras ?? []);

  for (const entrypoint of toRuntimeEntrypoints(files)) {
    if (entrypoint.includes('/')) {
      pathspecs.add(entrypoint.split('/')[0]!);
      continue;
    }

    pathspecs.add(`${entrypoint}.js`);
    pathspecs.add(`${entrypoint}.js.map`);
    pathspecs.add(`${entrypoint}.d.ts`);
    pathspecs.add(`${entrypoint}.d.ts.map`);
  }

  return [...pathspecs].sort();
}

async function clean(packageRoot: string): Promise<void> {
  execFileSync(
    'git',
    [
      'clean',
      '-fx',
      '-e',
      '.vite',
      '-e',
      'node_modules',
      '--',
      ...packageFilesToCleanPathspecs(await readPackageFiles(packageRoot)),
    ],
    {
      cwd: packageRoot,
      stdio: 'inherit',
    },
  );
}

if (import.meta.main) {
  const {
    positionals,
    values: { package: packageRoot },
  } = parseArgs({
    allowPositionals: true,
    options: {
      package: {
        type: 'string',
        default: '.',
      },
    },
  });

  if (positionals[0] === 'clean') {
    await clean(resolve(packageRoot));
  } else {
    throw new Error(`Unknown command: ${positionals[0] ?? '<missing>'}`);
  }
}
