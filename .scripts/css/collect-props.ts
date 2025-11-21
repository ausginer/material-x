import { glob, mkdir, writeFile } from 'node:fs/promises';
import { root, type JSModule } from '../utils.ts';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

const srcDir = new URL('src/', root);
const cacheDir = new URL('node_modules/.cache/css/', root);

const registry = new Set<string>();

for await (const filename of glob('**/*.css.ts', { cwd: srcDir })) {
  const css: JSModule<string> = await import(
    fileURLToPath(new URL(filename, srcDir))
  );

  if (typeof css.default === 'string') {
    transform({
      filename,
      code: Buffer.from(css.default),
      visitor: {
        Declaration: {
          custom({ name, value }) {
            if (name.startsWith('--_')) {
              registry.add(name);
            }
          },
        },
      },
    });
  }
}

function* createLetterProvider(): Generator<string, undefined, void> {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let counter = 0;
  let amountOfLetters = 1;

  while (true) {
    if (counter + amountOfLetters >= letters.length) {
      counter = 0;
      amountOfLetters += 1;
    }

    yield letters.substring(counter, counter + amountOfLetters);
    counter += 1;
  }
}

const provider = createLetterProvider();

const result = Object.fromEntries(
  Iterator.from(registry).map(
    (prop) => [prop, provider.next().value!] as const,
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
