import { glob, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { JSModule } from './utils.ts';

const srcDir = new URL('../src/', import.meta.url);

// eslint-disable-next-line @typescript-eslint/await-thenable
for await (const url of glob('**/*.styles.ts', {
  cwd: fileURLToPath(srcDir),
})) {
  const originalURL = new URL(url, srcDir);
  const newURL = new URL(url.replace('styles.ts', 'css'), srcDir);
  console.log(`[INFO]: Generating ${newURL}`);
  const styles: JSModule<string> = await import(fileURLToPath(originalURL));

  await mkdir(new URL('./', newURL), { recursive: true });
  await writeFile(newURL, styles.default, 'utf8');
}
