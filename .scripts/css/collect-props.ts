import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execPattern, root, type JSModule } from '../utils.ts';

const srcDir = new URL('src/', root);
const cacheDir = new URL('node_modules/.cache/css/', root);

const registry = new Set<string>();

const CSS_VARIABLE_NAME_REGEXP = /(--_[\w-]+)/gu;

register('./styles-import.ts', import.meta.url);

for await (const filename of glob(['**/*.css.ts', '**/*.ctr.css'], {
  cwd: srcDir,
})) {
  let css: unknown;

  if (filename.endsWith('css')) {
    css = await readFile(new URL(filename, srcDir), 'utf8');
  } else {
    const mod: JSModule<string> = await import(
      fileURLToPath(new URL(filename, srcDir))
    );
    css = mod.default;
  }

  if (typeof css === 'string') {
    for (const [propName] of execPattern(CSS_VARIABLE_NAME_REGEXP, css)) {
      registry.add(propName);
    }
  }
}

function* createLetterProvider(): Generator<string, undefined, void> {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let length = 1;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const indexes = Array.from({ length }, () => 0);
    const lastIndex = letters.length - 1;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield indexes.map((i) => letters[i]).join('');

      let cursor = indexes.length - 1;
      while (cursor >= 0 && indexes[cursor] === lastIndex) {
        cursor -= 1;
      }

      if (cursor < 0) {
        break;
      }

      indexes[cursor]! += 1;
      for (let i = cursor + 1; i < indexes.length; i += 1) {
        indexes[i] = 0;
      }
    }

    length += 1;
  }
}

const provider = createLetterProvider();

const result = Object.fromEntries(
  Iterator.from(registry).map(
    (prop) => [prop, `--${provider.next().value!}`] as const,
  ),
);

const listFile = new URL('css-private-props.json', cacheDir);

await mkdir(cacheDir, { recursive: true });
await writeFile(
  new URL('css-private-props.json', cacheDir),
  JSON.stringify(result, null, 2),
  'utf8',
);

console.log('Created CSS private properties list: ', listFile.toString());
