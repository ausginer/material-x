/**
 * Item 5's placement probe. Runs `compare.ts`'s own `bundle` and `moduleAt`, cut
 * from a given copy of `compare.ts` above `interface PageContext`, on the base arm:
 * `bench/lab.ts` with `src` from `<source root>`. Prints the key of each line that
 * starts a method of `RectIndex`, `directionOf` or `keyboardInsertion`, and the
 * modules that the instrument places on no line.
 *
 * usage, from `packages/drag`:
 * `node .plan/probes/size-acceptance-cleanup/placement.ts <compare.ts copy> <source root>`
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { rolldown } from 'rolldown';

const [compareCopy, sourceRoot] = process.argv
  .slice(2)
  .map((path) => resolve(path!));
const ROOT = resolve('.');
const compare = await readFile(compareCopy!, 'utf8');
const cut = compare.slice(0, compare.indexOf('interface PageContext {'));
const probe = join(ROOT, 'bench/placement-probe.scratch.ts');

await writeFile(probe, `${cut}\nexport { bundle, moduleAt };\n`);

try {
  const { bundle, moduleAt } = (await import(probe)) as {
    bundle: (
      lab: string,
      root: string,
    ) => Promise<Record<string, unknown> & { code: string }>;
    moduleAt: (table: unknown, line: number) => string | null;
  };
  const lab = join(ROOT, 'bench/lab.ts');
  const built = await bundle(lab, sourceRoot!);
  const table = 'lines' in built ? built['lines'] : built['modules'];
  const code = built.code.split('\n');
  const place = (line: number): string => {
    try {
      return String(moduleAt(table, line));
    } catch (error) {
      return `ERROR: ${(error as Error).message}`;
    }
  };
  const start = code.findIndex((text) =>
    /^\tvar RectIndex = class|^\tclass RectIndex\b/u.test(text),
  );

  console.log(
    `instrument: ${relative(ROOT, compareCopy!)}; source root: ${relative(ROOT, sourceRoot!)}`,
  );
  console.log(
    `table: ${'lines' in built ? 'lines (source map)' : 'modules (comment markers)'}`,
  );
  console.log(`\nRectIndex, from line ${start + 1}:`);

  for (let line = start; line < code.length; line += 1) {
    const text = code[line]!;

    if (line > start && /^\t\S/u.test(text)) {
      break;
    }

    if (
      line === start ||
      /^\t\t(?:static |get |set |async )?#?\w+\(.*\{$/u.test(text)
    ) {
      console.log(
        `  ${String(line + 1).padStart(5)}  ${place(line).padEnd(28)} ${text.trim()}`,
      );
    }
  }

  for (const name of ['directionOf', 'keyboardInsertion']) {
    const line = code.findIndex((text) =>
      text.startsWith(`\tfunction ${name}(`),
    );

    console.log(
      `\n${name}:\n  ${String(line + 1).padStart(5)}  ${place(line).padEnd(28)} ${code[line]!.trim()}`,
    );
  }

  // The modules the bundle holds, keyed as the instrument keys them.
  const again = await rolldown({
    input: lab,
    platform: 'browser',
    resolve: {
      alias: { '@ydinjs/box-quad': join(ROOT, '../box-quad/src/index.ts') },
    },
    plugins: [
      {
        name: 'arm-source',
        resolveId: (id) =>
          id.startsWith('../src/')
            ? join(sourceRoot!, id.slice('../src/'.length))
            : null,
      },
    ],
  });
  const [chunk] = (await again.generate({ format: 'iife', name: 'labExports' }))
    .output;

  await again.close();

  const keyOf = (path: string): string => {
    const key = relative(sourceRoot!, path);

    return key.startsWith('..') ? relative(ROOT, path) : key;
  };
  const placed = new Set(
    'lines' in built
      ? (built['lines'] as Array<string | null>).filter(Boolean)
      : (built['modules'] as Array<{ key: string }>).map(({ key }) => key),
  );

  console.log(`\nmodules in the bundle: ${chunk.moduleIds.length}`);
  console.log(
    `modules placed on no line: ${
      chunk.moduleIds
        .map(keyOf)
        .filter((key) => !placed.has(key))
        .join(', ') || 'none'
    }`,
  );
} finally {
  await rm(probe, { force: true });
}
