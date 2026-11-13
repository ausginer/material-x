/* oxlint-disable no-console -- a script that reports what it wrote */
/**
 * Generates `property-names.json`, the map from each prefixed property name in
 * `src` to its output name in the publication.
 *
 * The keys are the prefixed property names that `src`'s syntax holds. The output
 * names come from the publication built without the step: the build of
 * `tsdown.config.ts` with every plugin but the step's, into a temporary
 * directory, so the package's own tree is untouched. The names that occur most
 * often in its modules get the shortest output names, ties in key order. No
 * output name is a reserved word or a property name that stays in that build.
 *
 * `node build/generate-property-names.ts [--out <file>]` writes the map to `--out`,
 * by default `build/property-names.json`. The same tree gives the same file.
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'tsdown';
import config from '../tsdown.config.ts';
import { isPrefixed, readNames } from './property-names.ts';
import { RENAME_PROPERTIES } from './rename-properties.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const RESERVED = new Set(
  [
    'arguments await break case catch class const continue debugger default',
    'delete do else enum eval export extends false finally for function if',
    'implements import in instanceof interface let new null package private',
    'protected public return static super switch this throw true try typeof',
    'undefined var void while with yield',
  ]
    .join(' ')
    .split(' '),
);

const FIRST = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$';
const REST = `${FIRST}0123456789_`;

/** Identifier names in order of length, then of `FIRST` and `REST`. */
function* candidates(): Generator<string> {
  for (let length = 1; ; length += 1) {
    const digits = Array.from({ length }, () => 0);

    for (;;) {
      yield digits.map((digit, i) => (i === 0 ? FIRST : REST)[digit]).join('');

      let i = length - 1;

      while (i >= 0) {
        digits[i]! += 1;

        if (digits[i]! < (i === 0 ? FIRST : REST).length) {
          break;
        }

        digits[i] = 0;
        i -= 1;
      }

      if (i < 0) {
        break;
      }
    }
  }
}

/** Each file under `directory` whose name matches `extension`, with its text. */
async function textsIn(
  directory: string,
  extension: RegExp,
): Promise<Array<readonly [string, string]>> {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  const files = entries
    .filter((entry) => entry.isFile() && extension.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();

  return await Promise.all(
    files.map(async (file) => [file, await readFile(file, 'utf8')] as const),
  );
}

/** The prefixed property names that `src`'s syntax holds. */
async function sourceNames(): Promise<Set<string>> {
  const names = new Set<string>();

  for (const [file, code] of await textsIn(join(ROOT, 'src'), /\.tsx?$/u)) {
    for (const { name } of readNames(file, code).properties) {
      if (isPrefixed(name)) {
        names.add(name);
      }
    }
  }

  return names;
}

/** Each prefixed name's occurrences, and every other property name, in the build. */
async function buildNames(): Promise<
  Readonly<{ counts: Map<string, number>; kept: Set<string> }>
> {
  const outDir = await mkdtemp(join(tmpdir(), 'drag-property-names-'));
  const counts = new Map<string, number>();
  const kept = new Set<string>();

  try {
    await build({
      ...config,
      config: false,
      cwd: ROOT,
      outDir,
      dts: false,
      exports: false,
      sourcemap: false,
      logLevel: 'warn',
      plugins: [config.plugins]
        .flat()
        .filter(
          (plugin) =>
            !(
              plugin &&
              typeof plugin === 'object' &&
              'name' in plugin &&
              plugin.name === RENAME_PROPERTIES
            ),
        ),
    });

    for (const [file, code] of await textsIn(outDir, /\.js$/u)) {
      for (const { name } of readNames(file, code).properties) {
        if (isPrefixed(name)) {
          counts.set(name, (counts.get(name) ?? 0) + 1);
        } else {
          kept.add(name);
        }
      }
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }

  return { counts, kept };
}

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: join(ROOT, 'build/property-names.json') },
  },
});

const keys = [...(await sourceNames())].sort();
const { counts, kept } = await buildNames();
const byFrequency = keys.toSorted(
  (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || (a < b ? -1 : 1),
);
const available = candidates();
const names: Record<string, string> = {};

for (const key of byFrequency) {
  let name = available.next().value!;

  while (RESERVED.has(name) || kept.has(name)) {
    name = available.next().value!;
  }

  names[key] = name;
}

const sorted = Object.fromEntries(keys.map((key) => [key, names[key]!]));

await writeFile(values.out, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `${keys.length} names, ${[...counts.values()].reduce((a, b) => a + b, 0)} occurrences in the build; ${values.out}`,
);
