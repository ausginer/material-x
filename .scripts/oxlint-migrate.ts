import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type JSONRecord = Record<string, unknown>;

const configPath = fileURLToPath(new URL('../.oxlintrc.json', import.meta.url));
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
      'npx',
      ['@oxlint/migrate', '--type-aware', '--details', '--with-nursery'],
      {
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

const { default: config } = await import(
  new URL(`../.oxlintrc.json?ts=${Date.now()}`, import.meta.url).toString(),
  { with: { type: 'json' } }
);

if (!isRecord(config)) {
  throw new TypeError('Expected .oxlintrc.json to contain a JSON object.');
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
