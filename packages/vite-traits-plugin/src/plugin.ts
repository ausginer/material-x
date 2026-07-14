import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import {
  analyzeModule,
  invalidateModule,
  parseModule,
  type ModuleLoader,
} from './analyze.ts';
import { BailoutError } from './diagnostics.ts';
import { annotatePureTraitCalls, augmentOrigin, lowerModule } from './lower.ts';
import {
  collectModuleSyntheticExports,
  resolveFactoryLocals,
} from './normalize.ts';

/** Only real TypeScript/JS source modules are candidates. */
const CANDIDATE = /\.[cm]?[jt]sx?$/u;

/**
 * Builds the trait flattener plugin adapter.
 *
 * It runs `enforce: 'pre'` so it sees authored source before other transforms.
 * Each `impl` site is analyzed and lowered transactionally; a failed proof
 * warns and leaves the site unchanged.
 */
export function viteTraitsPlugin(): Plugin {
  const plugin: Plugin = {
    name: 'trait-flattener',
    watchChange(id) {
      invalidateModule(id);
    },
    async transform(code, id) {
      const cleanId = id.split('?', 1)[0]!;
      if (
        !CANDIDATE.test(cleanId) ||
        cleanId.includes('/node_modules/.vite/') ||
        (!code.includes('impl(') && !code.includes('trait('))
      ) {
        return null;
      }

      const loader: ModuleLoader = {
        resolve: async (specifier, importer) => {
          const resolved = await this.resolve(specifier, importer, {
            skipSelf: true,
          });
          if (resolved && !resolved.external) {
            const onDisk = resolved.id.split('?', 1)[0]!;
            if (onDisk.startsWith('/')) {
              return onDisk;
            }
          }
          // A workspace package (`@ydinjs/*`) is external to a consumer build,
          // so the bundler hands back a bare/external id with nothing to read.
          // Its built trait modules are still on disk, though, so resolve them
          // through Node — this is what lets cross-package compositions flatten.
          if (specifier.startsWith('@ydinjs/')) {
            try {
              return fileURLToPath(import.meta.resolve(specifier));
            } catch {
              return null;
            }
          }
          return null;
        },
        load: (moduleId) => readFile(moduleId, 'utf8'),
      };

      const program = parseModule(cleanId, code);
      const factoryLocals = resolveFactoryLocals(program);

      // Consumer responsibility: flatten eligible compositions. A flattened
      // module still gets its `trait(...)` calls marked pure so the now-unused
      // intermediary scaffolding can be tree-shaken downstream.
      if (code.includes('impl(')) {
        try {
          const { compositions, dependencies } = await analyzeModule(
            cleanId,
            code,
            loader,
          );
          for (const dependency of dependencies) {
            this.addWatchFile(dependency);
          }

          if (compositions.length > 0) {
            // Return the native MagicString as `code`; the bundler derives the
            // sourcemap from it natively.
            const magic = lowerModule(code, compositions);
            annotatePureTraitCalls(magic, program, factoryLocals);
            return { code: magic };
          }
        } catch (error) {
          if (error instanceof BailoutError) {
            this.warn({
              message: `trait-flattener: retained runtime composition${
                error.composition ? ` for ${error.composition}` : ''
              } (${error.reason}): ${error.message}`,
              id: cleanId,
            });
          } else {
            throw error;
          }
        }
      }

      // Origin responsibility: expose private brand/converter bindings so a
      // flattened consumer in another module can link them, and mark descriptor
      // `trait(...)` calls pure.
      const synthetics = collectModuleSyntheticExports(
        program,
        cleanId,
        factoryLocals,
      );
      const augmented = augmentOrigin(code, synthetics, program, factoryLocals);

      return augmented ? { code: augmented } : null;
    },
  };

  plugin.enforce = 'pre';

  return plugin;
}
