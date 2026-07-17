import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  analyzeModule,
  parseModule,
  type ModuleLoader,
} from '../src/analyze.ts';
import { appendSyntheticExports, lowerModule } from '../src/lower.ts';
import {
  collectModuleSyntheticExports,
  resolveFactoryLocals,
} from '../src/normalize.ts';

/** Absolute directory URL of the descriptor fixtures. */
export const FIXTURES: URL = new URL('./fixtures/', import.meta.url);

/** Resolves a fixture file name to its absolute on-disk id. */
export function fixtureId(name: string): string {
  return fileURLToPath(new URL(name, FIXTURES));
}

/** Reads the source text of a fixture module. */
export function readFixture(name: string): Promise<string> {
  return readFile(fixtureId(name), 'utf8');
}

/**
 * A {@link ModuleLoader} backed by Node resolution: relative specifiers resolve
 * against the importer, bare specifiers through `import.meta.resolve`, mirroring
 * what the Vite plugin gets from the bundler.
 */
export const nodeLoader: ModuleLoader = {
  resolve: (specifier, importer) => {
    if (specifier.startsWith('.')) {
      return Promise.resolve(
        fileURLToPath(new URL(specifier, pathToFileURL(importer))),
      );
    }
    try {
      return Promise.resolve(
        fileURLToPath(import.meta.resolve(specifier, pathToFileURL(importer))),
      );
    } catch {
      return Promise.resolve(null);
    }
  },
  load: (id) => readFile(id, 'utf8'),
};

/** A materialized flattening: both forms on disk, importable, then disposed. */
export type Flattening = Readonly<{
  /** Absolute file URL for a generated module (e.g. `foo-flat.ts`). */
  url(file: string): string;
  /** Removes the generated directory. */
  dispose(): Promise<void>;
}>;

/**
 * Flattens `consumerName` and materializes the runtime-composed form
 * (`foo-composed.ts`), the flattened form (`foo-flat.ts`), the `augment`ed trait
 * modules (with their build-only synthetic exports), and the `passthrough`
 * modules verbatim, into a fresh dir INSIDE the package tree — so the emitted
 * `@ydinjs/core` imports still resolve through the workspace node_modules.
 *
 * Synthetic export names are hashed from each module's ORIGINAL fixture id, and
 * the flattened consumer keeps the original relative specifiers, so the two
 * agree without any id rewriting.
 */
export async function flattenToDir(
  consumerName: string,
  options: Readonly<{
    augment: readonly string[];
    passthrough: readonly string[];
  }>,
): Promise<Flattening> {
  const genDir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-'));
  const consumerId = fixtureId(consumerName);
  const consumerCode = await readFixture(consumerName);
  const { compositions } = await analyzeModule(
    consumerId,
    consumerCode,
    nodeLoader,
  );
  const flat = lowerModule(consumerCode, compositions).toString();

  const augment = async (name: string): Promise<void> => {
    const id = fixtureId(name);
    const code = await readFixture(name);
    const program = parseModule(id, code);
    const synthetics = collectModuleSyntheticExports(
      program,
      id,
      resolveFactoryLocals(program),
    );
    const emitted =
      appendSyntheticExports(code, synthetics)?.toString() ?? code;
    await writeFile(join(genDir, name), emitted);
  };

  await Promise.all([
    ...options.passthrough.map(
      async (name) =>
        await writeFile(join(genDir, name), await readFixture(name)),
    ),
    ...options.augment.map(augment),
    writeFile(join(genDir, 'foo-flat.ts'), flat),
    writeFile(join(genDir, 'foo-composed.ts'), consumerCode),
  ]);

  return {
    url: (file) => pathToFileURL(join(genDir, file)).href,
    dispose: () => rm(genDir, { recursive: true, force: true }),
  };
}
