import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lowerAttributes } from '../src/attributes/lower.ts';
import { transformTraitModule } from '../src/composition/trait-module.ts';
import {
  flattenModule,
  lowerForAnalysis,
  type BuildKind,
} from '../src/plugin.ts';
import {
  parseModule,
  removeImports,
  type ImportRemovals,
  type ModuleLoader,
} from '../src/syntax.ts';

/** The fixtures' directory. */
export const FIXTURES: URL = new URL('./fixtures/', import.meta.url);

/** A fixture's absolute id. */
export function fixtureId(name: string): string {
  return fileURLToPath(new URL(name, FIXTURES));
}

/** Scope of the fixture packages under `fixtures/packages/`. */
const FIXTURE_SCOPE = '@fixture/';

/**
 * A {@link ModuleLoader} as the plugin's: relative specifiers resolve against
 * the importer, `@fixture/<name>/<path>` to `fixtures/packages/<name>/<path>`,
 * and other bare specifiers through Node. Modules in `files` are read from it
 * by id, and every module is read with layer (b) lowered.
 */
export function loader(
  files: Readonly<Record<string, string>> = {},
): ModuleLoader {
  return {
    resolve: (specifier, importer) => {
      if (specifier.startsWith('.')) {
        return Promise.resolve(
          fileURLToPath(new URL(specifier, pathToFileURL(importer))),
        );
      }
      if (specifier.startsWith(FIXTURE_SCOPE)) {
        return Promise.resolve(
          fixtureId(`packages/${specifier.slice(FIXTURE_SCOPE.length)}`),
        );
      }
      try {
        return Promise.resolve(
          fileURLToPath(
            import.meta.resolve(specifier, pathToFileURL(importer)),
          ),
        );
      } catch {
        return Promise.resolve(null);
      }
    },
    load: async (id) =>
      lowerForAnalysis(id, files[id] ?? (await readFile(id, 'utf8'))),
  };
}

/** One module after both plugin steps. */
export type Transformed = Readonly<{
  code: string;
  warnings: readonly string[];
}>;

/**
 * Runs the plugin's two steps on a module: layer (b), then the trait module's
 * transform and the flattening.
 *
 * @param id - The module's id; with `files`, it may name a module that only
 *   `files` holds.
 */
export async function transform(
  id: string,
  options: Readonly<{
    files?: Readonly<Record<string, string>>;
    kind?: BuildKind;
  }> = {},
): Promise<Transformed> {
  const files = options.files ?? {};
  const source = files[id] ?? (await readFile(id, 'utf8'));
  const lowered =
    lowerAttributes(source, parseModule(id, source))?.toString() ?? source;
  const result = await flattenModule(
    lowered,
    id,
    options.kind ?? 'library',
    loader(files),
  );

  return {
    code: result.magic?.toString() ?? lowered,
    warnings: result.warnings.map(({ message }) => message),
  };
}

/** The trait module transform alone, on a module that layer (b) lowered. */
export function transformTrait(
  id: string,
  code: string,
  applicationBuild = false,
): string {
  const lowered =
    lowerAttributes(code, parseModule(id, code))?.toString() ?? code;
  const removals: ImportRemovals = new Map();
  const magic = transformTraitModule(
    lowered,
    parseModule(id, lowered),
    applicationBuild,
    removals,
  );
  if (!magic) {
    return lowered;
  }
  removeImports(magic, lowered, removals);

  return magic.toString();
}

/** A transformed set of fixtures on disk, importable, then disposed. */
export type Materialized = Readonly<{
  /**
   * The file URL of a module that no other module imports. A module that one
   * imports is reached through {@link entryUrl}, never by its own file URL
   * (`repo:RF-60`).
   */
  url(file: string): string;
  /**
   * The file URL of a generated module that re-exports every listed module by
   * the relative specifier the others import it through.
   */
  entryUrl: string;
  /** Each module's generated text, by name. */
  code: Readonly<Record<string, string>>;
  dispose(): Promise<void>;
}>;

/**
 * Writes each fixture in `transformed` after both plugin steps, and each in
 * `verbatim` as it is, into a fresh directory inside the package, so that the
 * `@ydinjs/core` imports still resolve through the workspace. `packages` are
 * installed as `node_modules/@fixture/<name>`.
 *
 * Vite's module runner can evaluate a file twice when it is requested under
 * two URL strings at once, as a file URL and a relative import are, and a
 * trait module's second evaluation creates a second brand (`repo:RF-60`). So a
 * test imports by file URL only modules that nothing imports, and reaches the
 * others through {@link Materialized.entryUrl}.
 */
export async function materialize(
  options: Readonly<{
    transformed: readonly string[];
    verbatim?: readonly string[];
    packages?: readonly string[];
    /** Listed in the entry module. */
    exported: readonly string[];
  }>,
): Promise<Materialized> {
  const dir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-'));
  const code: Record<string, string> = {};

  await Promise.all([
    ...options.transformed.map(async (name) => {
      code[name] = (await transform(fixtureId(name))).code;
      await writeFile(join(dir, name), code[name]);
    }),
    ...(options.verbatim ?? []).map(async (name) => {
      await writeFile(join(dir, name), await readFile(fixtureId(name), 'utf8'));
    }),
    ...(options.packages ?? []).map(async (name) => {
      const target = join(dir, 'node_modules', '@fixture', name);
      await mkdir(dirname(target), { recursive: true });
      await cp(fixtureId(`packages/${name}`), target, { recursive: true });
    }),
    writeFile(
      join(dir, 'entry.ts'),
      options.exported.map((name) => `export * from './${name}';\n`).join(''),
    ),
  ]);

  return {
    url: (file) => pathToFileURL(join(dir, file)).href,
    entryUrl: pathToFileURL(join(dir, 'entry.ts')).href,
    code,
    dispose: () => rm(dir, { recursive: true, force: true }),
  };
}
