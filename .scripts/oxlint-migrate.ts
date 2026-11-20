import { spawn } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type JSONRecord = Record<string, unknown>;

// The recipe writes `.oxlintrc.migrated.json` from `eslint.base.config.ts`, the
// ESLint configuration without the rules that `eslint.config.ts` derives from
// the oxlint configuration, so the output never depends on its own last run.
// `.oxlintrc.json` is written by hand and extends this file.
//
// `@oxlint/migrate` joins both of its paths to the working directory, so they
// are relative to the repository root and the tool runs there.
const rootURL = new URL('..', import.meta.url);
const configURL = new URL('.oxlintrc.migrated.json', rootURL);
const configPath = fileURLToPath(configURL);
const JS_FILES = [
  '**/*.{js,jsx,mjs,cjs,mjsx,cjsx}',
] as const satisfies readonly string[];
const TS_FILES = [
  '**/*.{ts,tsx,mts,cts,mtsx,ctsx}',
] as const satisfies readonly string[];

function isRecord(value: unknown): value is JSONRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasSameFiles(
  files: unknown,
  expectedFiles: readonly string[],
): boolean {
  if (
    !Array.isArray(files) ||
    files.length !== expectedFiles.length ||
    !files.every((file) => typeof file === 'string')
  ) {
    return false;
  }

  return files.every((file, index) => file === expectedFiles[index]);
}

function retargetJsOnlyOverrides(config: JSONRecord): number {
  const { overrides } = config;
  if (!Array.isArray(overrides)) {
    return 0;
  }

  let retargetedOverrides = 0;

  for (const override of overrides) {
    if (!isRecord(override) || !hasSameFiles(override['files'], JS_FILES)) {
      continue;
    }

    override['files'] = [...TS_FILES];
    retargetedOverrides += 1;
  }

  return retargetedOverrides;
}

async function runMigrate(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'aube',
      [
        'exec',
        '--',
        '@oxlint/migrate',
        'eslint.base.config.ts',
        '--output-file',
        '.oxlintrc.migrated.json',
        '--type-aware',
        '--details',
        '--with-nursery',
      ],
      {
        cwd: rootURL,
        stdio: 'inherit',
      },
    );

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`Migration was interrupted by signal: ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(
          new Error(`Migration failed with exit code: ${code ?? 'unknown'}`),
        );
        return;
      }

      resolve();
    });
  });
}

await runMigrate();
// The tool renames the file it replaces to `<output>.bak`; git holds the
// previous version.
await rm(`${configPath}.bak`, { force: true });

const { default: config } = await import(configURL.href, {
  with: { type: 'json' },
});

if (!isRecord(config)) {
  throw new TypeError(
    'Expected .oxlintrc.migrated.json to contain a JSON object.',
  );
}

const retargetedOverrides = retargetJsOnlyOverrides(config);

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

// oxlint-disable-next-line no-console
console.log(
  [
    'Native oxlint migration post-fix complete.',
    `JS-only overrides retargeted to TS: ${retargetedOverrides}`,
  ].join('\n'),
);
