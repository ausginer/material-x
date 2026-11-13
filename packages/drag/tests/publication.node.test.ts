/**
 * `drag:DRD-56`: the publication that the run's one build produced, every file
 * that `package.json`'s `files` selects, against the committed map of property
 * names.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allMappings, fromMap } from '@jridgewell/gen-mapping';
import { parseSync, Visitor } from 'rolldown/utils';
import { beforeAll, describe, expect, it } from 'vitest';
import { isPrefixed, readNames } from '../build/property-names.ts';
import manifest from '../package.json' with { type: 'json' };

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

const IDENTIFIER_NAME = /^[A-Za-z$][\w$]*$/u;

/** Class member modifiers that a class field's mapping may start at. */
const MODIFIERS =
  '(?:(?:readonly|declare|static|public|private|protected|override|accessor|abstract)\\s+)*';

async function filesUnder(path: string): Promise<string[]> {
  if (!(await stat(join(ROOT, path))).isDirectory()) {
    return [path];
  }

  const entries = await readdir(join(ROOT, path), {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)));
}

/** Each existing file's text, by path. A missing file has no entry. */
async function readAll(paths: readonly string[]): Promise<Map<string, string>> {
  const texts = await Promise.all(
    [...new Set(paths)].map(
      async (path) =>
        await readFile(path, 'utf8').then(
          (text) => [[path, text] as const],
          () => [],
        ),
    ),
  );

  return new Map(texts.flat());
}

/** Line and column, zero-based, of each offset in `code`. */
function positionOf(code: string, offset: number): [number, number] {
  const head = code.slice(0, offset);
  const line = head.split('\n').length - 1;

  return [line, offset - (head.lastIndexOf('\n') + 1)];
}

/** A map file as `fromMap` reads it. */
type SourceMap = Extract<Parameters<typeof fromMap>[0], { mappings: string }>;

/** One occurrence of an output name as a property in an emitted module. */
type Occurrence = Readonly<{
  file: string;
  line: number;
  column: number;
  name: string;
  /** `src` text from the mapped position, or `null` with no mapping there. */
  mapped: Readonly<{ at: string; text: string }> | null;
}>;

