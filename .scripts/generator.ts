import { glob, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { JSModule } from './utils.ts';

const srcDir = new URL('../src/', import.meta.url);

// eslint-disable-next-line @typescript-eslint/await-thenable
for await (const url of glob('**/*.css.ts', {
  cwd: fileURLToPath(new URL(srcDir, 'generator/')),
})) {
  const styles: JSModule<string> = await import(url);
  await writeFile(
    new URL(url.replace('.ts', ''), srcDir),
    styles.default,
    'utf8',
  );
}
