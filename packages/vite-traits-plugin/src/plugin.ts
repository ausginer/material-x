import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';
import {
  analyzeModule,
  invalidateModule,
  parseModule,
  type ModuleLoader,
} from './analyze.ts';
import { BailoutError } from './diagnostics.ts';
import { appendSyntheticExports, lowerModule } from './lower.ts';
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
          const id = resolved?.id.split('?', 1)[0];
          // External modules (e.g. the `@ydinjs/core` package when building a
          // consumer) have no readable on-disk id here; treat as unresolvable
          // so the site bails gracefully rather than crashing the build.
          if (!id || resolved?.external || !id.startsWith('/')) {
            return null;
          }
          return id;
        },
        load: (moduleId) => readFile(moduleId, 'utf8'),
      };

      // Consumer responsibility: flatten eligible compositions.
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
            return { code: lowerModule(code, compositions) };
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
      // flattened consumer in another module can link them.
      const program = parseModule(cleanId, code);
      const factoryLocals = await resolveFactoryLocals(program, (specifier) =>
        loader.resolve(specifier, cleanId),
      );
      const synthetics = collectModuleSyntheticExports(
        program,
        cleanId,
        factoryLocals,
      );

      const augmented = appendSyntheticExports(code, synthetics);

      return augmented ? { code: augmented } : null;
    },
  };

  plugin.enforce = 'pre';

  return plugin;
}
