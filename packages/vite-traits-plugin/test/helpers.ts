import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ModuleLoader } from '../src/analyze.ts';

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
