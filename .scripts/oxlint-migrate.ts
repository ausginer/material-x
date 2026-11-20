import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The recipe writes `.oxlintrc.migrated.json` from `eslint.base.config.ts`, the
// ESLint configuration without the rules that `eslint.config.ts` derives from
// the oxlint configuration, so the output never depends on its own last run.
// `.oxlintrc.json` is written by hand and extends this file.
//
// `@oxlint/migrate` joins both of its paths to the working directory, so they
// are relative to the repository root and the tool runs there.
const rootURL = new URL('..', import.meta.url);
const configPath = fileURLToPath(new URL('.oxlintrc.migrated.json', rootURL));

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
