import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { compileCSS } from './css.ts';
import type { JSModule } from './utils.ts';

export function constructCss(): Plugin {
  const css = new Set<string>();

  return {
    name: 'vite-construct-css',
    resolveId: {
      order: 'pre',
      handler(source, importer) {
        if (importer && source.startsWith('.')) {
          const url = new URL(source, pathToFileURL(importer));

          if (url.searchParams.get('type') === 'css') {
            console.log(url.toString());
            const id = fileURLToPath(url);
            css.add(id);
            return id;
          }
        }

        return null;
      },
    },
    load: {
      order: 'post',
      async handler(id) {
        if (css.has(id)) {
          const content: JSModule<string> = await import(id);
          const { code, map } = await compileCSS(
            pathToFileURL(id),
            content.default,
          );

          return {
            code: `${code}\n//# sourceMappingURL=${map?.toUrl() ?? ''}`,
          };
        }

        return null;
      },
    },
  };
}