describe('drag:DRD-56 the published property names', () => {
  const names: Record<string, string> = {};
  const output = new Map<string, string>();
  const modules = new Map<string, string>();
  const declarations = new Map<string, string>();
  const occurrences: Occurrence[] = [];

  beforeAll(async () => {
    Object.assign(
      names,
      JSON.parse(
        await readFile(join(ROOT, 'build/property-names.json'), 'utf8'),
      ) as Record<string, string>,
    );

    for (const [key, name] of Object.entries(names)) {
      output.set(name, key);
    }

    const files = (
      await Promise.all(
        manifest.files.map(async (path) => await filesUnder(path)),
      )
    ).flat();

    const texts = await readAll(files.map((file) => join(ROOT, file)));

    for (const file of files.toSorted()) {
      if (file.endsWith('.d.ts')) {
        declarations.set(file, texts.get(join(ROOT, file))!);
      } else if (file.endsWith('.js')) {
        modules.set(file, texts.get(join(ROOT, file))!);
      }
    }

    // A module without a map has no mappings, so any output name in it fails V4.
    const maps = new Map(
      [...modules.keys()].flatMap((file) => {
        const text = texts.get(join(ROOT, `${file}.map`));

        return text === undefined
          ? []
          : [[file, JSON.parse(text) as SourceMap] as const];
      }),
    );
    const sourceOf = (file: string, source: string): string =>
      resolve(dirname(join(ROOT, file)), source);
    const sources = await readAll(
      [...maps].flatMap(([file, map]) =>
        map.sources.flatMap((source) =>
          source === null ? [] : [sourceOf(file, source)],
        ),
      ),
    );

    for (const [file, code] of modules) {
      const map = maps.get(file);
      const mappings = new Map(
        (map ? allMappings(fromMap(map)) : []).map((mapping) => [
          `${mapping.generated.line - 1}:${mapping.generated.column}`,
          mapping,
        ]),
      );

      for (const { name, start } of readNames(file, code).properties) {
        if (!output.has(name)) {
          continue;
        }

        const [line, column] = positionOf(code, start);
        const mapping = mappings.get(`${line}:${column}`);
        let mapped: Occurrence['mapped'] = null;

        if (mapping?.source) {
          const source = sourceOf(file, mapping.source);
          const text = sources.get(source)?.split('\n')[
            mapping.original.line - 1
          ];

          mapped = {
            at: `${relative(ROOT, source)}:${mapping.original.line}:${mapping.original.column + 1}`,
            text: text?.slice(mapping.original.column) ?? '',
          };
        }

        occurrences.push({
          file,
          line: line + 1,
          column: column + 1,
          name,
          mapped,
        });
      }
    }
  });

  /** Whether `text` starts with the declaration or use of `name`. */
  const writes = (text: string, name: string): boolean =>
    new RegExp(
      `^${MODIFIERS}${name.replaceAll('$', '\\$')}(?![\\w$])`,
      'u',
    ).test(text);

  it('should map exactly the prefixed property names in src', async () => {
    const inSource = new Set<string>();
    const entries = await readdir(join(ROOT, 'src'), {
      recursive: true,
      withFileTypes: true,
    });
    const texts = await readAll(
      entries
        .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
        .map((entry) => join(entry.parentPath, entry.name)),
    );

    for (const [file, code] of texts) {
      for (const { name } of readNames(file, code).properties) {
        if (isPrefixed(name)) {
          inSource.add(name);
        }
      }
    }

    const keys = new Set(Object.keys(names));

    expect({
      missing: [...inSource].filter((name) => !keys.has(name)).sort(),
      extra: [...keys].filter((name) => !inSource.has(name)).sort(),
    }).toEqual({ missing: [], extra: [] });
  });

  it('should leave no prefixed property name or string in an emitted module (V1)', () => {
    const found: string[] = [];

    for (const [file, code] of modules) {
      const { properties, strings } = readNames(file, code);

      for (const { name } of properties) {
        if (isPrefixed(name)) {
          found.push(`${file}: property ${name}`);
        }
      }

      for (const { text } of strings) {
        if (isPrefixed(text)) {
          found.push(`${file}: string ${JSON.stringify(text)}`);
        }
      }
    }

    expect(found).toEqual([]);
  });

  it('should declare no prefixed identifier (V2)', () => {
    const found: string[] = [];

    for (const [file, code] of declarations) {
      new Visitor({
        Identifier(node) {
          if (isPrefixed(node.name)) {
            found.push(`${file}: ${node.name}`);
          }
        },
      }).visit(parseSync(file, code, { lang: 'dts' }).program);
    }

    expect(found).toEqual([]);
  });

  it('should give distinct, unprefixed output names that no remaining property uses (V3)', () => {
    const found: string[] = [];
    const seen = new Map<string, string>();

    for (const [key, name] of Object.entries(names)) {
      if (seen.has(name)) {
        found.push(`${seen.get(name)!} and ${key} share ${name}`);
      }

      seen.set(name, key);

      if (
        !IDENTIFIER_NAME.test(name) ||
        name.startsWith('_') ||
        RESERVED.has(name)
      ) {
        found.push(
          `${key}: ${name} is not an unprefixed, unreserved identifier`,
        );
      }
    }

    // An output name whose own text is written at its `src` position is a
    // property that stays under that name, beside the renamed one.
    for (const { file, line, column, name, mapped } of occurrences) {
      if (mapped && writes(mapped.text, name)) {
        found.push(
          `${output.get(name)!}: ${name} stays as a property at ${file}:${line}:${column}, from ${mapped.at}`,
        );
      }
    }

    expect(found).toEqual([]);
  });

  it('should map each renamed property to its prefixed name in src (V4)', () => {
    const found: string[] = [];

    for (const { file, line, column, name, mapped } of occurrences) {
      const key = output.get(name)!;

      if (!mapped) {
        found.push(`${file}:${line}:${column} ${key}: no mapping`);
      } else if (!writes(mapped.text, key) && !writes(mapped.text, name)) {
        found.push(
          `${file}:${line}:${column} ${key}: maps to ${mapped.at}, ${JSON.stringify(mapped.text.slice(0, 24))}`,
        );
      }
    }

    expect(found).toEqual([]);
  });
});
